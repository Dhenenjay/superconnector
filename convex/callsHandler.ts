import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Store call summary from VAPI
export const storeCallSummary = mutation({
  args: {
    profileId: v.id("profiles"),
    callId: v.string(),
    transcript: v.string(),
    summary: v.string(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    // Store call data in the calls table
    const callRecord = await ctx.db.insert("calls", {
      vapiCallId: args.callId,
      toNumber: "unknown", // We don't have this from the current args
      userName: "unknown", // We don't have this from the current args
      topic: args.summary.substring(0, 100), // Use first 100 chars of summary as topic
      status: "completed",
      duration: args.duration,
      endedAt: Date.now(),
      createdAt: Date.now() - (args.duration * 1000), // Estimate start time
      updatedAt: Date.now(),
    });
    
    // Also update the profile's lastCallSummary
    await ctx.db.patch(args.profileId, {
      lastCallSummary: args.summary,
      lastCallAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return callRecord;
  },
});
