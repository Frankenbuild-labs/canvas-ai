# Meeting Agent Worker

Production-ready AI agent worker for LiveKit video meetings. Automatically joins meetings when enabled, provides voice interaction, and integrates with OpenAI for natural language understanding.

## Features

- ✅ Automatic agent joining based on room metadata
- ✅ Voice activity detection (VAD) with Silero
- ✅ Speech-to-text transcription
- ✅ OpenAI LLM integration (GPT-4o-mini default)
- ✅ Text-to-speech synthesis
- ✅ Health check endpoint for monitoring
- ✅ Comprehensive error handling and logging
- ✅ Docker deployment ready

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────┐
│  Meeting UI     │─────▶│  LiveKit Server  │◀─────│   Agent     │
│  (Next.js)      │      │                  │      │   Worker    │
└─────────────────┘      └──────────────────┘      └─────────────┘
        │                         │                         │
        │                         │                         │
        ▼                         ▼                         ▼
┌─────────────────┐      ┌──────────────────┐      ┌─────────────┐
│  Agent Config   │      │   Room Metadata  │      │   OpenAI    │
│  (UI Settings)  │─────▶│  (Agent State)   │      │   API       │
└─────────────────┘      └──────────────────┘      └─────────────┘
```

## Setup

### Prerequisites

- Python 3.11+
- LiveKit server instance
- OpenAI API key

### Installation

1. Navigate to the worker directory:
```bash
cd workers/meeting-agent
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy environment variables:
```bash
cp .env.example .env
```

5. Configure `.env`:
```bash
# LiveKit Connection
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Optional: Agent Configuration
AGENT_LOG_LEVEL=INFO
HEALTH_PORT=8080
```

### Development

Run the agent worker locally:
```bash
python agent.py start
```

The worker will:
1. Connect to LiveKit server
2. Monitor room creation/updates
3. Join rooms where agent is enabled in metadata
4. Provide voice interaction with participants

### Testing

1. Start your Next.js app:
```bash
pnpm dev
```

2. Navigate to a meeting room (e.g., `/video-meeting/test-room`)
3. In the pre-join lobby, configure agent settings:
   - Enable the agent toggle
   - Configure display name, LLM model, prompt
   - Click "Save to meeting"
4. Join the meeting
5. Start the agent worker (if not already running)
6. Agent should automatically join and greet participants

## Docker Deployment

### Build

```bash
docker build -t meeting-agent:latest .
```

### Run

```bash
docker run -d \
  --name meeting-agent \
  --restart unless-stopped \
  -e LIVEKIT_URL=wss://your-server.com \
  -e LIVEKIT_API_KEY=your-key \
  -e LIVEKIT_API_SECRET=your-secret \
  -e OPENAI_API_KEY=your-openai-key \
  -p 8080:8080 \
  meeting-agent:latest
```

### Docker Compose

Add to your `docker-compose.yml`:

```yaml
services:
  meeting-agent:
    build: ./workers/meeting-agent
    restart: unless-stopped
    environment:
      LIVEKIT_URL: ${LIVEKIT_URL}
      LIVEKIT_API_KEY: ${LIVEKIT_API_KEY}
      LIVEKIT_API_SECRET: ${LIVEKIT_API_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      AGENT_LOG_LEVEL: INFO
      HEALTH_PORT: 8080
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Configuration

### Agent Settings (UI)

Configure via meeting UI before joining:

| Setting | Description | Default |
|---------|-------------|---------|
| Enabled | Toggle agent on/off | false |
| Provider | Agent type (livekit/beyond) | livekit |
| Display Name | Agent's name in meeting | Agent |
| Join on Start | Auto-join when enabled | true |
| LLM Provider | AI model provider | openai |
| LLM Model | Specific model | gpt-4o-mini |
| Prompt | System prompt for LLM | "You are a helpful meeting assistant." |
| Voice | TTS voice (OpenAI) | alloy |
| Language | Language code | en-US |

### Worker Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `LIVEKIT_URL` | LiveKit server WebSocket URL | ✅ | - |
| `LIVEKIT_API_KEY` | LiveKit API key | ✅ | - |
| `LIVEKIT_API_SECRET` | LiveKit API secret | ✅ | - |
| `OPENAI_API_KEY` | OpenAI API key | ✅ | - |
| `AGENT_LOG_LEVEL` | Logging level | ❌ | INFO |
| `HEALTH_PORT` | Health check port | ❌ | 8080 |

## Monitoring

### Health Check

The worker exposes health check endpoints:

```bash
# Check if worker is running
curl http://localhost:8080/health
# Response: OK

# Kubernetes/Docker health probe
curl http://localhost:8080/healthz
# Response: OK
```

### Logs

Worker logs include:
- Agent connection status
- Room join/leave events
- LLM request/response info
- Error details with stack traces

Example logs:
```
2025-12-17 10:30:15 [INFO] meeting-agent: Agent connecting to room: test-room
2025-12-17 10:30:16 [INFO] meeting-agent: Starting agent 'Agent' for room test-room
2025-12-17 10:30:17 [INFO] meeting-agent: Agent connected to room test-room
2025-12-17 10:30:18 [INFO] meeting-agent: LLM initialized: openai/gpt-4o-mini
2025-12-17 10:30:19 [INFO] meeting-agent: Agent 'Agent' successfully started in room test-room
```

## Production Deployment

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meeting-agent
spec:
  replicas: 2  # Scale based on load
  selector:
    matchLabels:
      app: meeting-agent
  template:
    metadata:
      labels:
        app: meeting-agent
    spec:
      containers:
      - name: agent
        image: your-registry/meeting-agent:latest
        ports:
        - containerPort: 8080
          name: health
        env:
        - name: LIVEKIT_URL
          valueFrom:
            secretKeyRef:
              name: livekit-creds
              key: url
        - name: LIVEKIT_API_KEY
          valueFrom:
            secretKeyRef:
              name: livekit-creds
              key: api-key
        - name: LIVEKIT_API_SECRET
          valueFrom:
            secretKeyRef:
              name: livekit-creds
              key: api-secret
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-creds
              key: api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
```

### Scaling

- Workers can scale horizontally
- Each worker monitors all rooms
- LiveKit dispatches agents to available workers
- Recommended: 1 worker per 10-20 concurrent meetings

## Troubleshooting

### Agent Not Joining

1. Check worker logs for connection errors
2. Verify LiveKit credentials in `.env`
3. Ensure room metadata has `enabled: true` and `joinOnStart: true`
4. Check agent settings were saved (call `/api/livekit/room/agent` API)

### Audio Issues

1. Verify OpenAI API key is valid
2. Check TTS voice configuration
3. Ensure participants have audio enabled
4. Review VAD sensitivity (Silero defaults are generally good)

### Performance

1. Monitor CPU/memory usage
2. Adjust replica count for horizontal scaling
3. Consider using smaller LLM models (gpt-3.5-turbo)
4. Enable caching for repeated queries

## API Reference

### Agent Metadata Format

Room metadata stored by `/api/livekit/room/agent`:

```json
{
  "agents": [
    {
      "enabled": true,
      "provider": "livekit",
      "displayName": "Agent",
      "joinOnStart": true,
      "llmProvider": "openai",
      "llmModel": "gpt-4o-mini",
      "prompt": "You are a helpful meeting assistant.",
      "voice": "alloy",
      "language": "en-US"
    }
  ]
}
```

## License

See main project LICENSE file.
