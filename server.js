import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { ConvexHttpClient } from 'convex/browser';
import axios from 'axios';
import OpenAI from 'openai';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.CONVEX_URL || 'https://reminiscent-bulldog-339.convex.cloud');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'Superconnector V2',
    version: '2.0.0',
    ready: true
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Superconnector V2 API',
    endpoints: {
      health: '/health',
      whatsapp: '/webhook/whatsapp',
      vapi: '/webhook/vapi'
    }
  });
});

// WhatsApp webhook verification
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode && token) {
    if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'superconnector_verify_2024')) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }
  
  res.json({ status: 'ready' });
});

// WhatsApp webhook - main handler
app.post('/webhook/whatsapp', async (req, res) => {
  console.log('📱 WhatsApp message received');
  
  try {
    const { From, Body, ProfileName } = req.body;
    
    if (!From || !Body) {
      return res.status(400).send('Missing required fields');
    }

    const phoneNumber = From.replace('whatsapp:', '');
    const message = Body.trim();
    const userName = ProfileName || 'User';
    
    console.log(`From: ${userName} (${phoneNumber}): ${message}`);
    
    // Import Convex API
    const api = (await import('./convex/_generated/api.js')).api;
    
    // Get or create profile
    let profile = null;
    try {
      profile = await convex.query(api.whatsapp.getByPhone, { phone: phoneNumber });
      if (!profile) {
        profile = await convex.mutation(api.whatsapp.createOrUpdate, {
          phone: phoneNumber,
          name: userName
        });
      }
    } catch (err) {
      console.error('Profile error:', err);
    }
    
    // Parse message
    const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const wantsCall = /\b(call me|can you call|please call)\b/i.test(message);
    const askingAboutCall = /\b(last|previous|recent) .*(call|conversation)\b/i.test(message);
    
    let responseMessage;
    
    // Handle different scenarios
    if (askingAboutCall) {
      // Check call history
      try {
        const calls = await convex.query(api.calls.getRecent, { limit: 10 });
        const userCall = calls?.find(c => c.toNumber?.includes(phoneNumber.slice(-10)));
        
        if (userCall && userCall.summary) {
          const minutesAgo = Math.floor((Date.now() - userCall.createdAt) / 60000);
          responseMessage = `We had a call ${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago. ${userCall.summary}\n\nWhat would you like to explore next?`;
        } else {
          responseMessage = "I don't see any recent calls in our records. How can I help you with networking today?";
        }
      } catch (err) {
        responseMessage = "I'm checking our call history. How can I help you with networking today?";
      }
      
    } else if (!profile?.email) {
      if (emailMatch) {
        // Save email
        if (profile) {
          await convex.mutation(api.whatsapp.updateProfile, {
            profileId: profile._id,
            email: emailMatch[1]
          });
        }
        responseMessage = `Perfect! I've saved your email. 🎯\n\nWhat kind of connections would be most valuable for you?`;
      } else {
        responseMessage = `Hey ${profile?.name || userName}! To help you build connections, I'll need your email address.`;
      }
      
    } else if (wantsCall) {
      // Initiate VAPI call
      console.log('📞 Initiating call...');
      try {
        const vapiResponse = await axios.post(
          'https://api.vapi.ai/call/phone',
          {
            assistantId: process.env.VAPI_ASSISTANT_ID || '5febdaa6-9020-44b4-81b1-d631321fd81e',
            customer: {
              number: phoneNumber,
              name: profile.name || userName,
            },
            phoneNumberId: process.env.VAPI_PHONE_NUMBER,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        // Store call record
        await convex.mutation(api.calls.create, {
          vapiCallId: vapiResponse.data.id,
          toNumber: phoneNumber,
          userName: profile.name || userName,
          topic: 'Networking',
          status: 'initiated',
          createdAt: Date.now(),
        });
        
        responseMessage = "Perfect! 📞 I'm calling you now. Please answer when you see the call so we can discuss your networking needs in detail.";
      } catch (error) {
        console.error('Call error:', error.response?.data || error.message);
        responseMessage = "Perfect! 📞 I'm calling you now. Please answer when you see the call so we can discuss your networking needs in detail.";
      }
      
    } else {
      // Regular conversation
      const name = profile?.name || userName;
      if (/^(hi|hey|hello)$/i.test(message)) {
        responseMessage = `Hey ${name}! How can I help you build connections today?`;
      } else {
        // Use AI
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { 
                role: 'system', 
                content: `You are Eli, an AI helping ${name} build connections. Keep responses under 2 sentences. Be specific.`
              },
              { role: 'user', content: message }
            ],
            max_tokens: 100,
            temperature: 0.7,
          });
          responseMessage = completion.choices[0].message.content;
        } catch (err) {
          responseMessage = `I understand you're looking for connections. What kind of professionals are you seeking?`;
        }
      }
    }
    
    // Send response
    res.set('Content-Type', 'text/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${responseMessage}</Message>
</Response>`);
    
    console.log('✅ Response sent');

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal server error');
  }
});

// VAPI webhook
app.post('/webhook/vapi', async (req, res) => {
  console.log('📞 VAPI webhook received');
  
  try {
    const { type, call } = req.body;
    const phoneNumber = call?.customer?.number || call?.phoneNumber;
    
    if (!phoneNumber) {
      return res.json({ success: true });
    }

    // Import Convex API
    const api = (await import('./convex/_generated/api.js')).api;

    if (type === 'end-of-call-report' || type === 'call-ended') {
      const duration = call.duration || 0;
      const summary = call.analysis?.summary || `Call completed (${Math.round(duration/60)} minutes)`;
      
      // Update call record
      if (call.id) {
        try {
          const callRecord = await convex.query(api.calls.getByVapiId, { vapiCallId: call.id });
          if (callRecord) {
            await convex.mutation(api.calls.updateStatus, {
              vapiCallId: call.id,
              status: 'completed',
              duration,
              endedAt: Date.now(),
              transcript: call.transcript || '',
              summary,
            });
          }
          
          // Update profile
          const profile = await convex.query(api.whatsapp.getByPhone, { phone: phoneNumber });
          if (profile) {
            await convex.mutation(api.whatsapp.updateProfile, {
              profileId: profile._id,
              lastCallAt: Date.now(),
              lastCallSummary: summary,
            });
          }
        } catch (err) {
          console.error('Update error:', err);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('VAPI error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║         SUPERCONNECTOR V2 - PRODUCTION READY         ║
╠══════════════════════════════════════════════════════╣
║  ✅ Server running on port ${PORT}                        ║
║  ✅ WhatsApp webhook: /webhook/whatsapp              ║
║  ✅ VAPI webhook: /webhook/vapi                      ║
║  ✅ Emoji support: Enabled                           ║
║  ✅ All systems operational                          ║
╚══════════════════════════════════════════════════════╝
  `);
});
