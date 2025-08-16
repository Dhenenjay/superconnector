import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Store a conversation message (from WhatsApp or VAPI)
export const storeMessage = mutation({
  args: {
    phoneNumber: v.string(),
    channel: v.union(v.literal("whatsapp"), v.literal("vapi_call")),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    content: v.string(),
    role: v.optional(v.union(v.literal("user"), v.literal("assistant"), v.literal("system"))),
    metadata: v.optional(v.any()),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = args.timestamp || Date.now();
    
    // Find or create identity
    let identity = await ctx.db
      .query("identities")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (!identity) {
      const identityId = await ctx.db.insert("identities", {
        phoneNumber: args.phoneNumber,
        createdAt: now,
        updatedAt: now,
      });
      identity = await ctx.db.get(identityId);
    }
    
    if (!identity) {
      throw new Error("Failed to create or get identity");
    }
    
    // Store the message
    const messageId = await ctx.db.insert("messages", {
      identityId: identity._id,
      channel: args.channel === "vapi_call" ? "phone" : "whatsapp",
      direction: args.direction,
      content: args.content,
      metadata: {
        ...args.metadata,
        role: args.role,
        source: args.channel,
      },
      createdAt: now,
    });
    
    // Update identity's last interaction
    await ctx.db.patch(identity._id, {
      updatedAt: now,
    });
    
    // Update or create profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_identity", (q) => q.eq("identityId", identity._id))
      .first();
    
    if (profile) {
      await ctx.db.patch(profile._id, {
        updatedAt: now,
      });
    }
    
    return { messageId, identityId: identity._id };
  },
});

// Get conversation history for a phone number
export const getConversationHistory = query({
  args: {
    phoneNumber: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // Find identity
    const identity = await ctx.db
      .query("identities")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (!identity) {
      return {
        messages: [],
        profile: null,
        hasConversationHistory: false,
      };
    }
    
    // Get messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_identity", (q) => q.eq("identityId", identity._id))
      .order("desc")
      .take(limit);
    
    // Get profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_identity", (q) => q.eq("identityId", identity._id))
      .first();
    
    // Get recent calls
    const calls = await ctx.db
      .query("calls")
      .filter((q) => q.eq(q.field("toNumber"), args.phoneNumber))
      .order("desc")
      .take(5);
    
    // Format conversation history
    const formattedMessages = messages.reverse().map(msg => ({
      id: msg._id,
      channel: msg.channel,
      direction: msg.direction,
      content: msg.content,
      role: msg.metadata?.role || (msg.direction === "inbound" ? "user" : "assistant"),
      timestamp: msg.createdAt,
      source: msg.metadata?.source,
    }));
    
    // Add call summaries to the conversation
    for (const call of calls) {
      if (call.summary) {
        formattedMessages.push({
          id: call._id,
          channel: "phone",
          direction: "outbound",
          content: `[Call Summary] ${call.summary}`,
          role: "system",
          timestamp: call.endedAt || call.createdAt,
          source: "vapi_call",
        });
      }
    }
    
    // Sort by timestamp
    formattedMessages.sort((a, b) => a.timestamp - b.timestamp);
    
    return {
      messages: formattedMessages,
      profile: profile ? {
        name: profile.name,
        email: profile.email,
        company: profile.company,
        role: profile.role,
        goals: profile.goals,
        challenges: profile.challenges,
        desiredConnections: profile.desiredConnections,
      } : null,
      hasConversationHistory: formattedMessages.length > 0,
    };
  },
});

// Store call summary and transcript
export const storeCallData = mutation({
  args: {
    vapiCallId: v.string(),
    phoneNumber: v.string(),
    transcript: v.string(),
    summary: v.string(),
    duration: v.number(),
    messages: v.optional(v.array(v.object({
      role: v.string(),
      content: v.string(),
      timestamp: v.optional(v.number()),
    }))),
    analysis: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find or create identity
    let identity = await ctx.db
      .query("identities")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (!identity) {
      const identityId = await ctx.db.insert("identities", {
        phoneNumber: args.phoneNumber,
        createdAt: now,
        updatedAt: now,
      });
      identity = await ctx.db.get(identityId);
    }
    
    if (!identity) {
      throw new Error("Failed to create or get identity");
    }
    
    // Store call summary as a message
    await ctx.db.insert("messages", {
      identityId: identity._id,
      channel: "phone",
      direction: "outbound",
      content: `[Call ${Math.round(args.duration / 60)} min] ${args.summary}`,
      metadata: {
        vapiCallId: args.vapiCallId,
        type: "call_summary",
        duration: args.duration,
        transcript: args.transcript,
        analysis: args.analysis,
      },
      createdAt: now,
    });
    
    // Store individual messages if provided
    if (args.messages) {
      for (const msg of args.messages) {
        await ctx.db.insert("messages", {
          identityId: identity._id,
          channel: "phone",
          direction: msg.role === "user" ? "inbound" : "outbound",
          content: msg.content,
          metadata: {
            role: msg.role,
            vapiCallId: args.vapiCallId,
            source: "vapi_call",
          },
          createdAt: msg.timestamp || now,
        });
      }
    }
    
    // Update or create profile with call data
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_identity", (q) => q.eq("identityId", identity._id))
      .first();
    
    if (!profile) {
      // Create profile if it doesn't exist
      const profileId = await ctx.db.insert("profiles", {
        identityId: identity._id,
        name: "User",
        phoneNumber: args.phoneNumber,
        lastCallAt: now,
        lastCallSummary: args.summary,
        createdAt: now,
        updatedAt: now,
      });
      profile = await ctx.db.get(profileId);
    } else {
      // Update existing profile
      await ctx.db.patch(profile._id, {
        lastCallAt: now,
        lastCallSummary: args.summary,
        updatedAt: now,
      });
    }
    
    // Store in calls table for backward compatibility
    const existingCall = await ctx.db
      .query("calls")
      .withIndex("by_vapi_id", (q) => q.eq("vapiCallId", args.vapiCallId))
      .first();
    
    if (existingCall) {
      await ctx.db.patch(existingCall._id, {
        transcript: args.transcript,
        summary: args.summary,
        duration: args.duration,
        endedAt: now,
        status: "completed",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("calls", {
        vapiCallId: args.vapiCallId,
        toNumber: args.phoneNumber,
        userName: profile?.name || "User",
        topic: "Networking conversation",
        status: "completed",
        transcript: args.transcript,
        summary: args.summary,
        duration: args.duration,
        endedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    return { success: true, identityId: identity._id };
  },
});

// Get last interaction summary for context
export const getLastInteractionSummary = query({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Find identity first
    const identity = await ctx.db
      .query("identities")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (!identity) {
      return {
        hasHistory: false,
        summary: null,
        lastInteractionTime: null,
      };
    }
    
    // Get profile to check for lastCallSummary
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_identity", (q) => q.eq("identityId", identity._id))
      .first();
    
    // Get conversation history
    const history = await getConversationHistory(ctx, {
      phoneNumber: args.phoneNumber,
      limit: 10,
    });
    
    if (!history.hasConversationHistory && !profile?.lastCallSummary) {
      return {
        hasHistory: false,
        summary: null,
        lastInteractionTime: null,
      };
    }
    
    // Find the most recent call summary from messages or use profile's lastCallSummary
    const lastCallSummary = history.messages
      .filter(msg => msg.source === "vapi_call" && msg.content.includes("[Call"))
      .pop();
    
    const lastMessages = history.messages.slice(-5);
    
    // Use profile's lastCallSummary if no recent call summary in messages
    const summary = lastCallSummary?.content || 
                   (profile?.lastCallSummary ? `From our last call: ${profile.lastCallSummary}` : null);
    
    return {
      hasHistory: true,
      summary: summary,
      lastInteractionTime: profile?.lastCallAt || history.messages[history.messages.length - 1]?.timestamp,
      recentContext: lastMessages.map(msg => ({
        role: msg.role,
        content: msg.content.substring(0, 100),
      })),
      profile: history.profile,
    };
  },
});

// Clear all data for a phone number (for testing)
export const clearUserData = mutation({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Find identity
    const identity = await ctx.db
      .query("identities")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (!identity) {
      return { cleared: false, message: "No data found for this phone number" };
    }
    
    // Delete all messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_identity", (q) => q.eq("identityId", identity._id))
      .collect();
    
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    
    // Delete profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_identity", (q) => q.eq("identityId", identity._id))
      .first();
    
    if (profile) {
      await ctx.db.delete(profile._id);
    }
    
    // Delete calls
    const calls = await ctx.db
      .query("calls")
      .filter((q) => q.eq(q.field("toNumber"), args.phoneNumber))
      .collect();
    
    for (const call of calls) {
      await ctx.db.delete(call._id);
    }
    
    // Delete identity
    await ctx.db.delete(identity._id);
    
    return { 
      cleared: true, 
      message: `Cleared all data for ${args.phoneNumber}`,
      deletedItems: {
        messages: messages.length,
        calls: calls.length,
        profile: profile ? 1 : 0,
        identity: 1,
      }
    };
  },
});
