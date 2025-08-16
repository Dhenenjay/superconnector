import { mutation } from "../_generated/server";

// Migration to convert lastCallSummary from object to string
export const migrateCallSummaryFormat = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all profiles
    const profiles = await ctx.db.query("profiles").collect();
    
    let migrated = 0;
    let skipped = 0;
    
    for (const profile of profiles) {
      // Check if lastCallSummary exists and is an object (old format)
      if (profile.lastCallSummary && typeof profile.lastCallSummary === 'object') {
        // Extract the summary from the old format
        const oldSummary = profile.lastCallSummary as any;
        const newSummary = oldSummary.extractedInfo?.summary || 
                          oldSummary.summary || 
                          oldSummary.transcript?.substring(0, 200) ||
                          `Call on ${oldSummary.date}`;
        
        // Update to new format
        await ctx.db.patch(profile._id, {
          lastCallSummary: newSummary,
          lastCallAt: new Date(oldSummary.date).getTime() || Date.now(),
          updatedAt: Date.now(),
        });
        
        migrated++;
      } else {
        skipped++;
      }
    }
    
    return {
      success: true,
      migrated,
      skipped,
      total: profiles.length,
    };
  },
});
