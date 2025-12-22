# external/agents_service/main.py
# Minimal FastAPI service that uses SignalWire Agents SDK (Python)
# Exposes endpoints to start agent sessions with prefab selection.

"""Dynamic multi-agent hosting service for production (no mock sessions)."""
import os
from typing import Optional, List, Dict
from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel

try:
    from signalwire_agents.prefabs import ReceptionistAgent, InfoGathererAgent, FAQBotAgent
    from signalwire_agents.agent_server import AgentServer
except Exception as e:  # pragma: no cover
    print("[agents_service] Import error:", e)
    ReceptionistAgent = None
    InfoGathererAgent = None
    FAQBotAgent = None
    AgentServer = None

app = FastAPI(title="CanvasAI Agents Host", version="1.0.0")

# Pydantic models for request validation
class AgentConfig(BaseModel):
    agent_id: str
    prefab: str
    voice: Optional[str] = None
    language: Optional[str] = "en-US"
    departments: Optional[List[Dict[str, str]]] = None
    questions: Optional[List[Dict[str, str]]] = None
    faqs: Optional[List[Dict[str, str]]] = None

# Central server hosting multiple prefab agents dynamically
server: Optional[AgentServer] = AgentServer(host="0.0.0.0", port=int(os.getenv("AGENTS_PORT", "8100"))) if AgentServer else None

# Keep registry of dynamic agents keyed by internal id
dynamic_agents: Dict[str, str] = {}

def _default_departments() -> List[Dict[str, str]]:
    return [
        {"name": "sales", "description": "Product inquiries and pricing", "number": "+15551230001"},
        {"name": "support", "description": "Technical support and troubleshooting", "number": "+15551230002"},
    ]

def _default_questions() -> List[Dict[str, str]]:
    return [
        {"key_name": "full_name", "question_text": "What is your full name?"},
        {"key_name": "email", "question_text": "What is your email address?", "confirm": True},
        {"key_name": "reason", "question_text": "Briefly describe why you called."},
    ]

def _default_faqs() -> List[Dict[str, str]]:
    return [
        {"question": "What is CanvasAI?", "answer": "CanvasAI is your AI-powered creative and operations platform."},
        {"question": "How do I contact support?", "answer": "You can say 'support' or press 2 to be transferred."},
    ]

@app.get("/health")
async def health():
    return {"status": "ok", "agents": len(dynamic_agents)}

@app.post("/agents/create")
async def create_agent(config: AgentConfig = Body(...)):
    """Create an agent with custom configuration via JSON body."""
    if not server:
        raise HTTPException(status_code=500, detail="Agent server not initialized")
    if config.agent_id in dynamic_agents:
        return {"ok": True, "route": dynamic_agents[config.agent_id]}

    # Validate prefab type
    if config.prefab not in ["receptionist", "info-gatherer", "faq-bot"]:
        raise HTTPException(status_code=400, detail="Unsupported prefab")

    # Get custom configurations or use defaults
    departments = config.departments if config.departments else _default_departments()
    questions = config.questions if config.questions else _default_questions()
    faqs = config.faqs if config.faqs else _default_faqs()

    # Create agent based on prefab type
    if config.prefab == "receptionist":
        agent = ReceptionistAgent(departments=departments, name=f"receptionist_{config.agent_id}")
    elif config.prefab == "info-gatherer":
        agent = InfoGathererAgent(questions=questions, name=f"info_gatherer_{config.agent_id}")
    elif config.prefab == "faq-bot":
        agent = FAQBotAgent(faqs=faqs, name=f"faq_bot_{config.agent_id}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported prefab")

    # Voice override if provided
    if config.voice:
        try:
            agent.set_params({"voice": config.voice})
        except Exception as e:
            print(f"[agents_service] Failed to set voice: {e}")

    # Language parameter
    if config.language:
        try:
            agent.set_params({"language": config.language})
        except Exception as e:
            print(f"[agents_service] Failed to set language: {e}")

    # Register with central server using dynamic route
    route = f"/dyn/{config.agent_id}"
    server.register(agent, route=route)
    dynamic_agents[config.agent_id] = route
    return {"ok": True, "route": route}

@app.get("/agents/route")
async def get_agent_route(agent_id: str):
    route = dynamic_agents.get(agent_id)
    if not route:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"route": route}

# Expose FastAPI app of agent server under /host/* for potential diagnostics
if server:
    # Nothing extra now; server.app already has mounted routers for agents as they are created.
    pass
