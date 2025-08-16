import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const topK = action({
  args: {
    profileId: v.id("profiles"),
    k: v.optional(v.number()),
    filterTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const k = args.k || 5;
    
    // Get the requesting profile
    const profile = await ctx.runQuery(api.profile.getById, {
      id: args.profileId,
    });

    if (!profile) {
      throw new Error("Profile not found");
    }

    // If profile doesn't have embedding, generate it first
    if (!profile.embedding || profile.embedding.length === 0) {
      await ctx.runAction(api.profile.embed, {
        profileId: args.profileId,
      });
      
      // Re-fetch profile with embedding
      const updatedProfile = await ctx.runQuery(api.profile.getById, {
        id: args.profileId,
      });
      
      if (!updatedProfile?.embedding) {
        throw new Error("Failed to generate embedding for profile");
      }
      
      profile.embedding = updatedProfile.embedding;
    }

    // Perform vector search
    const results = await ctx.vectorSearch("profiles", "by_embedding", {
      vector: profile.embedding,
      limit: k + 1, // Get one extra to filter out self
    });

    // Get full profile data for each result
    const fullProfiles = await Promise.all(
      results.map(async (result) => {
        const fullProfile = await ctx.runQuery(api.profile.getById, {
          id: result._id,
        });
        return { ...fullProfile, _score: result._score };
      })
    );

    // Filter and format results
    const matches = fullProfiles
      .filter(result => result._id !== args.profileId) // Remove self from results
      .slice(0, k)
      .map(result => {
        // Generate match reason based on profile attributes
        const reasons = [];
        
        if (profile.asks && result.offers) {
          const matchingOffers = result.offers.filter(offer => 
            profile.asks.some(ask => 
              offer.toLowerCase().includes(ask.toLowerCase()) ||
              ask.toLowerCase().includes(offer.toLowerCase())
            )
          );
          if (matchingOffers.length > 0) {
            reasons.push(`They offer: ${matchingOffers.join(", ")}`);
          }
        }
        
        if (profile.offers && result.asks) {
          const matchingAsks = result.asks.filter(ask => 
            profile.offers.some(offer => 
              ask.toLowerCase().includes(offer.toLowerCase()) ||
              offer.toLowerCase().includes(ask.toLowerCase())
            )
          );
          if (matchingAsks.length > 0) {
            reasons.push(`They need: ${matchingAsks.join(", ")}`);
          }
        }
        
        if (profile.tags && result.tags) {
          const commonTags = profile.tags.filter(tag => 
            result.tags?.includes(tag)
          );
          if (commonTags.length > 0) {
            reasons.push(`Common interests: ${commonTags.join(", ")}`);
          }
        }
        
        if (reasons.length === 0) {
          reasons.push("Strong profile alignment based on skills and interests");
        }
        
        return {
          profile: {
            _id: result._id,
            name: result.name,
            role: result.role,
            company: result.company,
            headline: result.headline,
            linkedinUrl: result.linkedinUrl,
          },
          score: result._score,
          reason: reasons.join(". "),
        };
      });

    return matches;
  },
});

export const searchByQuery = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    // Generate embedding for the query
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
        input: args.query,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const queryEmbedding = data.data[0].embedding;

    // Perform vector search
    const results = await ctx.vectorSearch("profiles", "by_embedding", {
      vector: queryEmbedding,
      limit: limit,
    });

    // Get full profile data for each result
    const fullProfiles = await Promise.all(
      results.map(async (result) => {
        const fullProfile = await ctx.runQuery(api.profile.getById, {
          id: result._id,
        });
        return { ...fullProfile, _score: result._score };
      })
    );

    return fullProfiles.map(result => ({
      profile: {
        _id: result._id,
        name: result.name,
        role: result.role,
        company: result.company,
        headline: result.headline,
        linkedinUrl: result.linkedinUrl,
        asks: result.asks,
        offers: result.offers,
        tags: result.tags,
      },
      score: result._score,
    }));
  },
});
