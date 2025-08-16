import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  identities: defineTable({
    phoneNumber: v.optional(v.string()),
    whatsappId: v.optional(v.string()),
    email: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_phone", ["phoneNumber"])
    .index("by_whatsapp", ["whatsappId"])
    .index("by_email", ["email"])
    .index("by_linkedin", ["linkedinUrl"]),

  profiles: defineTable({
    identityId: v.id("identities"),
    name: v.string(),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    company: v.optional(v.string()),
    industry: v.optional(v.string()),
    headline: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    
    // Professional Goals & Motivations
    goals: v.optional(v.array(v.string())),  // Top professional goals
    motivations: v.optional(v.array(v.string())),  // What drives them (impact, growth, money, etc.)
    challenges: v.optional(v.array(v.string())),  // Current professional challenges
    desiredConnections: v.optional(v.array(v.string())),  // Types of connections they want
    
    // Personality Assessment
    personalityTraits: v.optional(v.object({
      leadershipStyle: v.optional(v.string()),  // visionary, collaborative, directive
      communicationStyle: v.optional(v.string()),  // data-driven, story-driven, relationship-focused
      workStyle: v.optional(v.string()),  // systematic, flexible, innovative
      riskTolerance: v.optional(v.string()),  // conservative, moderate, aggressive
      coreValues: v.optional(v.array(v.string())),  // integrity, innovation, efficiency, etc.
    })),
    
    // Networking Preferences
    asks: v.optional(v.array(v.string())),
    offers: v.optional(v.array(v.string())),
    requirements: v.optional(v.string()),  // What they're looking for
    specificRequests: v.optional(v.array(v.string())),  // Specific companies/people mentioned
    
    // Communication Preferences
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
    
    // Call History & Analysis
    lastCallAt: v.optional(v.number()),  // Timestamp of last call
    lastCallSummary: v.optional(v.any()),  // Summary of last call (temporarily any for migration)
    callHistory: v.optional(v.array(v.object({  // Array of past calls
      callId: v.string(),
      timestamp: v.number(),
      duration: v.optional(v.number()),
      transcript: v.string(),
      summary: v.string(),
      analysis: v.any(),
    }))),
    callAnalysis: v.optional(v.object({  // Structured data from VAPI analysis
      profileData: v.optional(v.any()),  // Complete extracted profile
      nextSteps: v.optional(v.array(v.string())),  // Agreed next steps
      insights: v.optional(v.any()),  // Additional insights
      lastUpdated: v.number(),
    })),
    
    // Metadata
    embedding: v.optional(v.array(v.float64())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_identity", ["identityId"])
    .index("by_phone", ["phoneNumber"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 3072, // text-embedding-3-large dimensions
    }),

  summaries: defineTable({
    identityId: v.id("identities"),
    summary: v.string(),
    lastInteraction: v.number(),
    interactionCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_identity", ["identityId"]),

  intros: defineTable({
    fromProfileId: v.id("profiles"),
    toProfileId: v.id("profiles"),
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
    reason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_from", ["fromProfileId"])
    .index("by_to", ["toProfileId"])
    .index("by_status", ["status"]),

  messages: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_identity", ["identityId"])
    .index("by_channel", ["channel"]),

  calls: defineTable({
    vapiCallId: v.string(),
    toNumber: v.string(),
    userName: v.string(),
    topic: v.string(),
    status: v.string(),
    transcript: v.optional(v.string()),
    summary: v.optional(v.string()),
    duration: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_vapi_id", ["vapiCallId"])
    .index("by_status", ["status"]),
});
