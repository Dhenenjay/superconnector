import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Store Vapi call events and sync with WhatsApp conversation
export const syncCallEvent = mutation({
  args: {
    phoneNumber: v.string(),
    eventType: v.string(), // 'call-started', 'transcript', 'call-ended', 'function-call', etc.
    vapiCallId: v.string(),
    message: v.optional(v.string()),
    transcript: v.optional(v.string()),
    assistantMessage: v.optional(v.string()),
    userMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Find profile by phone number
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (!profile) {
      console.error(`No profile found for phone: ${args.phoneNumber}`);
      return null;
    }

    // Store the conversation piece in unified memory
    const messageContent = args.userMessage || args.assistantMessage || args.message || "";
    
    if (messageContent) {
      // Store as a message in the same table as WhatsApp messages
      await ctx.db.insert("messages", {
        identityId: profile.identityId,
        channel: "phone" as const, // Using 'phone' for Vapi calls
        direction: args.userMessage ? "inbound" : "outbound",
        content: messageContent,
        metadata: {
          vapiCallId: args.vapiCallId,
          eventType: args.eventType,
          source: "vapi",
          ...args.metadata,
        },
        createdAt: args.timestamp,
      });
    }

    // Update call record
    const call = await ctx.db
      .query("calls")
      .withIndex("by_vapi_id", (q) => q.eq("vapiCallId", args.vapiCallId))
      .first();
    
    if (call) {
      // Update existing call with latest info
      if (args.eventType === 'call-ended') {
        await ctx.db.patch(call._id, {
          status: 'completed',
          endedAt: args.timestamp,
          updatedAt: Date.now(),
        });
      } else if (args.transcript) {
        // Store running transcript
        await ctx.db.patch(call._id, {
          transcript: args.transcript,
          updatedAt: Date.now(),
        });
      }
    } else if (args.eventType === 'call-started') {
      // Create new call record
      await ctx.db.insert("calls", {
        vapiCallId: args.vapiCallId,
        toNumber: args.phoneNumber,
        userName: profile.name || "User",
        topic: "AI Superconnector Call",
        status: "in-progress",
        createdAt: args.timestamp,
        updatedAt: Date.now(),
      });
    }

    return { success: true, profileId: profile._id };
  },
});

// Get unified conversation history (both WhatsApp and Vapi)
export const getUnifiedConversation = query({
  args: {
    phoneNumber: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // Find profile by phone number
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (!profile) {
      return [];
    }
    
    // Get all messages (WhatsApp and Vapi)
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_identity", (q) => q.eq("identityId", profile.identityId))
      .order("desc")
      .take(limit);
    
    // Return in chronological order with channel info
    return messages.reverse().map(msg => ({
      ...msg,
      isVapiCall: msg.channel === 'phone',
      isWhatsApp: msg.channel === 'whatsapp',
    }));
  },
});

// Store full call summary when call ends
export const storeCallSummary = mutation({
  args: {
    vapiCallId: v.string(),
    phoneNumber: v.string(),
    transcript: v.string(),
    summary: v.optional(v.string()),
    duration: v.number(),
    messages: v.array(v.object({
      role: v.string(),
      content: v.string(),
      timestamp: v.optional(v.number()),
    })),
    extractedInfo: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Find profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .first();
    
    if (!profile) {
      throw new Error(`Profile not found for phone: ${args.phoneNumber}`);
    }

    // Update call record with full summary
    const call = await ctx.db
      .query("calls")
      .withIndex("by_vapi_id", (q) => q.eq("vapiCallId", args.vapiCallId))
      .first();
    
    if (call) {
      await ctx.db.patch(call._id, {
        status: 'completed',
        transcript: args.transcript,
        summary: args.summary,
        duration: args.duration,
        endedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Store a summary message in the conversation
    await ctx.db.insert("messages", {
      identityId: profile.identityId,
      channel: "phone" as const,
      direction: "outbound",
      content: `📞 Call Summary (${Math.round(args.duration / 60)} min): ${args.summary || 'Call completed'}`,
      metadata: {
        vapiCallId: args.vapiCallId,
        type: 'call-summary',
        source: 'vapi',
        duration: args.duration,
        extractedInfo: args.extractedInfo,
      },
      createdAt: Date.now(),
    });

    // Update profile with last call info
    await ctx.db.patch(profile._id, {
      lastCallSummary: args.summary || `Call completed (${Math.round(args.duration / 60)} minutes)`,
      lastCallAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, callId: call?._id };
  },
});
