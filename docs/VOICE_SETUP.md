# Voice & TTS Studio Setup Guide

Complete guide for setting up and using the PlayHT-powered Voice & TTS Studio.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [PlayHT API Setup](#playht-api-setup)
- [Running the Services](#running-the-services)
- [Usage Guide](#usage-guide)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Pricing & Limits](#pricing--limits)

## Overview

The Voice & TTS Studio is a professional-grade text-to-speech and voice cloning system powered by PlayHT. It enables:

- **Multi-paragraph TTS generation** with individual voice control
- **Voice cloning** from 30-second audio samples
- **800+ pre-made voices** with emotion support
- **Real-time streaming** for voice agents (SignalWire integration ready)
- **Batch processing** for podcast/audiobook production
- **Usage tracking** with free tier (2,500 chars/month)

## Features

### Text-to-Speech
- **Quality Options**: Draft, Low, Medium, High, Premium
- **Speed Control**: 0.5x to 2.0x
- **Languages**: 30+ languages including English, Spanish, French, German, Japanese, etc.
- **Emotions**: Male/Female happy, sad, angry, fearful, disgusted, surprised
- **Output Formats**: MP3, WAV, OGG, FLAC, Mulaw (telephony)

### Voice Cloning
- **30-second samples**: Clone any voice from a short audio clip
- **Transcript support**: Optional transcript for better quality
- **Instant cloning**: Ready to use in seconds
- **Unlimited use**: Use cloned voices as often as you want

### Multi-Speaker Dialogues
- **Two-speaker conversations**: Different voice per speaker
- **Turn-based scripts**: Automatic speaker switching
- **Scene descriptions**: Add context for better delivery
- **Export options**: Download complete dialogues

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (included in docker-compose.yml)
- PlayHT account (free tier available)

### Database Setup

1. Run the migration script to create voice tables:

```bash
# Using PostgreSQL client
psql -h localhost -U postgres -d postgres -f scripts/010_create_voice_tables.sql

# Or using Docker exec
docker exec -i canvasai-postgres psql -U postgres -d postgres < scripts/010_create_voice_tables.sql
```

This creates the following tables:
- `voice_clones` - Stores user-cloned voices
- `tts_generations` - Saves generated audio files
- `conversation_projects` - Multi-speaker dialogue projects
- `user_api_keys` - BYOK (Bring Your Own Key) support
- `voice_usage_tracking` - Monthly usage limits
- `voice_templates` - Saved voice presets

## PlayHT API Setup

### Step 1: Create PlayHT Account

1. Go to [https://play.ht/](https://play.ht/)
2. Sign up for a free account (no credit card required)
3. Free tier includes:
   - 2,500 characters/month
   - Access to all 800+ voices
   - Voice cloning (unlimited clones)
   - All quality levels

### Step 2: Get API Credentials

1. Log in to PlayHT Studio
2. Navigate to **Settings** → **API Access**
3. Copy your:
   - **User ID** (starts with your account identifier)
   - **Secret Key** (long alphanumeric string)

### Step 3: Add Credentials to Environment

1. Create/edit your `.env.local` file:

```bash
PLAY_HT_USER_ID=your_user_id_here
PLAY_HT_API_KEY=your_secret_key_here
PLAYHT_SERVICE_URL=http://localhost:8001
```

2. For production, set in your hosting environment variables.

### Step 4: Verify Connection

```bash
# Test PlayHT service health
curl http://localhost:8001/health

# Expected response:
{
  "status": "healthy",
  "playht_client": "connected",
  "timestamp": "2025-10-12T..."
}
```

## Running the Services

### Local Development

1. **Start all services** (Next.js app + PlayHT service + PostgreSQL):

```bash
# Build and start all containers
docker-compose up -d

# Or start individually
docker-compose up -d postgres        # Database
docker-compose up -d playht-service  # TTS service
pnpm dev                             # Next.js app
```

2. **Access the services**:
   - Next.js App: http://localhost:3000/creative-studio/voice
   - PlayHT API: http://localhost:8001/docs (Swagger UI)
   - Database: localhost:5432

### Production Deployment

1. **Build production images**:

```bash
docker-compose build playht-service
```

2. **Set environment variables** in your hosting provider:
   - Railway, Vercel, AWS, etc.
   - Include all `PLAY_HT_*` variables

3. **Run migrations**:

```bash
# Connect to production database
psql $DATABASE_URL -f scripts/010_create_voice_tables.sql
```

## Usage Guide

### Basic Text-to-Speech

1. Navigate to **Creative Studio** → **Voice & TTS**
2. Type or paste your text in the paragraph editor
3. Click the voice badge (🎙️) to select a voice
4. Click **Generate Speech**
5. Listen to the result and download

### Voice Cloning

1. Click **Clone Voice** button in header
2. Upload a 30-second audio sample (WAV or MP3)
   - **Best practices**:
     - Clear speech, no background noise
     - Natural speaking pace
     - Varied emotions/tones
3. Enter a name for your voice
4. (Optional) Provide transcript for better quality
5. Click **Clone Voice**
6. Wait ~30 seconds for processing
7. Your voice appears in "Cloned" tab of voice selector

### Multi-Paragraph Projects

1. Click **+ Add Paragraph** to create multiple sections
2. Assign different voices to each paragraph:
   - Click voice badge on each row
   - Select different voice
   - Click Confirm
3. Click **Generate All** to process all paragraphs
4. Click **Export** to download all audio files

### Sample Scripts

Use pre-built templates to get started quickly:

- **Customer Support**: Professional service voice
- **Children's Story**: Warm, engaging narration
- **Podcast**: Conversational tone
- **Today's AI News**: News anchor style
- **Daily Meditation**: Calm, soothing voice
- **Sales Outbound**: Energetic, persuasive

Click any template to auto-populate text.

## API Reference

### Generate TTS

**POST** `/api/voice/tts/generate`

```json
{
  "text": "Hello world",
  "voice_id": "s3://voice-cloning-zero-shot/nia/manifest.json",
  "language": "english",
  "speed": 1.0,
  "quality": "medium",
  "emotion": "female_happy"
}
```

**Response:**
```json
{
  "id": "uuid",
  "audio_url": "http://localhost:8001/audio/file.mp3",
  "duration_seconds": 2.5,
  "character_count": 11,
  "usage": {
    "characters_used": 11,
    "limit": 2500,
    "remaining": 2489
  }
}
```

### Batch Generate

**POST** `/api/voice/tts/batch`

```json
{
  "paragraphs": [
    {
      "text": "First paragraph",
      "voice_id": "angelo",
      "speed": 1.0
    },
    {
      "text": "Second paragraph",
      "voice_id": "nia",
      "speed": 1.2
    }
  ]
}
```

### Clone Voice

**POST** `/api/voice/cloning/create`

Multipart form data:
- `audio_file`: Audio file (WAV, MP3)
- `voice_name`: Name for cloned voice
- `transcript`: Optional transcript

### List Voices

**GET** `/api/voice/voices?language=en&gender=female&emotions_only=true`

Returns all available voices (pre-made + cloned).

## Troubleshooting

### "PlayHT client not configured"

**Cause**: Missing or invalid API credentials

**Solution**:
```bash
# Check environment variables
echo $PLAY_HT_USER_ID
echo $PLAY_HT_API_KEY

# Restart services
docker-compose restart playht-service
```

### "Free tier limit exceeded"

**Cause**: Used 2,500+ characters this month

**Solutions**:
1. Wait until next month (resets automatically)
2. Add your own PlayHT API key (BYOK)
3. Upgrade to paid plan

### Voice cloning fails

**Common issues**:
- Audio sample too short (< 5 seconds)
- Background noise or music
- Poor audio quality
- File format not supported

**Solutions**:
- Use 30-second clear speech sample
- Record in quiet environment
- Use WAV or high-quality MP3
- Provide transcript for better results

### Audio generation is slow

**Causes**:
- High quality setting (Premium)
- Long text (> 1000 characters)
- Network latency

**Solutions**:
- Use "Medium" quality for faster generation
- Split long text into paragraphs
- Check PlayHT service status: http://localhost:8001/health

### Docker container won't start

```bash
# Check logs
docker logs playht-tts-service

# Common issues:
# 1. Port 8001 already in use
docker-compose down
docker-compose up -d

# 2. Build failed
docker-compose build --no-cache playht-service
```

## Pricing & Limits

### Free Tier (Default)

- **2,500 characters/month** per user
- All 800+ voices available
- Unlimited voice clones
- All quality levels
- No credit card required

**Character counting**:
- Only counts actual text (not whitespace)
- Generated audio is free to download/use
- Resets on 1st of each month

### BYOK (Bring Your Own Key)

Users can add their own PlayHT API key:

1. Get API key from PlayHT
2. Add to **Settings** → **API Keys**
3. Unlimited usage billed to your PlayHT account

**PlayHT Pricing** (when using own key):
- **Play3.0 Mini**: $0.000075/char (~$0.75 per 10k chars)
- **Play3.0**: $0.00015/char (~$1.50 per 10k chars)
- **Premium**: $0.00030/char (~$3.00 per 10k chars)

### Usage Tracking

View your current usage:
```sql
SELECT 
  month_year,
  characters_used,
  generations_count,
  clones_count
FROM voice_usage_tracking
WHERE user_id = 'your_user_id'
ORDER BY month_year DESC;
```

## Advanced Features

### Real-time Streaming (Voice Agents)

For SignalWire integration:

```javascript
// Connect to WebSocket
const ws = new WebSocket("ws://localhost:8001/tts/stream")

// Send text to stream
ws.send(JSON.stringify({
  text: "Hello from voice agent",
  voice_id: "angelo",
  telephony: true  // Use mulaw format for phones
}))

// Receive audio chunks
ws.onmessage = (event) => {
  // Play audio chunk
}
```

### Custom Voice Templates

Save frequently used voice settings:

1. Configure voice + settings
2. Click "Save as Template"
3. Reuse in future projects

### Batch Export

Download all generated audio as ZIP:

```bash
# Export button in UI, or API:
POST /api/voice/export
{
  "generation_ids": ["uuid1", "uuid2", ...]
}
```

## Support

### Documentation
- PlayHT Docs: https://docs.play.ht/
- Python SDK: https://github.com/playht/pyht
- API Reference: http://localhost:8001/docs

### Community
- GitHub Issues: Report bugs
- Discord: Get help from community

### Need Help?

Common questions:
1. **How long does voice cloning take?** ~30 seconds
2. **Can I use commercial?** Yes, all generated audio is yours
3. **Best voice for podcasts?** Try "Nia" or "Angelo"
4. **How to improve quality?** Use Premium quality + provide transcript for clones

---

**Last Updated**: October 12, 2025
**Version**: 1.0.0
