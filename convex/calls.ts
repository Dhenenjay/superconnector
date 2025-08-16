import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new call record
export const create = mutation({
  args: {
    vapiCallId: v.string(),
    toNumber: v.string(),
    userName: v.string(),
    topic: v.string(),
    status: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("calls", {
      vapiCallId: args.vapiCallId,
      toNumber: args.toNumber,
      userName: args.userName,
      topic: args.topic,
      status: args.status,
      createdAt: args.createdAt,
      updatedAt: Date.now(),
    });
  },
});

// Update call status
export const updateStatus = mutation({
  args: {
    vapiCallId: v.string(),
    status: v.string(),
    duration: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db
      .query("calls")
      .withIndex("by_vapi_id", (q) => q.eq("vapiCallId", args.vapiCallId))
      .first();
    
    if (!call) {
      throw new Error("Call not found");
    }
    
    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };
    
    if (args.duration !== undefined) updates.duration = args.duration;
    if (args.endedAt !== undefined) updates.endedAt = args.endedAt;
    if (args.transcript !== undefined) updates.transcript = args.transcript;
    if (args.summary !== undefined) updates.summary = args.summary;
    
    await ctx.db.patch(call._id, updates);
    
    return call._id;
  },
});

// Get call by VAPI ID
export const getByVapiId = query({
  args: {
    vapiCallId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("calls")
      .withIndex("by_vapi_id", (q) => q.eq("vapiCallId", args.vapiCallId))
      .first();
  },
});

// Get recent calls
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db
      .query("calls")
      .order("desc")
      .take(limit);
  },
});

// List all calls
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("calls")
      .order("desc")
      .collect();
  },
});

// Patch/update a call by ID
export const patch = mutation({
  args: {
    callId: v.id("calls"),
    status: v.optional(v.string()),
    duration: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    transcript: v.optional(v.union(v.string(), v.null())),
    summary: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { callId, ...updates } = args;
    
    // Add updatedAt timestamp
    const patchData = {
      ...updates,
      updatedAt: Date.now(),
    };
    
    // Remove undefined fields
    Object.keys(patchData).forEach(key => {
      if (patchData[key] === undefined) {
        delete patchData[key];
      }
    });
    
    await ctx.db.patch(callId, patchData);
    return callId;
  },
});
