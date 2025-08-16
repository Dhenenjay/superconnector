import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const send = action({
  args: {
    fromProfileId: v.id("profiles"),
    toProfileId: v.id("profiles"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // Get both profiles
    const fromProfile = await ctx.runQuery(api.profile.getById, {
      id: args.fromProfileId,
    });
    const toProfile = await ctx.runQuery(api.profile.getById, {
      id: args.toProfileId,
    });

    if (!fromProfile || !toProfile) {
      throw new Error("Profile not found");
    }

    // Create intro record with pending status
    const introId = await ctx.runMutation(api.intro.create, {
      fromProfileId: args.fromProfileId,
      toProfileId: args.toProfileId,
      reason: args.reason,
    });

    // Check quiet hours for recipient
    const now = new Date();
    if (isInQuietHours(toProfile.quietHours, now)) {
      // Schedule for later
      console.log("Recipient is in quiet hours, scheduling for later");
      // In production, this would use a cron job or scheduled task
    }

    // Determine channel preference
    const channel = toProfile.preferredChannels?.[0] || "whatsapp";

    // Compose consent message
    const message = composeConsentMessage(fromProfile, toProfile, args.reason);

    // Send via appropriate channel
    await sendMessage(toProfile, channel, message, introId);

    // Update intro status
    await ctx.runMutation(api.intro.updateStatus, {
      introId,
      status: "consent_sent",
      consentRequestedAt: Date.now(),
    });

    return { success: true, introId, channel };
  },
});

export const parse = action({
  args: {
    identityId: v.id("identities"),
    message: v.string(),
    channel: v.union(v.literal("whatsapp"), v.literal("sms"), v.literal("email")),
  },
  handler: async (ctx, args) => {
    // Find pending consent requests for this identity
    const profile = await ctx.runQuery(api.profile.getByIdentityId, {
      identityId: args.identityId,
    });

    if (!profile) {
      return { parsed: false, message: "No profile found" };
    }

    // Get pending intros where this profile is the recipient
    const pendingIntros = await ctx.runQuery(api.intro.getPendingForProfile, {
      profileId: profile._id,
    });

    if (pendingIntros.length === 0) {
      return { parsed: false, message: "No pending consent requests" };
    }

    // Parse the message for consent indication
    const messageLower = args.message.toLowerCase();
    const isConsent = 
      messageLower.includes("yes") ||
      messageLower.includes("accept") ||
      messageLower.includes("approve") ||
      messageLower.includes("connect") ||
      messageLower.includes("introduce");
    
    const isDecline = 
      messageLower.includes("no") ||
      messageLower.includes("decline") ||
      messageLower.includes("reject") ||
      messageLower.includes("pass");

    if (!isConsent && !isDecline) {
      return { 
        parsed: false, 
        message: "Could not determine consent response. Please reply with 'yes' to accept or 'no' to decline." 
      };
    }

    // Process the most recent pending intro
    const intro = pendingIntros[0];
    const newStatus = isConsent ? "consented" : "declined";

    await ctx.runMutation(api.intro.updateStatus, {
      introId: intro._id,
      status: newStatus,
      consentedAt: isConsent ? Date.now() : undefined,
    });

    if (isConsent) {
      // Trigger the introduction
      await ctx.runAction(api.intro.send, {
        introId: intro._id,
      });
      
      return { 
        parsed: true, 
        consented: true,
        message: "Great! I'll make the introduction now." 
      };
    } else {
      return { 
        parsed: true, 
        consented: false,
        message: "Understood, I won't make this introduction." 
      };
    }
  },
});

function isInQuietHours(
  quietHours: { start: string; end: string; timezone: string } | undefined,
  now: Date
): boolean {
  if (!quietHours) return false;

  // Simple implementation - in production, use proper timezone library
  const currentHour = now.getHours();
  const startHour = parseInt(quietHours.start.split(":")[0]);
  const endHour = parseInt(quietHours.end.split(":")[0]);

  if (startHour > endHour) {
    // Crosses midnight
    return currentHour >= startHour || currentHour < endHour;
  } else {
    return currentHour >= startHour && currentHour < endHour;
  }
}

function composeConsentMessage(
  fromProfile: any,
  toProfile: any,
  reason: string
): string {
  return `Hi ${toProfile.name}! 

${fromProfile.name} (${fromProfile.role || ""}${fromProfile.company ? ` at ${fromProfile.company}` : ""}) would like to connect with you.

Why this match: ${reason}

${fromProfile.headline ? `About them: ${fromProfile.headline}` : ""}

Would you like me to make an introduction? Reply 'yes' to accept or 'no' to decline.`;
}

async function sendMessage(
  profile: any,
  channel: string,
  message: string,
  introId: string
): Promise<void> {
  // This will be implemented with actual Twilio integration
  console.log(`Sending ${channel} message to profile ${profile._id}:`, message);
  
  // In production, this would use Twilio API
  // For now, we'll just log it
}
