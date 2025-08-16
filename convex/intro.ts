import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const create = mutation({
  args: {
    fromProfileId: v.id("profiles"),
    toProfileId: v.id("profiles"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if intro already exists
    const existing = await ctx.db
      .query("intros")
      .withIndex("by_from", (q) => q.eq("fromProfileId", args.fromProfileId))
      .filter((q) => q.eq(q.field("toProfileId"), args.toProfileId))
      .first();

    if (existing) {
      return existing._id;
    }

    const introId = await ctx.db.insert("intros", {
      fromProfileId: args.fromProfileId,
      toProfileId: args.toProfileId,
      status: "pending_consent",
      reason: args.reason,
      createdAt: now,
      updatedAt: now,
    });

    return introId;
  },
});

export const updateStatus = mutation({
  args: {
    introId: v.id("intros"),
    status: v.union(
      v.literal("pending_consent"),
      v.literal("consent_sent"),
      v.literal("consented"),
      v.literal("declined"),
      v.literal("completed")
    ),
    consentRequestedAt: v.optional(v.number()),
    consentedAt: v.optional(v.number()),
    introSentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.consentRequestedAt !== undefined) {
      updates.consentRequestedAt = args.consentRequestedAt;
    }
    if (args.consentedAt !== undefined) {
      updates.consentedAt = args.consentedAt;
    }
    if (args.introSentAt !== undefined) {
      updates.introSentAt = args.introSentAt;
    }

    await ctx.db.patch(args.introId, updates);
  },
});

export const send = action({
  args: {
    introId: v.id("intros"),
  },
  handler: async (ctx, args) => {
    // Get intro details
    const intro = await ctx.runQuery(api.intro.getById, {
      id: args.introId,
    });

    if (!intro) {
      throw new Error("Intro not found");
    }

    if (intro.status !== "consented") {
      throw new Error("Cannot send intro without consent");
    }

    // Get both profiles
    const fromProfile = await ctx.runQuery(api.profile.getById, {
      id: intro.fromProfileId,
    });
    const toProfile = await ctx.runQuery(api.profile.getById, {
      id: intro.toProfileId,
    });

    if (!fromProfile || !toProfile) {
      throw new Error("Profile not found");
    }

    // Compose introduction messages
    const messageToFrom = composeIntroMessage(fromProfile, toProfile, intro.reason, true);
    const messageToTo = composeIntroMessage(toProfile, fromProfile, intro.reason, false);

    // Send messages to both parties
    await sendIntroMessage(fromProfile, messageToFrom);
    await sendIntroMessage(toProfile, messageToTo);

    // Update intro status
    await ctx.runMutation(api.intro.updateStatus, {
      introId: args.introId,
      status: "completed",
      introSentAt: Date.now(),
    });

    return { success: true };
  },
});

export const getById = query({
  args: { id: v.id("intros") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getPendingForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("intros")
      .withIndex("by_to", (q) => q.eq("toProfileId", args.profileId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "pending_consent"),
          q.eq(q.field("status"), "consent_sent")
        )
      )
      .order("desc")
      .collect();
  },
});

export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("pending_consent"),
      v.literal("consent_sent"),
      v.literal("consented"),
      v.literal("declined"),
      v.literal("completed")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db
      .query("intros")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .take(limit);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const [total, pending, sent, consented, declined, completed] = await Promise.all([
      ctx.db.query("intros").collect(),
      ctx.db.query("intros").withIndex("by_status", (q) => q.eq("status", "pending_consent")).collect(),
      ctx.db.query("intros").withIndex("by_status", (q) => q.eq("status", "consent_sent")).collect(),
      ctx.db.query("intros").withIndex("by_status", (q) => q.eq("status", "consented")).collect(),
      ctx.db.query("intros").withIndex("by_status", (q) => q.eq("status", "declined")).collect(),
      ctx.db.query("intros").withIndex("by_status", (q) => q.eq("status", "completed")).collect(),
    ]);

    const totalCount = total.length;
    const consentRate = totalCount > 0 
      ? ((consented.length + completed.length) / (consented.length + completed.length + declined.length)) * 100 
      : 0;
    const completionRate = totalCount > 0 
      ? (completed.length / totalCount) * 100 
      : 0;

    return {
      total: totalCount,
      pending: pending.length,
      consent_sent: sent.length,
      consented: consented.length,
      declined: declined.length,
      completed: completed.length,
      consentRate: Math.round(consentRate),
      completionRate: Math.round(completionRate),
    };
  },
});

function composeIntroMessage(
  recipient: any,
  otherParty: any,
  reason: string,
  isRequester: boolean
): string {
  const intro = isRequester 
    ? "As requested, I'm connecting you with"
    : "I'm delighted to introduce you to";

  return `Hi ${recipient.name}!

${intro} ${otherParty.name}${otherParty.role ? ` (${otherParty.role}` : ""}${otherParty.company ? ` at ${otherParty.company})` : ")"}

${otherParty.headline ? `About them: ${otherParty.headline}` : ""}

Why this connection: ${reason}

${otherParty.linkedinUrl ? `LinkedIn: ${otherParty.linkedinUrl}` : ""}

I'll let you both take it from here. Wishing you a great conversation!

Best,
Superconnector`;
}

async function sendIntroMessage(profile: any, message: string): Promise<void> {
  // This will be implemented with actual Twilio integration
  console.log(`Sending intro message to ${profile.name}:`, message);
  
  // In production, this would use Twilio API
  // For now, we'll just log it
}
