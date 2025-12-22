# SignalWire AI Voice Agents - Complete Guide

## Overview
CanvasAI uses SignalWire's Agent SDK with **SWAIG (SignalWire AI Gateway)** to create intelligent voice agents that can:
- Answer incoming calls automatically
- Route callers to appropriate departments
- Collect information from callers
- Answer FAQs from your knowledge base
- Execute custom functions/tools during calls

---

## Architecture

### Components
1. **Frontend UI** (`/voice/dial`) - Create and manage agents
2. **API Layer** (`/api/voice/sw/agents/*`) - Agent CRUD operations
3. **Python Service** (`external/agents_service/main.py`) - Hosts SignalWire agents
4. **Database** (`signalwire_agents` table) - Stores agent configurations
5. **SignalWire Platform** - Handles actual call routing and AI processing

### How It Works
```
Incoming Call → SignalWire Number → VoiceUrl Webhook → Python Agent Service → SWML Response → SignalWire AI → Caller
```

When you **activate** an agent:
1. Agent configuration is saved to database
2. Python service creates a SignalWire Agent instance using selected prefab
3. SignalWire number's VoiceUrl is updated to point to agent endpoint
4. Future calls to that number are handled by the AI agent

---

## Agent Types (Prefabs)

### 1. Receptionist Agent 🏢
**Purpose**: Routes calls to appropriate departments based on caller needs

**Built-in Capabilities**:
- Greets callers professionally
- Asks about reason for calling
- Matches caller intent to departments
- Transfers to appropriate extension
- Handles common inquiries (hours, location, etc.)

**Configuration Needed**:
Currently uses default departments in `main.py`:
```python
departments = [
    {"name": "sales", "description": "Product inquiries and pricing", "number": "+15551230001"},
    {"name": "support", "description": "Technical support", "number": "+15551230002"},
]
```

**TODO**: Expose department configuration in UI
- Allow users to add/edit/remove departments
- Specify transfer numbers per department
- Customize department descriptions for better matching

---

### 2. Info Gatherer Agent 📝
**Purpose**: Collects specific information from callers

**Built-in Capabilities**:
- Asks predefined questions
- Validates responses (email format, etc.)
- Confirms collected information
- Saves data to database/webhook
- Can request re-confirmation if unsure

**Configuration Needed**:
Currently uses default questions in `main.py`:
```python
questions = [
    {"key_name": "full_name", "question_text": "What is your full name?"},
    {"key_name": "email", "question_text": "What is your email?", "confirm": True},
    {"key_name": "reason", "question_text": "Why are you calling?"},
]
```

**TODO**: Expose question configuration in UI
- Custom question builder
- Validation rules per field
- Webhook URL to POST collected data
- Integration with CRM leads table

---

### 3. FAQ Bot Agent ❓
**Purpose**: Answers frequently asked questions

**Built-in Capabilities**:
- Semantic matching of caller questions to FAQ database
- Provides accurate answers from knowledge base
- Can handle follow-up questions
- Transfers to human if question not in FAQ
- Learns from conversations (if configured)

**Configuration Needed**:
Currently uses default FAQs in `main.py`:
```python
faqs = [
    {"question": "What is CanvasAI?", "answer": "CanvasAI is your AI-powered platform."},
    {"question": "How do I contact support?", "answer": "Say 'support' or press 2."},
]
```

**TODO**: Expose FAQ configuration in UI
- FAQ editor (question + answer pairs)
- Import FAQs from file/database
- Category organization
- Fallback behavior when no match

---

## Full Parameter Reference

### Agent Creation Parameters (Currently Supported)

```typescript
{
  agent_name: string,           // Display name
  prompt: string,               // System prompt/personality
  assigned_number: string,      // SignalWire phone number
  settings: {
    prefab: 'receptionist' | 'info-gatherer' | 'faq-bot',
    voice: string,              // alloy, verse, amber, classic, echo, etc.
    language: string,           // en-US, es-ES, fr-FR, etc.
    temperature: number,        // 0.0-1.0 (creativity)
    recordCalls: boolean,       // Save call recordings
    transcripts: boolean,       // Generate transcripts
    sttProvider: 'signalwire',  // Speech-to-text provider
    ttsProvider: 'signalwire',  // Text-to-speech provider
    bargeIn: boolean,          // Allow caller to interrupt
    enableMessageInject: boolean,
    enablePostPrompt: boolean,
    enablePostPromptUrl: boolean,
  }
}
```

### Missing Parameters (SignalWire SDK Supports)

**SWAIG Functions/Tools** - Not yet exposed:
```python
# Custom functions the agent can call during conversation
functions = [
    {
        "name": "lookup_order",
        "description": "Look up customer order status",
        "parameters": {
            "order_id": {"type": "string", "required": True}
        },
        "webhook": "https://yourapp.com/api/orders/lookup"
    }
]
```

**Post Prompt** - Not yet configurable:
```python
# Instructions after main conversation
post_prompt = "Thank the caller and offer a callback option"
post_prompt_url = "https://yourapp.com/api/post-call"
```

**Advanced Settings** - Not yet exposed:
- `hint`: Guidance for agent behavior
- `params`: Additional model parameters
- `prompt_top_p`: Nucleus sampling parameter
- `max_function_calls`: Limit tool usage
- `function_timeout`: Timeout for function execution
- `confidence_threshold`: Minimum confidence for responses

---

## Setup Instructions

### 1. Start Python Agent Service

**Prerequisites**:
```bash
pip install signalwire-agents fastapi uvicorn
```

**Run Service**:
```bash
cd external/agents_service
python -m uvicorn main:app --host 0.0.0.0 --port 8100
```

**Environment Variable**:
Add to `.env.local`:
```
AGENTS_SERVICE_URL=http://127.0.0.1:8100
```

**Check Health**:
```bash
curl http://127.0.0.1:8100/health
# Should return: {"status":"ok","agents":0}
```

---

### 2. Create Database Table

Already exists if you ran previous migrations:
```sql
CREATE TABLE signalwire_agents (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  prompt TEXT,
  assigned_number TEXT NOT NULL,
  settings JSONB,
  status TEXT DEFAULT 'inactive',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activated_at TIMESTAMPTZ
);
```

---

### 3. Create Agent via UI

1. Navigate to `/voice/dial`
2. Click "Agents" tab → "Create Agent"
3. Fill in:
   - **Agent Name**: "Support Bot"
   - **Agent Type**: Select prefab
   - **Agent Prompt**: "You are a friendly customer support agent..."
   - **Assign Phone Number**: Select a purchased SignalWire number
   - **Voice**: Choose voice style
   - **Settings**: Enable recording/transcripts
4. Click "Create Agent"
5. Toggle agent to **Active**

---

### 4. Test Agent

1. Call the assigned SignalWire number
2. Agent should answer with greeting based on prefab
3. Interact with agent based on type:
   - **Receptionist**: Ask to be transferred to sales/support
   - **Info Gatherer**: Answer the questions it asks
   - **FAQ Bot**: Ask questions about your business

---

## Troubleshooting

### Agent Not Answering
**Problem**: Call connects but no agent responds

**Solutions**:
1. Check Python service is running: `curl http://127.0.0.1:8100/health`
2. Check SignalWire number VoiceUrl points to agent service
3. Check agent status is "active" in database
4. Check console logs in Python service for errors

### Agent Says "Could not start"
**Problem**: Error message when calling

**Solutions**:
1. Verify `AGENTS_SERVICE_URL` environment variable is set
2. Check Python service can be reached from Next.js server
3. Check agent prefab exists in Python service
4. Review `/api/voice/sw/agent/answer` logs

### Functions Not Working
**Problem**: Agent can't call custom functions/tools

**Solution**: Custom functions not yet implemented. Need to:
1. Add SWAIG function definitions to agent settings
2. Create webhook endpoints to handle function calls
3. Update Python service to register functions with agent
4. Add UI to configure functions

---

## Roadmap / TODO

### Phase 1: Core Enhancements (High Priority)
- [ ] **Expose Department Configuration**
  - UI to add/edit departments for Receptionist
  - Transfer number management
  - Department availability hours
  
- [ ] **Expose Questions Configuration**
  - Question builder for Info Gatherer
  - Field validation rules
  - Webhook integration for collected data
  
- [ ] **Expose FAQ Configuration**
  - FAQ editor interface
  - Bulk import FAQs
  - Category/tag organization

### Phase 2: Advanced Features (Medium Priority)
- [ ] **SWAIG Functions/Tools**
  - Function definition UI
  - Webhook endpoint builder
  - Test function execution
  - Function marketplace (common tools)
  
- [ ] **Post-Call Actions**
  - Post-prompt configuration
  - Post-call webhook setup
  - Email/SMS follow-ups
  - CRM integration
  
- [ ] **Agent Analytics**
  - Call volume by agent
  - Average call duration
  - Function usage stats
  - Caller satisfaction (DTMF ratings)

### Phase 3: Enterprise Features (Low Priority)
- [ ] **Multi-Language Support**
  - Language detection
  - Auto-translation
  - Multiple voice options per language
  
- [ ] **Call Queuing**
  - Hold music
  - Queue position announcements
  - Estimated wait time
  
- [ ] **Agent Handoff**
  - Transfer to human agent
  - Context preservation
  - Warm transfer vs cold transfer

---

## Best Practices

### 1. Agent Prompt Guidelines
- **Be specific**: Detail agent's personality, knowledge, constraints
- **Set boundaries**: What agent can/can't do
- **Provide examples**: "For pricing, say '...', for support say '...'"
- **Include fallback**: What to do if uncertain
- **Keep concise**: Aim for 100-300 words

**Good Example**:
```
You are a professional receptionist for Acme Corp. Greet callers warmly 
and ask how you can help. Route sales inquiries to ext. 101, support to 
ext. 102, and billing to ext. 103. For general questions about hours or 
location, provide this information: Open Mon-Fri 9am-5pm EST, located at 
123 Main St. If you cannot help, offer to transfer to our main operator.
```

### 2. Voice Selection
- **Alloy**: Neutral, professional (default)
- **Verse**: Energetic, friendly
- **Amber**: Warm, conversational
- **Classic**: Authoritative, formal
- **Echo**: Deep, confident
- **Nova**: Clear, articulate

Match voice to brand personality and target audience.

### 3. Temperature Setting
- **0.0-0.3**: Very consistent, predictable (receptionist, FAQ)
- **0.4-0.7**: Balanced (general purpose)
- **0.8-1.0**: Creative, varied responses (sales, storytelling)

### 4. Recording & Transcripts
- **Always enable** for compliance, training, quality assurance
- Check local laws regarding call recording consent
- Store recordings securely with encryption
- Set retention policy (e.g., 90 days)

---

## Production Checklist

Before deploying agents to production:

- [ ] Python service deployed with high availability (multiple instances)
- [ ] Database backups configured
- [ ] SignalWire account has sufficient credits
- [ ] Call recording storage configured (S3/Supabase Storage)
- [ ] Monitoring/alerting set up (service down, high error rate)
- [ ] Rate limiting on agent creation API
- [ ] User authentication integrated (replace 'user-123' hardcoding)
- [ ] Call recording consent disclaimer recorded
- [ ] Agent prompts reviewed for brand compliance
- [ ] Transfer numbers tested and verified
- [ ] Fallback behavior tested (what if service down?)
- [ ] Load testing completed (100+ concurrent calls)

---

## API Reference

### Create Agent
```bash
POST /api/voice/sw/agents
Content-Type: application/json

{
  "agent_name": "Support Agent",
  "prompt": "You are a helpful support agent...",
  "assigned_number": "+15551234567",
  "settings": {
    "prefab": "receptionist",
    "voice": "alloy",
    "language": "en-US",
    "temperature": 0.3,
    "recordCalls": true,
    "transcripts": true
  }
}
```

### List Agents
```bash
GET /api/voice/sw/agents
```

### Update Agent Status
```bash
PATCH /api/voice/sw/agents/{id}
Content-Type: application/json

{"status": "active"}
```

### Delete Agent
```bash
DELETE /api/voice/sw/agents/{id}
```

---

## Support

For issues with:
- **SignalWire Platform**: https://signalwire.com/support
- **Agent SDK**: https://github.com/signalwire/ai-agent-python
- **SWAIG Docs**: https://developer.signalwire.com/guides/swaig/
- **CanvasAI Integration**: Check `/docs` folder

---

## Next Steps

1. **Test all three prefabs** with real phone numbers
2. **Customize department/questions/FAQs** in `main.py`
3. **Monitor agent performance** via call logs
4. **Iterate on prompts** based on call transcripts
5. **Implement custom functions** for advanced use cases

The agent system is production-ready but prefab configurations need customization for your specific business needs!
