# Faceless Video Generator - Docker Setup

This directory contains the Docker setup for the faceless-video-generator service.

## Setup Instructions

1. **Clone the Repository** (done automatically by Docker build):
   ```bash
   # The Dockerfile clones https://github.com/jacky-xbb/faceless-video-generator
   ```

2. **Environment Variables Required**:
   Create a `.env` file in the root directory with:
   ```env
   # OpenAI API (for GPT-4 story generation and TTS)
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_BASE_URL=https://api.openai.com/v1

   # FAL API (for Flux image generation)
   FAL_KEY=your_fal_api_key
   ```

3. **Build and Run**:
   ```bash
   # From project root
   docker compose up -d faceless-video-gen
   ```

4. **Access API**:
   - API: http://localhost:8005
   - Health Check: http://localhost:8005/health
   - Docs: http://localhost:8005/docs

## API Endpoints

### POST /generate
Start video generation job
```json
{
  "story_type": "custom",
  "image_style": "default",
  "voice": "radiant-girl",
  "custom_topic": "How AI will change our lives",
  "video_title": "The Future of AI",
  "scenes": ["Scene 1 text", "Scene 2 text"],
  "output_language": "English",
  "tone": "Neutral",
  "num_scenes": 10,
  "quick_pace": false
}
```

### GET /status/{job_id}
Get job status and progress

### GET /download/{job_id}
Download completed video

## Directory Structure

```
external/faceless-video-generator/
├── Dockerfile              # Container definition
├── api.py                  # FastAPI wrapper
├── README.md              # This file
└── (generator/)           # Cloned repo (created during build)
```

## Notes

- Videos are stored in `/app/output` inside the container
- Mapped to `./uploads/faceless-videos` on host
- API costs: ~$0.10-0.20 per video (GPT-4 + FAL Flux + TTS)
- Generation time: 3-5 minutes per video
- Maximum 16 scenes per video
- Output: 9:16 aspect ratio (TikTok/Shorts format)
- Using FAL API instead of Replicate for image generation
