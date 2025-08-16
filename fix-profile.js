import { config } from 'dotenv';
import { ConvexHttpClient } from 'convex/browser';

// Load environment variables
config();

const convex = new ConvexHttpClient(process.env.CONVEX_URL || 'https://reminiscent-bulldog-339.convex.cloud');

async function fixProfile() {
  console.log('Fixing Dhenenjay profile in database...');
  
  try {
    // Import API
    const { api } = await import('./convex/_generated/api.js');
    
    // First, let's check existing profile
    console.log('\nChecking existing profile for +917428170779...');
    let profile = await convex.query(api.whatsapp.getByPhone, { 
      phone: '+917428170779' 
    });
    
    if (profile) {
      console.log('Found existing profile:', profile);
      
      // Update it with correct email
      console.log('\nUpdating profile with correct email...');
      const updated = await convex.mutation(api.whatsapp.updateProfile, {
        profileId: profile._id,
        email: 'dhenenjay.2001@gmail.com',
        name: 'Dhenenjay'
      });
      console.log('Profile updated:', updated);
    } else {
      console.log('No existing profile found, creating new one...');
      
      // Create new profile
      profile = await convex.mutation(api.whatsapp.createOrUpdate, {
        phone: '+917428170779',
        name: 'Dhenenjay',
        email: 'dhenenjay.2001@gmail.com'
      });
      console.log('Profile created:', profile);
    }
    
    // Now test with the actual phone format used by WhatsApp
    console.log('\nChecking profile with WhatsApp format (without +)...');
    const profileWithoutPlus = await convex.query(api.whatsapp.getByPhone, { 
      phone: '917428170779' 
    });
    
    if (!profileWithoutPlus) {
      console.log('Creating profile for format without +...');
      await convex.mutation(api.whatsapp.createOrUpdate, {
        phone: '917428170779',
        name: 'Dhenenjay',
        email: 'dhenenjay.2001@gmail.com'
      });
    }
    
    console.log('\n✅ Profile fix complete!');
    console.log('Your WhatsApp should now recognize you and not ask for email again.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  }
}

fixProfile().catch(console.error);
