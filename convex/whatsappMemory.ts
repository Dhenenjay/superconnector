import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Simple store function for WhatsApp messages
export const store = mutation({
  args: {
    profileId: v.id("profiles"),
    channel: v.string(),
    message: v.string(),
    fromUser: v.boolean(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the profile to find the identityId
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }
    
    // Store the message
    const messageId = await ctx.db.insert("messages", {
      identityId: profile.identityId,
      channel: args.channel as "whatsapp",
      direction: args.fromUser ? "inbound" : "outbound",
      content: args.message,
      metadata: { fromUser: args.fromUser, timestamp: args.timestamp },
      createdAt: Date.now(),
    });
    
    return messageId;
  },
});

// Get conversation history for a profile
export const getConversation = query({
  args: {
    profileId: v.id("profiles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    // Get the profile to find the identityId
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      return [];
    }
    
    // Get recent messages for this identity
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_identity", (q) => q.eq("identityId", profile.identityId))
      .order("desc")
      .take(limit);
    
    // Return in chronological order
    return messages.reverse();
  },
});
