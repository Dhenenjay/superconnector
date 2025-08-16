# Supabase Setup for Superconnector V5

## Quick Setup (5 minutes)

### 1. Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project" (it's FREE)
3. Sign up with GitHub or email

### 2. Create New Project
1. Click "New Project"
2. Enter project details:
   - Name: `superconnector-v5`
   - Database Password: (save this securely)
   - Region: Choose closest to you
3. Click "Create new project" (takes ~2 minutes)

### 3. Run Database Schema
1. Once project is ready, click "SQL Editor" in left sidebar
2. Click "New query"
3. Copy ALL content from `supabase-schema.sql` file
4. Paste it in the editor
5. Click "Run" button
6. You should see "Success. No rows returned"

### 4. Get Your Credentials
1. Go to "Settings" (gear icon) → "API"
2. Copy these values:
   - **Project URL**: (looks like https://xxxxx.supabase.co)
   - **anon public** key: (long string starting with eyJ...)

### 5. Add to Environment Variables

Add these to your `.env` file:
```
SUPABASE_URL=your_project_url_here
SUPABASE_ANON_KEY=your_anon_key_here
```

### 6. Add to Render
In Render dashboard, add these environment variables:
- `SUPABASE_URL` = your project URL
- `SUPABASE_ANON_KEY` = your anon key
- `WHATSAPP_VERIFY_TOKEN` = verify_token_123456
- `VAPI_API_KEY` = your VAPI key
- `VAPI_ASSISTANT_ID` = your assistant ID
- `VAPI_PHONE_NUMBER` = your VAPI phone ID
- `OPENAI_API_KEY` = your OpenAI key

## That's it! 🎉

Your database is now ready and will:
- Store all user profiles
- Track all conversations
- Save call history
- Sync between WhatsApp and VAPI
- Scale automatically

## Test Your Setup

Visit: `https://your-project.supabase.co`

You can view your data in the Table Editor in Supabase dashboard.
