import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    phoneNumber: v.optional(v.string()),
    whatsappId: v.optional(v.string()),
    email: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { phoneNumber, whatsappId, email, linkedinUrl } = args;

    // Try to find existing identity
    let identity = null;

    if (phoneNumber) {
      const byPhone = await ctx.db
        .query("identities")
        .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
        .first();
      if (byPhone) identity = byPhone;
    }

    if (!identity && whatsappId) {
      const byWhatsapp = await ctx.db
        .query("identities")
        .withIndex("by_whatsapp", (q) => q.eq("whatsappId", whatsappId))
        .first();
      if (byWhatsapp) identity = byWhatsapp;
    }

    if (!identity && email) {
      const byEmail = await ctx.db
        .query("identities")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (byEmail) identity = byEmail;
    }

    if (!identity && linkedinUrl) {
      const byLinkedin = await ctx.db
        .query("identities")
        .withIndex("by_linkedin", (q) => q.eq("linkedinUrl", linkedinUrl))
        .first();
      if (byLinkedin) identity = byLinkedin;
    }

    const now = Date.now();

    if (identity) {
      // Update existing identity with new identifiers
      const updates: any = { updatedAt: now };
      if (phoneNumber && !identity.phoneNumber) updates.phoneNumber = phoneNumber;
      if (whatsappId && !identity.whatsappId) updates.whatsappId = whatsappId;
      if (email && !identity.email) updates.email = email;
      if (linkedinUrl && !identity.linkedinUrl) updates.linkedinUrl = linkedinUrl;

      await ctx.db.patch(identity._id, updates);
      return identity._id;
    } else {
      // Create new identity
      const identityId = await ctx.db.insert("identities", {
        phoneNumber,
        whatsappId,
        email,
        linkedinUrl,
        createdAt: now,
        updatedAt: now,
      });
      return identityId;
    }
  },
});

export const getById = query({
  args: { id: v.id("identities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const findByIdentifier = query({
  args: {
    phoneNumber: v.optional(v.string()),
    whatsappId: v.optional(v.string()),
    email: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { phoneNumber, whatsappId, email, linkedinUrl } = args;

    if (phoneNumber) {
      const identity = await ctx.db
        .query("identities")
        .withIndex("by_phone", (q) => q.eq("phoneNumber", phoneNumber))
        .first();
      if (identity) return identity;
    }

    if (whatsappId) {
      const identity = await ctx.db
        .query("identities")
        .withIndex("by_whatsapp", (q) => q.eq("whatsappId", whatsappId))
        .first();
      if (identity) return identity;
    }

    if (email) {
      const identity = await ctx.db
        .query("identities")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (identity) return identity;
    }

    if (linkedinUrl) {
      const identity = await ctx.db
        .query("identities")
        .withIndex("by_linkedin", (q) => q.eq("linkedinUrl", linkedinUrl))
        .first();
      if (identity) return identity;
    }

    return null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("identities")
      .collect();
  },
});
