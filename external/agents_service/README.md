# SignalWire AI Agents Service - Quick Start

## What is this service?

This Python FastAPI service hosts your SignalWire AI Voice Agents. It must be running for agents to work. When a call comes in to an agent-enabled number, SignalWire calls this service to start the AI agent.

---

## Installation

### 1. Install Python Dependencies

```bash
pip install signalwire-agents fastapi uvicorn
```

Or with requirements.txt:
```bash
cd external/agents_service
pip install -r requirements.txt
```

---

## Running the Service

### Development (Local)

```bash
cd external/agents_service
python -m uvicorn main:app --host 0.0.0.0 --port 8100 --reload
```

The `--reload` flag auto-restarts on code changes (dev only).

### Production

```bash
cd external/agents_service
python -m uvicorn main:app --host 0.0.0.0 --port 8100 --workers 4
```

Use multiple workers for production load.

---

## Configuration

### Environment Variables

Add to `.env.local`:

```env
AGENTS_SERVICE_URL=http://127.0.0.1:8100
```

For production (deployed service):
```env
AGENTS_SERVICE_URL=https://agents.yourdomain.com
```

---

## Verify Service is Running

### Health Check
```bash
curl http://127.0.0.1:8100/health
```

Expected response:
```json
{"status":"ok","agents":0}
```

### Check Agents
```bash
curl http://127.0.0.1:8100/agents
```

Shows list of active agents.

---

## Production Deployment Options

### 1. Docker (Recommended)

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8100
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100", "--workers", "4"]
```

Build and run:
```bash
docker build -t canvasai-agents .
docker run -d -p 8100:8100 --name agents canvasai-agents
```

### 2. Systemd Service (Linux Server)

Create `/etc/systemd/system/canvasai-agents.service`:
```ini
[Unit]
Description=CanvasAI Agents Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/canvasai/external/agents_service
Environment="PATH=/usr/local/bin"
ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 8100 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable canvasai-agents
sudo systemctl start canvasai-agents
sudo systemctl status canvasai-agents
```

### 3. PM2 (Node.js Process Manager)

```bash
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8100" --name canvasai-agents
pm2 save
pm2 startup
```

### 4. Cloud Platform

**Railway.app**:
1. Connect GitHub repo
2. Set root directory: `external/agents_service`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port 8100`

**Render.com**:
1. Create new Web Service
2. Root directory: `external/agents_service`
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Fly.io**:
```bash
fly launch
fly deploy
```

---

## Logs and Debugging

### View Logs (Local)
Service outputs to console when running.

### View Logs (Docker)
```bash
docker logs -f canvasai-agents
```

### View Logs (Systemd)
```bash
sudo journalctl -u canvasai-agents -f
```

### Common Issues

**Issue**: `ModuleNotFoundError: No module named 'signalwire_agents'`
**Fix**: `pip install signalwire-agents`

**Issue**: Port 8100 already in use
**Fix**: Change port or kill existing process:
```bash
# Windows
netstat -ano | findstr :8100
taskkill /PID <pid> /F

# Linux/Mac
lsof -ti:8100 | xargs kill -9
```

**Issue**: Agent not answering calls
**Fix**: 
1. Check service is running: `curl http://127.0.0.1:8100/health`
2. Check AGENTS_SERVICE_URL in .env.local
3. Check SignalWire number VoiceUrl points to service
4. Check service logs for errors

---

## API Endpoints

### Health Check
```
GET /health
```

### List Agents
```
GET /agents
```

### Create Agent
```
POST /agents/create?agent_id={uuid}&prefab={type}&voice={voice}&language={lang}
```

### Get Agent Route
```
GET /agents/route?agent_id={uuid}
```

### Answer Call (Webhook)
```
GET /answer_xml?agent_id={uuid}&prefab={type}&name={name}&persona={prompt}&language={lang}&temperature={temp}&voice={voice}&record={bool}&transcripts={bool}
```

---

## Monitoring

### Health Monitoring
Set up monitoring that checks `/health` endpoint every 60 seconds. Alert if:
- Service returns non-200 status
- Response time > 1 second
- Service unreachable

Recommended tools:
- **UptimeRobot** (free)
- **Pingdom**
- **DataDog**
- **New Relic**

### Performance Metrics
Monitor:
- Active agents count
- Requests per minute
- Response time
- Error rate
- Memory usage
- CPU usage

---

## Security

### Production Checklist
- [ ] Use HTTPS (SSL certificate)
- [ ] Add authentication (API key header)
- [ ] Rate limiting (prevent abuse)
- [ ] Firewall rules (only allow SignalWire IPs)
- [ ] Keep dependencies updated
- [ ] Set proper CORS headers
- [ ] Don't expose internal errors to clients
- [ ] Log security events

### Example: Add API Key Auth

In `main.py`:
```python
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

API_KEY_HEADER = APIKeyHeader(name="X-API-Key")

def verify_api_key(api_key: str = Security(API_KEY_HEADER)):
    if api_key != "your-secret-key-here":
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key

@app.post("/agents/create")
async def create_agent(
    agent_id: str,
    prefab: str,
    api_key: str = Security(verify_api_key)
):
    # ... rest of endpoint
```

---

## Next Steps

1. **Start the service**: `uvicorn main:app --host 0.0.0.0 --port 8100 --reload`
2. **Check health**: `curl http://127.0.0.1:8100/health`
3. **Create an agent** in the UI at `/voice/dial`
4. **Test by calling** the agent's assigned number
5. **Deploy to production** using Docker/systemd/cloud platform

---

## Support

- SignalWire Agents SDK: https://github.com/signalwire/ai-agent-python
- FastAPI Docs: https://fastapi.tiangolo.com
- Uvicorn Docs: https://www.uvicorn.org
