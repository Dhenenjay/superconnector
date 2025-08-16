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
      console.log('âœ… Webhook verified');
      return res.status(200).send(challenge);
    }
    console.log('âŒ Webhook verification failed');
    return res.sendStatus(403);
  }
  
  res.json({ status: 'ready', token: 'Use WHATSAPP_VERIFY_TOKEN env var' });
});

// WhatsApp webhook - main handler
app.post('/webhook/whatsapp', async (req, res) => {
  console.log('ðŸ“± WhatsApp message received:', JSON.stringify(req.body, null, 2));
  
  try {
    const { From, Body, ProfileName } = req.body;
    
    if (!From || !Body) {
      return res.status(400).send('Missing required fields');
    }

    const phoneNumber = From.replace('whatsapp:', '').trim();
    const message = Body.trim();
    const userName = ProfileName || 'User';
    
    console.log(`ðŸ“¨ From: ${userName} (${phoneNumber}): ${message}`);
    
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
      console.log('âœ… Found existing profile:', profile.id);
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
        console.error('âŒ Error creating profile:', createError);
        // Continue without profile
        profile = { phone: phoneNumber, name: userName };
      } else {
        profile = newProfile;
        console.log('âœ… Created new profile:', profile.id);
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
    
    // Get conversation history
    let conversationHistory = [];
    if (profile.id) {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
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
          ? `Yes! We spoke ${timeText}. ${lastCall.summary}\n\nWhat would you like to explore next? ðŸš€`
          : `We had a call ${timeText}. How can I help you build on that conversation?`;
      } else if (profile.last_call_summary) {
        responseMessage = `From our last conversation: ${profile.last_call_summary}\n\nHow can I help you today?`;
      } else {
        responseMessage = "I don't see any recent calls in our records. Would you like to schedule one? Just say 'call me' ðŸ“ž";
      }
      
    } else if (!profile.email && !emailMatch) {
      // Need email
      responseMessage = `Hey ${profile.name || userName}! ðŸ‘‹\n\nTo help you build meaningful connections, I'll need your email address. This helps me personalize your networking journey.\n\nWhat's your best email?`;
      
    } else if (emailMatch && (!profile.email || profile.email !== emailMatch[1])) {
      // Save/update email
      if (profile.id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ email: emailMatch[1] })
          .eq('id', profile.id);
        
        if (!updateError) {
          profile.email = emailMatch[1];
          responseMessage = `Perfect! I've saved your email (${emailMatch[1]}) ðŸŽ¯\n\nNow, what kind of connections would be most valuable for your goals?`;
        } else {
          responseMessage = `Thanks for sharing your email! What kind of connections are you looking for?`;
        }
      } else {
        responseMessage = `Great! I have your email. What networking goals can I help you with?`;
      }
      
    } else if (wantsCall) {
      // Initiate VAPI call
      console.log('ðŸ“ž Initiating VAPI call for:', phoneNumber);
      
      try {
        const vapiPayload = {
          assistantId: process.env.VAPI_ASSISTANT_ID || '5febdaa6-9020-44b4-81b1-d631321fd81e',
          customer: {
            number: phoneNumber,
            name: profile.name || userName,
          },
          phoneNumberId: process.env.VAPI_PHONE_NUMBER || '8b427031-9c9e-44d9-afda-6a6e2a23e3c3',
        };
        
        console.log('ðŸ“ž VAPI Request:', JSON.stringify(vapiPayload, null, 2));
        
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
        
        console.log('âœ… VAPI Response:', vapiResponse.data);
        
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
        
        responseMessage = "Perfect! ðŸ“ž I'm calling you now. Please answer when you see the call so we can discuss your networking needs in detail!";
      } catch (error) {
        console.error('âŒ Call error:', error.response?.data || error.message);
        responseMessage = "I'll arrange a call for you shortly! Meanwhile, what specific connections are you looking to make? ðŸ¤";
      }
      
    } else if (isGreeting) {
      // Greeting
      const hasHistory = conversationHistory.length > 5;
      responseMessage = hasHistory 
        ? `Welcome back ${profile.name || userName}! ðŸ‘‹\n\nGreat to continue our conversation. What's on your mind today?`
        : `Hey ${profile.name || userName}! ðŸ‘‹\n\nI'm Eli, your AI networking assistant. I help professionals build meaningful connections.\n\nHow can I help you expand your network today?`;
        
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
        console.error('âŒ AI error:', err);
        responseMessage = `I understand you're interested in building connections. What type of professionals or industries are you looking to connect with? ðŸ¤`;
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
    
    console.log('âœ… Response sent:', responseMessage);

  } catch (error) {
    console.error('âŒ Error processing message:', error);
    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>I'm having a moment! Let me get back to you shortly. Meanwhile, feel free to tell me what you're looking for! ðŸ”„</Message>
</Response>`);
  }
});

// VAPI webhook handler
app.post('/webhook/vapi', async (req, res) => {
  console.log('ðŸ“ž VAPI webhook received:', JSON.stringify(req.body, null, 2));
  
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
    if (type === 'call-started') {
      console.log('ðŸ“ž Call started:', call.id);
      
      // Update call status
      if (call.id) {
        await supabase
          .from('calls')
          .update({ 
            status: 'in-progress',
            started_at: new Date().toISOString()
          })
          .eq('vapi_call_id', call.id);
      }
      
    } else if (type === 'end-of-call-report' || type === 'call-ended') {
      console.log('ðŸ“ž Call ended:', call.id);
      
      const duration = call.duration || 0;
      const summary = call.analysis?.summary || 
                     call.summary || 
                     `Call completed (${Math.round(duration/60)} minutes)`;
      const transcript = call.transcript || '';
      const recordingUrl = call.recordingUrl || '';
      
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
          console.error('âŒ Error updating call:', updateCallError);
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
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({
            last_call_summary: summary,
            last_call_at: new Date().toISOString()
          })
          .eq('id', profile.id);
        
        if (!updateProfileError) {
          console.log('âœ… Profile updated with call summary');
        }
        
        // Store a message about the call completion
        await supabase
          .from('messages')
          .insert({
            profile_id: profile.id,
            direction: 'outbound',
            content: `Call completed: ${summary}`,
            message_type: 'system'
          });
      }
      
    } else if (type === 'transcript') {
      console.log('ðŸ“ Transcript update for call:', call.id);
      
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
    console.error('âŒ VAPI webhook error:', error);
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
  const vapiConfigured = process.env.VAPI_API_KEY ? 'âœ…' : 'âŒ';
  const openaiConfigured = process.env.OPENAI_API_KEY ? 'âœ…' : 'âŒ';
  
  console.log(`
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘           SUPERCONNECTOR V5 - PRODUCTION READY               â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  âœ… Server running on port ${PORT}                                 â•‘
â•‘  âœ… WhatsApp webhook: /webhook/whatsapp                       â•‘
â•‘  âœ… VAPI webhook: /webhook/vapi                               â•‘
â•‘  âœ… Admin endpoints: /admin/*                                 â•‘
â•‘  âœ… Health check: /health                                     â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  Database: ${dbUrl.substring(0, 30)}...                       â•‘
â•‘  VAPI: ${vapiConfigured}  OpenAI: ${openaiConfigured}                                          â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘  Features:                                                    â•‘
â•‘  â€¢ Real-time sync between WhatsApp & VAPI                    â•‘
â•‘  â€¢ Persistent PostgreSQL storage via Supabase                â•‘
â•‘  â€¢ Full conversation history & context                       â•‘
â•‘  â€¢ Emoji support enabled                                     â•‘
â•‘  â€¢ Auto-scaling ready                                        â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  `);
});
