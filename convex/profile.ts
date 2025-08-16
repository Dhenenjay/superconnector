import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const update = mutation({
  args: {
    identityId: v.id("identities"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    headline: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    asks: v.optional(v.array(v.string())),
    offers: v.optional(v.array(v.string())),
    requirements: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    introTone: v.optional(v.string()),
    quietHours: v.optional(
      v.object({
        start: v.string(),
        end: v.string(),
        timezone: v.string(),
      })
    ),
    preferredChannels: v.optional(
      v.array(v.union(v.literal("whatsapp"), v.literal("sms"), v.literal("email")))
    ),
    lastCallSummary: v.optional(v.string()),
    lastCallAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { identityId, ...updates } = args;

    // Check if profile exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_identity", (q) => q.eq("identityId", identityId))
      .first();

    const now = Date.now();

    if (existingProfile) {
      // Update existing profile
      await ctx.db.patch(existingProfile._id, {
        ...updates,
        updatedAt: now,
      });
      return existingProfile._id;
    } else {
      // Create new profile (requires name)
      if (!args.name) {
        throw new Error("Name is required to create a new profile");
      }
      
      const profileId = await ctx.db.insert("profiles", {
        identityId,
        name: args.name,
        email: args.email,
        role: args.role,
        company: args.company,
        headline: args.headline,
        linkedinUrl: args.linkedinUrl,
        asks: args.asks,
        offers: args.offers,
        requirements: args.requirements,
        tags: args.tags,
        introTone: args.introTone,
        quietHours: args.quietHours,
        preferredChannels: args.preferredChannels,
        lastCallSummary: args.lastCallSummary,
        createdAt: now,
        updatedAt: now,
      });
      return profileId;
    }
  },
});

export const getByIdentityId = query({
  args: { identityId: v.id("identities") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_identity", (q) => q.eq("identityId", args.identityId))
      .first();
  },
});

export const getById = query({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db
      .query("profiles")
      .take(limit);
  },
});

export const getAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("profiles")
      .collect();
  },
});

// Internal mutation to update embedding
export const updateEmbedding = mutation({
  args: {
    profileId: v.id("profiles"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.profileId, {
      embedding: args.embedding,
      updatedAt: Date.now(),
    });
  },
});

// Action to generate and store embedding
export const embed = action({
  args: {
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    // Get profile data
    const profile = await ctx.runQuery(api.profile.getById, {
      id: args.profileId,
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Create text to embed
    const textToEmbed = [
      profile.name,
      profile.role,
      profile.company,
      profile.headline,
      ...(profile.asks || []).map(ask => `needs: ${ask}`),
      ...(profile.offers || []).map(offer => `offers: ${offer}`),
      ...(profile.tags || []),
    ]
      .filter(Boolean)
      .join(" | ");

    // Generate embedding using OpenAI
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-large",
        input: textToEmbed,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;

    // Store embedding
    await ctx.runMutation(api.profile.updateEmbedding, {
      profileId: args.profileId,
      embedding,
    });

    return { success: true };
  },
});

// Generate pitch for a profile
export const generatePitch = action({
  args: {
    profileId: v.id("profiles"),
    audienceType: v.union(
      v.literal("vc"),
      v.literal("founder"),
      v.literal("engineer"),
      v.literal("operator"),
      v.literal("student"),
      v.literal("general")
    ),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(api.profile.getById, {
      id: args.profileId,
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const audienceContext = {
      vc: "a venture capitalist looking for investment opportunities",
      founder: "a startup founder looking for collaborators or resources",
      engineer: "a technical person interested in engineering challenges",
      operator: "a business operator focused on execution and growth",
      student: "a student or intern looking for opportunities",
      general: "a professional in the tech ecosystem",
    };

    const prompt = `Generate a compelling 60-120 word pitch for ${profile.name} targeting ${audienceContext[args.audienceType]}.

Profile details:
- Name: ${profile.name}
- Role: ${profile.role || "Not specified"}
- Company: ${profile.company || "Not specified"}
- Headline: ${profile.headline || "Not specified"}
- Offers: ${(profile.offers || []).join(", ") || "Not specified"}
- Looking for: ${(profile.asks || []).join(", ") || "Not specified"}
${args.context ? `Additional context: ${args.context}` : ""}

Write in a warm, conversational tone that highlights their unique value. Focus on what makes them exceptional and why someone should connect with them.`;

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
            content: "You are an expert networker who writes compelling, concise pitches that make people want to connect.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      pitch: data.choices[0].message.content,
      profile: {
        name: profile.name,
        role: profile.role,
        company: profile.company,
        linkedinUrl: profile.linkedinUrl,
      },
    };
  },
});
