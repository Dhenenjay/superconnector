import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const getSummary = query({
  args: {
    identityId: v.id("identities"),
  },
  handler: async (ctx, args) => {
    const summary = await ctx.db
      .query("summaries")
      .withIndex("by_identity", (q) => q.eq("identityId", args.identityId))
      .first();

    return summary || null;
  },
});

export const update = action({
  args: {
    identityId: v.id("identities"),
    newInteraction: v.string(),
    channel: v.union(
      v.literal("phone"),
      v.literal("whatsapp"),
      v.literal("sms"),
      v.literal("email"),
      v.literal("linkedin")
    ),
  },
  handler: async (ctx, args) => {
    // Get existing summary
    const existingSummary = await ctx.runQuery(api.memory.getSummary, {
      identityId: args.identityId,
    });

    // Get identity and profile info
    const identity = await ctx.runQuery(api.identity.getById, {
      id: args.identityId,
    });
    
    const profile = await ctx.runQuery(api.profile.getByIdentityId, {
      identityId: args.identityId,
    });

    // Store the message
    await ctx.runMutation(api.memory.storeMessage, {
      identityId: args.identityId,
      channel: args.channel,
      direction: "inbound",
      content: args.newInteraction,
    });

    // Generate updated summary using GPT
    const updatedSummary = await generateUpdatedSummary(
      existingSummary?.summary,
      args.newInteraction,
      identity,
      profile
    );

    // Update or create summary
    if (existingSummary) {
      await ctx.runMutation(api.memory.updateSummary, {
        summaryId: existingSummary._id,
        summary: updatedSummary,
      });
    } else {
      await ctx.runMutation(api.memory.createSummary, {
        identityId: args.identityId,
        summary: updatedSummary,
      });
    }

    return { success: true, summary: updatedSummary };
  },
});

export const updateSummary = mutation({
  args: {
    summaryId: v.id("summaries"),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.summaryId, {
      summary: args.summary,
      lastInteraction: Date.now(),
      updatedAt: Date.now(),
    });

    // Increment interaction count
    const existing = await ctx.db.get(args.summaryId);
    if (existing) {
      await ctx.db.patch(args.summaryId, {
        interactionCount: (existing.interactionCount || 0) + 1,
      });
    }
  },
});

export const createSummary = mutation({
  args: {
    identityId: v.id("identities"),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const summaryId = await ctx.db.insert("summaries", {
      identityId: args.identityId,
      summary: args.summary,
      lastInteraction: now,
      interactionCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    return summaryId;
  },
});

export const storeMessage = mutation({
  args: {
    identityId: v.id("identities"),
    channel: v.union(
      v.literal("phone"),
      v.literal("whatsapp"),
      v.literal("sms"),
      v.literal("email"),
      v.literal("linkedin")
    ),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    content: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      identityId: args.identityId,
      channel: args.channel,
      direction: args.direction,
      content: args.content,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return messageId;
  },
});

export const getRecentMessages = query({
  args: {
    identityId: v.id("identities"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    return await ctx.db
      .query("messages")
      .withIndex("by_identity", (q) => q.eq("identityId", args.identityId))
      .order("desc")
      .take(limit);
  },
});

async function generateUpdatedSummary(
  existingSummary: string | undefined,
  newInteraction: string,
  identity: any,
  profile: any
): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    // Fallback to simple concatenation if no API key
    return existingSummary 
      ? `${existingSummary}\n\nLatest: ${newInteraction}`
      : `Initial interaction: ${newInteraction}`;
  }

  const prompt = `You are maintaining a memory summary for a person in a professional networking context.

${existingSummary ? `Existing summary:\n${existingSummary}\n\n` : "This is the first interaction.\n\n"}

New interaction: "${newInteraction}"

${profile ? `
Profile information:
- Name: ${profile.name}
- Role: ${profile.role || "Not specified"}
- Company: ${profile.company || "Not specified"}
- Looking for: ${(profile.asks || []).join(", ") || "Not specified"}
- Can offer: ${(profile.offers || []).join(", ") || "Not specified"}
` : ""}

Update the summary to include relevant information from the new interaction. The summary should:
1. Be concise (under 200 words)
2. Focus on professional context, goals, and preferences
3. Note any specific requests or needs mentioned
4. Track relationship progression and key topics discussed
5. Maintain continuity with previous interactions

Write the updated summary:`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a memory system for a professional networking assistant. Create concise, useful summaries that capture the essence of interactions and help provide personalized service.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating summary:", error);
    // Fallback to simple concatenation
    return existingSummary 
      ? `${existingSummary}\n\nLatest: ${newInteraction}`
      : `Initial interaction: ${newInteraction}`;
  }
}
