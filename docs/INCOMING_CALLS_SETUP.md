# Setting Up Incoming Calls - Quick Guide

## Problem

Your SignalWire numbers currently have **no VoiceUrl configured**, which means incoming calls won't be answered. SignalWire needs a public webhook URL to send call notifications to.

## Current Numbers

1. **+12095289441** - No VoiceUrl ⚠️
2. **+12535416001** - No VoiceUrl ⚠️

---

## Solution Options

### Option 1: Use ngrok (Development/Testing)

**Best for**: Local development and testing

1. **Install ngrok**:
   ```bash
   # Download from https://ngrok.com/download
   # Or install via Chocolatey:
   choco install ngrok
   ```

2. **Start your app**:
   ```bash
   pnpm dev
   ```

3. **Start ngrok** (in another terminal):
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Configure your number**:
   ```bash
   node scripts/setup-signalwire-number.js +12095289441 https://abc123.ngrok.io/api/voice/sw/incoming
   ```

6. **Test** by calling +12095289441

---

### Option 2: Deploy to Production

**Best for**: Production use

1. **Deploy your app** to Vercel/Railway/etc.
   ```bash
   vercel --prod
   # or
   railway up
   ```

2. **Get your production URL** (e.g., `https://canvasai.vercel.app`)

3. **Configure your number**:
   ```bash
   node scripts/setup-signalwire-number.js +12095289441 https://canvasai.vercel.app/api/voice/sw/incoming
   ```

4. **Test** by calling the number

---

### Option 3: Manual Configuration (SignalWire Dashboard)

1. Go to **https://deepcanvas.signalwire.com/phone_numbers**
2. Click on a phone number
3. Under **"Voice Settings"**:
   - **When a call comes in**: Choose "Webhook"
   - **URL**: Enter `https://your-domain.com/api/voice/sw/incoming`
   - **Method**: POST
4. Click **Save**
5. Test by calling the number

---

## Available Webhook Endpoints

### 1. Default Incoming Call Handler
**Endpoint**: `/api/voice/sw/incoming`
- Answers with generic message
- Use this for numbers without agents

### 2. Agent Handler
**Endpoint**: `/api/voice/sw/agent/answer?agentId=<agent-id>`
- Answers with AI agent
- Automatically configured when you activate an agent

---

## Quick Setup Commands

### Check current configuration:
```bash
node scripts/check-signalwire-numbers.js
```

### Setup a number:
```bash
# With ngrok (development):
node scripts/setup-signalwire-number.js +12095289441 https://YOUR-NGROK-URL.ngrok.io/api/voice/sw/incoming

# With production (deployed):
node scripts/setup-signalwire-number.js +12095289441 https://your-domain.com/api/voice/sw/incoming
```

### Setup both numbers at once:
```bash
node scripts/setup-signalwire-number.js +12095289441 https://YOUR-URL/api/voice/sw/incoming
node scripts/setup-signalwire-number.js +12535416001 https://YOUR-URL/api/voice/sw/incoming
```

---

## For Agent Calls

When you **activate an agent** in the UI, the system automatically:
1. Creates the agent in the Python service
2. Updates the number's VoiceUrl to point to the agent
3. Future calls go directly to the AI agent

So you only need to manually configure numbers that **don't have agents** assigned.

---

## Testing Checklist

After setup:

- [ ] Run `node scripts/check-signalwire-numbers.js` - should show VoiceUrl configured
- [ ] Call the number from your phone
- [ ] Should hear: "Thank you for calling..."
- [ ] Check terminal logs for incoming call notification
- [ ] Check SignalWire dashboard for call logs

---

## Troubleshooting

### "Call failed" or no answer
- ✅ Check VoiceUrl is publicly accessible (try curl)
- ✅ Check app is running (`pnpm dev`)
- ✅ Check ngrok is running (if using)
- ✅ Check firewall allows incoming connections

### "Cannot connect to webhook"
- ✅ Use HTTPS (not HTTP) for production
- ✅ Make sure ngrok URL is correct
- ✅ Check `/api/voice/sw/incoming` endpoint exists

### Call connects but no audio
- ✅ Check XML response is valid
- ✅ Check no errors in terminal logs
- ✅ Try different voice option

---

## Next Steps

1. **Choose a setup method** (ngrok for dev, production deploy for live)
2. **Run the setup script** for your number(s)
3. **Test by calling** the number
4. **Create an agent** and assign it to the number for AI handling

Once configured, incoming calls will work! 📞
