import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Query profile by phone number (through identity)
export const getByPhone = query({
  args: { phone: v.string() },  // Changed from phoneNumber to phone
  handler: async (ctx, args) => {
    // First find the identity by phone
    const identity = await ctx.db
      .query("identities")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phone))
      .first();
    
    if (!identity) {
      return null;
    }
    
    // Then find the profile for this identity
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_identity", (q) => q.eq("identityId", identity._id))
      .first();
    
    return profile;
  },
});

// Create or update profile for a phone number
export const createOrUpdate = mutation({
  args: {
    phone: v.string(),  // Changed from phoneNumber to phone
    name: v.string(),
    email: v.optional(v.string()),
    preferredChannels: v.optional(v.array(v.union(
      v.literal("whatsapp"),
      v.literal("sms"),
      v.literal("email")
    ))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find or create identity
    let identity = await ctx.db
      .query("identities")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phone))
      .first();
    
    if (!identity) {
      // Create new identity
      const identityId = await ctx.db.insert("identities", {
        phoneNumber: args.phone,  // Changed from args.phoneNumber to args.phone
        email: args.email,
        createdAt: now,
        updatedAt: now,
      });
      identity = await ctx.db.get(identityId);
    } else if (args.email && !identity.email) {
      // Update identity with email if provided
      await ctx.db.patch(identity._id, {
        email: args.email,
        updatedAt: now,
      });
    }
    
    if (!identity) {
      throw new Error("Failed to create or get identity");
    }
    
    // Find or create profile
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_identity", (q) => q.eq("identityId", identity._id))
      .first();
    
    if (!profile) {
      // Create new profile
      const profileId = await ctx.db.insert("profiles", {
        identityId: identity._id,
        name: args.name,
        email: args.email,
        preferredChannels: args.preferredChannels || ["whatsapp"],
        createdAt: now,
        updatedAt: now,
      });
      profile = await ctx.db.get(profileId);
    } else {
      // Update existing profile
      const updates: any = { updatedAt: now };
      
      if (args.name && args.name !== "User" && profile.name === "User") {
        updates.name = args.name;
      }
      if (args.email && !profile.email) {
        updates.email = args.email;
      }
      if (args.preferredChannels) {
        updates.preferredChannels = args.preferredChannels;
      }
      
      if (Object.keys(updates).length > 1) {
        await ctx.db.patch(profile._id, updates);
        profile = await ctx.db.get(profile._id);
      }
    }
    
    return profile;
  },
});

// Update profile by ID (simplified for WhatsApp)
export const updateProfile = mutation({
  args: {
    profileId: v.id("profiles"),
    email: v.optional(v.string()),
    linkedIn: v.optional(v.string()),
    name: v.optional(v.string()),
    company: v.optional(v.string()),
    role: v.optional(v.string()),
    industry: v.optional(v.string()),
    goals: v.optional(v.array(v.string())),
    motivations: v.optional(v.array(v.string())),
    challenges: v.optional(v.array(v.string())),
    desiredConnections: v.optional(v.array(v.string())),
    personalityTraits: v.optional(v.any()),
    specificRequests: v.optional(v.array(v.string())),
    lastCallAt: v.optional(v.number()),
    lastCallSummary: v.optional(v.any()),
    callHistory: v.optional(v.array(v.object({
      callId: v.string(),
      timestamp: v.number(),
      duration: v.optional(v.number()),
      transcript: v.string(),
      summary: v.string(),
      analysis: v.any(),
    }))),
    callAnalysis: v.optional(v.object({
      profileData: v.optional(v.any()),
      nextSteps: v.optional(v.array(v.string())),
      insights: v.optional(v.any()),
      lastUpdated: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const { profileId, ...updates } = args;
    
    // Map linkedIn to linkedinUrl if provided
    if (updates.linkedIn) {
      (updates as any).linkedinUrl = updates.linkedIn;
      delete updates.linkedIn;
    }
    
    await ctx.db.patch(profileId, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(profileId);
  },
});
