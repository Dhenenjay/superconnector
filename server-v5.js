import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import OpenAI from 'openai';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://sfasytmtawwygurppxyj.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYXN5dG10YXd3eWd1cnBweHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjAwMDgsImV4cCI6MjA3MDkzNjAwOH0.aKswSPvMvwBgO5WaLNJcs4uKRmmEQFUW-Ek_5OXcSUM'
);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { error } = await supabase.from('profiles').select('count').limit(1);
    const dbStatus = !error ? 'connected' : 'disconnected';
    
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: 'Superconnector V5',
      version: '5.0.0',
      database: dbStatus,
      ready: !error
    });
  } catch (err) {
    res.json({ 
      status: 'error',
      timestamp: new Date().toISOString(),
      server: 'Superconnector V5',
      version: '5.0.0',
      database: 'error',
      ready: false
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Superconnector V5 API - Production Ready',
    version: '5.0.0',
    endpoints: {
      health: '/health',
      whatsapp: '/webhook/whatsapp',
      vapi: '/webhook/vapi',
      admin: '/admin/profiles'
    },
    features: [
      'Real-time sync between WhatsApp and VAPI',
      'Persistent PostgreSQL database via Supabase',
      'Full conversation history',
      'Emoji support',
      'Call management'
    ]
  });
});

// Admin endpoint to view profiles (for debugging)
app.get('/admin/profiles', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ profiles: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp webhook verification
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'verify_token_123456';
  
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verified');
      return res.status(200).send(challenge);
    }
    console.log('❌ Webhook verification failed');
    return res.sendStatus(403);
  }
  
  res.json({ status: 'ready', token: 'Use WHATSAPP_VERIFY_TOKEN env var' });
});

// WhatsApp webhook - main handler
app.post('/webhook/whatsapp', async (req, res) => {
  console.log('📱 WhatsApp message received:', JSON.stringify(req.body, null, 2));
  
  try {
    const { From, Body, ProfileName } = req.body;
    
    if (!From || !Body) {
      return res.status(400).send('Missing required fields');
    }

    const phoneNumber = From.replace('whatsapp:', '').trim();
    const message = Body.trim();
    const userName = ProfileName || 'User';
    
    console.log(`📨 From: ${userName} (${phoneNumber}): ${message}`);
    
    // Get or create profile
    let profile = null;
    
    // First try to get existing profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phoneNumber)
      .single();
    
    if (existingProfile) {
      profile = existingProfile;
      console.log('✅ Found existing profile:', profile.id);
    } else {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          phone: phoneNumber,
          name: userName,
          email: null
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating profile:', createError);
        // Continue without profile
        profile = { phone: phoneNumber, name: userName };
      } else {
        profile = newProfile;
        console.log('✅ Created new profile:', profile.id);
      }
    }
    
    // Store incoming message
    if (profile.id) {
      await supabase
        .from('messages')
        .insert({
          profile_id: profile.id,
          direction: 'inbound',
          content: message
        });
    }
    
    // Get conversation history (including VAPI call messages)
    let conversationHistory = [];
    if (profile.id) {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);  // Increased to include more context from calls
      
      conversationHistory = messages || [];
    }
    
    // Parse message intent
    const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const wantsCall = /\b(call me|can you call|please call|talk|speak)\b/i.test(message);
    const askingAboutCall = /\b(last|previous|recent|our) .*(call|conversation|talk|spoke)\b/i.test(message);
    const isGreeting = /^(hi|hey|hello|sup|yo|howdy)$/i.test(message);
    
    let responseMessage;
    
    // Handle different scenarios
    if (askingAboutCall && profile.id) {
      // Reload profile to get latest call summary
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
      
      if (updatedProfile) {
        profile = updatedProfile;
      }
      
      // Check call history
      const { data: recentCalls } = await supabase
        .from('calls')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (recentCalls && recentCalls.length > 0) {
        const lastCall = recentCalls[0];
        const minutesAgo = Math.floor((Date.now() - new Date(lastCall.created_at).getTime()) / 60000);
        const timeText = minutesAgo < 60 
          ? `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`
          : `${Math.floor(minutesAgo/60)} hour${Math.floor(minutesAgo/60) !== 1 ? 's' : ''} ago`;
        
        responseMessage = lastCall.summary 
          ? `Yes! We spoke ${timeText}. ${lastCall.summary}\n\nWhat would you like to explore next? 🚀`
          : `We had a call ${timeText}. How can I help you build on that conversation?`;
      } else if (profile.last_call_summary) {
        responseMessage = `From our last conversation: ${profile.last_call_summary}\n\nHow can I help you today?`;
      } else {
        responseMessage = "I don't see any recent calls in our records. Would you like to schedule one? Just say 'call me' 📞";
      }
      
    } else if (!profile.email && !emailMatch) {
      // Need email
      responseMessage = `Hey ${profile.name || userName}! 👋\n\nTo help you build meaningful connections, I'll need your email address. This helps me personalize your networking journey.\n\nWhat's your best email?`;
      
    } else if (emailMatch && (!profile.email || profile.email !== emailMatch[1])) {
      // Save/update email
      if (profile.id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ email: emailMatch[1] })
          .eq('id', profile.id);
        
        if (!updateError) {
          profile.email = emailMatch[1];
          responseMessage = `Perfect! I've saved your email (${emailMatch[1]}) 🎯\n\nNow, what kind of connections would be most valuable for your goals?`;
        } else {
          responseMessage = `Thanks for sharing your email! What kind of connections are you looking for?`;
        }
      } else {
        responseMessage = `Great! I have your email. What networking goals can I help you with?`;
      }
      
    } else if (wantsCall) {
      // Initiate VAPI call
      console.log('📞 Initiating VAPI call for:', phoneNumber);
      
      try {
        const vapiPayload = {
          assistantId: process.env.VAPI_ASSISTANT_ID || '5febdaa6-9020-44b4-81b1-d631321fd81e',
          customer: {
            number: phoneNumber,
            name: profile.name || userName,
          },
          phoneNumberId: process.env.VAPI_PHONE_NUMBER || '8b427031-9c9e-44d9-afda-6a6e2a23e3c3',
        };
        
        console.log('📞 VAPI Request:', JSON.stringify(vapiPayload, null, 2));
        
        const vapiResponse = await axios.post(
          'https://api.vapi.ai/call/phone',
          vapiPayload,
          {
            headers: {
              'Authorization': `Bearer ${process.env.VAPI_PRIVATE || process.env.VAPI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        console.log('✅ VAPI Response:', vapiResponse.data);
        
        // Store call record
        if (profile.id && vapiResponse.data.id) {
          await supabase
            .from('calls')
            .insert({
              profile_id: profile.id,
              vapi_call_id: vapiResponse.data.id,
              to_number: phoneNumber,
              status: 'initiated',
              started_at: new Date().toISOString()
            });
        }
        
        responseMessage = "Perfect! 📞 I'm calling you now. Please answer when you see the call so we can discuss your networking needs in detail!";
      } catch (error) {
        console.error('❌ Call error:', error.response?.data || error.message);
        responseMessage = "I'll arrange a call for you shortly! Meanwhile, what specific connections are you looking to make? 🤝";
      }
      
    } else if (isGreeting) {
      // Greeting
      const hasHistory = conversationHistory.length > 5;
      responseMessage = hasHistory 
        ? `Welcome back ${profile.name || userName}! 👋\n\nGreat to continue our conversation. What's on your mind today?`
        : `Hey ${profile.name || userName}! 👋\n\nI'm Eli, your AI networking assistant. I help professionals build meaningful connections.\n\nHow can I help you expand your network today?`;
        
    } else {
      // Regular conversation - use AI with context
      try {
        // Build context from history
        const contextMessages = conversationHistory
          .slice(0, 5)
          .reverse()
          .map(msg => ({
            role: msg.direction === 'inbound' ? 'user' : 'assistant',
            content: msg.content
          }));
        
        const systemPrompt = `You are Eli, an AI networking assistant helping ${profile.name || userName} build professional connections. 
        ${profile.email ? `Their email is ${profile.email}.` : 'They haven\'t shared their email yet.'}
        ${profile.last_call_summary ? `Previous call summary: ${profile.last_call_summary}` : ''}
        Keep responses concise (2-3 sentences), helpful, and focused on networking/connections.
        Use emojis sparingly but effectively. Be professional yet friendly.`;
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...contextMessages,
            { role: 'user', content: message }
          ],
          max_tokens: 150,
          temperature: 0.7,
        });
        
        responseMessage = completion.choices[0].message.content;
      } catch (err) {
        console.error('❌ AI error:', err);
        responseMessage = `I understand you're interested in building connections. What type of professionals or industries are you looking to connect with? 🤝`;
      }
    }
    
    // Store outgoing message
    if (profile.id) {
      await supabase
        .from('messages')
        .insert({
          profile_id: profile.id,
          direction: 'outbound',
          content: responseMessage
        });
    }
    
    // Send response with proper UTF-8 encoding
    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`);
    
    console.log('✅ Response sent:', responseMessage);

  } catch (error) {
    console.error('❌ Error processing message:', error);
    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>I'm having a moment! Let me get back to you shortly. Meanwhile, feel free to tell me what you're looking for! 🔄</Message>
</Response>`);
  }
});

// VAPI webhook handler
app.post('/webhook/vapi', async (req, res) => {
  console.log('📞 VAPI webhook received:', JSON.stringify(req.body, null, 2));
  
  try {
    const { type, call } = req.body;
    
    if (!call) {
      return res.json({ success: true, message: 'No call data' });
    }
    
    const phoneNumber = call.customer?.number || call.phoneNumber;
    
    if (!phoneNumber) {
      return res.json({ success: true, message: 'No phone number' });
    }
    
    // Handle different VAPI events
    if (type === 'function-call') {
      console.log('🔧 VAPI requesting function:', req.body.functionCall?.name);
      console.log('📞 Phone number from VAPI:', phoneNumber);
      
      // Get user context for VAPI
      // Keep the phone number as-is since it comes with + from VAPI
      const cleanPhone = phoneNumber.replace('whatsapp:', '').trim();
      
      console.log('🔍 Searching for profile with phone:', cleanPhone);
      
      // Look up profile by phone number
      let profile = null;
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .single();
      
      if (!profileError && profileData) {
        profile = profileData;
        console.log('✅ Found profile for:', profile.name);
      } else if (profileError) {
        console.log('❌ Profile lookup error:', profileError.message);
        console.log('🔍 Trying without + prefix...');
        // Try without the + prefix
        const altPhone = cleanPhone.replace(/^\+/, '');
        const { data: altProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', altPhone)
          .single();
        
        if (altProfile) {
          profile = altProfile;
          console.log('✅ Found profile with alt phone format');
        }
      }
      
      if (profile) {
        // Get recent messages
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        // Build conversation history
        let conversationHistory = 'Previous conversations:\n';
        if (profile.last_call_summary) {
          conversationHistory += `Last call: ${profile.last_call_summary}\n`;
        }
        if (messages && messages.length > 0) {
          messages.reverse().forEach(msg => {
            conversationHistory += `${msg.direction === 'inbound' ? 'User' : 'Eli'}: ${msg.content}\n`;
          });
        }
        
        // Return context to VAPI
        return res.json({
          conversationHistory,
          userName: profile.name,
          userEmail: profile.email,
          userProfile: `${profile.name} - ${profile.phone} - ${profile.email || 'No email'}. ${profile.last_call_summary || ''}`
        });
      }
      
      return res.json({ message: 'No profile found' });
      
    } else if (type === 'status-update' && call.status === 'in-progress') {
      console.log('📞 Call started:', call.id);
      
      // Get profile
      const cleanPhone = phoneNumber.replace('whatsapp:', '').trim();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', cleanPhone)
        .single();
      
      if (profile && call.id) {
        // Create or update call record
        const { error } = await supabase
          .from('calls')
          .upsert({
            vapi_call_id: call.id,
            profile_id: profile.id,
            to_number: phoneNumber,
            status: 'in-progress',
            started_at: new Date().toISOString()
          });
        
        if (!error) {
          console.log('✅ Call record created');
        }
      }
      
    } else if (type === 'end-of-call-report' || type === 'call-ended') {
      console.log('📞 Call ended:', call.id);
      
      const duration = call.duration || 0;
      const summary = call.analysis?.summary || 
                     call.summary || 
                     `Call completed (${Math.round(duration/60)} minutes)`;
      const transcript = call.transcript || '';
      const recordingUrl = call.recordingUrl || '';
      const messages = call.messages || [];
      
      // Update call record
      if (call.id) {
        const { error: updateCallError } = await supabase
          .from('calls')
          .update({
            status: 'completed',
            duration,
            transcript,
            summary,
            recording_url: recordingUrl,
            ended_at: new Date().toISOString()
          })
          .eq('vapi_call_id', call.id);
        
        if (updateCallError) {
          console.error('❌ Error updating call:', updateCallError);
        }
      }
      
      // Update profile with last call info
      const cleanPhone = phoneNumber.replace('whatsapp:', '').trim();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', cleanPhone)
        .single();
      
      if (profile) {
        // Parse and store individual messages from VAPI call
        if (messages && messages.length > 0) {
          console.log('📝 Storing VAPI conversation messages...');
          
          for (const msg of messages) {
            if (msg.role && msg.message) {
              // Store each conversation turn as a message
              await supabase
                .from('messages')
                .insert({
                  profile_id: profile.id,
                  direction: msg.role === 'user' ? 'inbound' : 'outbound',
                  content: msg.message,
                  message_type: 'vapi_call',
                  metadata: {
                    call_id: call.id,
                    timestamp: msg.time,
                    duration: msg.duration
                  }
                });
            }
          }
          console.log(`✅ Stored ${messages.length} VAPI messages`);
        }
        
        // Build a detailed summary from the actual conversation
        let detailedSummary = summary;
        if (messages && messages.length > 0) {
          const userMessages = messages.filter(m => m.role === 'user').map(m => m.message).join(' ');
          if (userMessages) {
            detailedSummary = `${summary}\n\nKey points discussed: ${userMessages.substring(0, 500)}`;
          }
        }
        
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({
            last_call_summary: detailedSummary,
            last_call_at: new Date().toISOString()
          })
          .eq('id', profile.id);
        
        if (!updateProfileError) {
          console.log('✅ Profile updated with detailed call summary');
        }
        
        // Store a message about the call completion
        await supabase
          .from('messages')
          .insert({
            profile_id: profile.id,
            direction: 'outbound',
            content: `Call completed: ${detailedSummary}`,
            message_type: 'system'
          });
      }
      
    } else if (type === 'transcript') {
      console.log('📝 Transcript update for call:', call.id);
      
      // Update transcript in real-time
      if (call.id && call.transcript) {
        await supabase
          .from('calls')
          .update({ transcript: call.transcript })
          .eq('vapi_call_id', call.id);
      }
    }
    
    res.json({ success: true, processed: type });
    
  } catch (error) {
    console.error('❌ VAPI webhook error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Admin endpoint to clear test data
app.delete('/admin/clear-test-data', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    // Clear test profiles (you can adjust the criteria)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .like('email', '%test%');
    
    if (error) throw error;
    
    res.json({ message: 'Test data cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  const dbUrl = process.env.SUPABASE_URL || 'Not configured';
  const vapiConfigured = process.env.VAPI_API_KEY ? '✅' : '❌';
  const openaiConfigured = process.env.OPENAI_API_KEY ? '✅' : '❌';
  
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           SUPERCONNECTOR V5 - PRODUCTION READY               ║
╠══════════════════════════════════════════════════════════════╣
║  ✅ Server running on port ${PORT}                                 ║
║  ✅ WhatsApp webhook: /webhook/whatsapp                       ║
║  ✅ VAPI webhook: /webhook/vapi                               ║
║  ✅ Admin endpoints: /admin/*                                 ║
║  ✅ Health check: /health                                     ║
╠══════════════════════════════════════════════════════════════╣
║  Database: ${dbUrl.substring(0, 30)}...                       ║
║  VAPI: ${vapiConfigured}  OpenAI: ${openaiConfigured}                                          ║
╠══════════════════════════════════════════════════════════════╣
║  Features:                                                    ║
║  • Real-time sync between WhatsApp & VAPI                    ║
║  • Persistent PostgreSQL storage via Supabase                ║
║  • Full conversation history & context                       ║
║  • Emoji support enabled                                     ║
║  • Auto-scaling ready                                        ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
