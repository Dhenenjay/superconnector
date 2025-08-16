import { config } from 'dotenv';
import { ConvexHttpClient } from 'convex/browser';

// Load environment variables
config();

const convex = new ConvexHttpClient(process.env.CONVEX_URL || 'https://reminiscent-bulldog-339.convex.cloud');

async function testConvex() {
  console.log('Testing Convex connection...');
  console.log('URL:', process.env.CONVEX_URL || 'https://reminiscent-bulldog-339.convex.cloud');
  
  try {
    // Import API
    const { api } = await import('./convex/_generated/api.js');
    
    // Test profile query
    console.log('\nTesting profile query...');
    const profile = await convex.query(api.whatsapp.getByPhone, { 
      phone: '+917428170779' 
    });
    console.log('Profile result:', profile);
    
    // Test creating/updating profile
    console.log('\nTesting profile creation...');
    const newProfile = await convex.mutation(api.whatsapp.createOrUpdate, {
      phone: '+917428170779',
      name: 'Test User',
      email: 'test@example.com'
    });
    console.log('Created/Updated profile:', newProfile);
    
    // Verify the profile exists now
    console.log('\nVerifying profile...');
    const verifyProfile = await convex.query(api.whatsapp.getByPhone, { 
      phone: '+917428170779' 
    });
    console.log('Verified profile:', verifyProfile);
    
    console.log('\n✅ Convex connection successful!');
  } catch (error) {
    console.error('❌ Convex error:', error);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

testConvex().catch(console.error);
