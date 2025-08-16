import { config } from 'dotenv';
import { ConvexHttpClient } from 'convex/browser';

// Load environment variables
config();

const convex = new ConvexHttpClient(process.env.CONVEX_URL || 'https://reminiscent-bulldog-339.convex.cloud');

async function testProfile() {
  console.log('Testing Dhenenjay profile...');
  
  try {
    // Import API
    const { api } = await import('./convex/_generated/api.js');
    
    // Create/update Dhenenjay's profile
    console.log('\nCreating/updating Dhenenjay profile...');
    const profile = await convex.mutation(api.whatsapp.createOrUpdate, {
      phone: '+917428170779',
      name: 'Dhenenjay',
      email: 'dhenenjay.2001@gmail.com'
    });
    console.log('Profile created/updated:', profile);
    
    // Verify the profile
    console.log('\nVerifying profile retrieval...');
    const verifyProfile = await convex.query(api.whatsapp.getByPhone, { 
      phone: '+917428170779' 
    });
    console.log('Retrieved profile:', verifyProfile);
    
    console.log('\n✅ Profile setup successful! You should now be able to use WhatsApp without issues.');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testProfile().catch(console.error);
