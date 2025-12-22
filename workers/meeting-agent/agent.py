"""
LiveKit Meeting Agent Worker

This worker monitors LiveKit rooms and automatically joins as an AI agent
when enabled in room metadata. It handles voice transcription, LLM responses,
and text-to-speech synthesis.
"""

import asyncio
import logging
import os
import json
from typing import Optional
from dataclasses import dataclass

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
    llm,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, silero

from health import start_health_server

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("meeting-agent")


@dataclass
class AgentConfig:
    """Agent configuration from room metadata"""
    enabled: bool = False
    provider: str = "livekit"
    display_name: str = "Agent"
    join_on_start: bool = True
    llm_provider: Optional[str] = "openai"
    llm_model: Optional[str] = "gpt-4o-mini"
    prompt: Optional[str] = "You are a helpful meeting assistant."
    voice: Optional[str] = None
    language: Optional[str] = "en-US"


def parse_agent_config(metadata: str) -> Optional[AgentConfig]:
    """Parse agent configuration from room metadata"""
    try:
        data = json.loads(metadata) if metadata else {}
        agents = data.get("agents", [])
        
        # Find first enabled agent (can be extended to support multiple)
        for agent in agents:
            if agent.get("enabled"):
                return AgentConfig(
                    enabled=True,
                    provider=agent.get("provider", "livekit"),
                    display_name=agent.get("displayName", "Agent"),
                    join_on_start=agent.get("joinOnStart", True),
                    llm_provider=agent.get("llmProvider", "openai"),
                    llm_model=agent.get("llmModel", "gpt-4o-mini"),
                    prompt=agent.get("prompt", "You are a helpful meeting assistant."),
                    voice=agent.get("voice"),
                    language=agent.get("language", "en-US"),
                )
        return None
    except Exception as e:
        logger.error(f"Failed to parse agent config: {e}")
        return None


async def entrypoint(ctx: JobContext):
    """Main entry point for agent worker"""
    logger.info(f"Agent connecting to room: {ctx.room.name}")
    
    try:
        # Get room metadata
        room_info = ctx.room
        config = parse_agent_config(room_info.metadata)
        
        if not config or not config.enabled:
            logger.info(f"Agent not enabled for room {ctx.room.name}")
            return
        
        if not config.join_on_start:
            logger.info(f"Agent configured but join_on_start is false for room {ctx.room.name}")
            return
        
        logger.info(f"Starting agent '{config.display_name}' for room {ctx.room.name}")
        
    except Exception as e:
        logger.error(f"Failed to parse room config: {e}", exc_info=True)
        return
    
    try:
        # Connect to room
        try:
            await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
            logger.info(f"Agent connected to room {ctx.room.name}")
        except Exception as e:
            logger.error(f"Failed to connect to room: {e}", exc_info=True)
            raise
        
        # Initialize LLM based on config
        try:
            if config.llm_provider == "openai":
                model = openai.LLM(model=config.llm_model or "gpt-4o-mini")
            else:
                logger.warning(f"Unknown LLM provider: {config.llm_provider}, defaulting to OpenAI")
                model = openai.LLM(model="gpt-4o-mini")
            logger.info(f"LLM initialized: {config.llm_provider}/{config.llm_model}")
        except Exception as e:
            logger.error(f"Failed to initialize LLM: {e}", exc_info=True)
            raise
        
        # Initialize voice activity detection
        try:
            vad = silero.VAD.load()
            logger.info("VAD loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load VAD: {e}", exc_info=True)
            raise
        
        # Initialize text-to-speech
        try:
            # For now using OpenAI TTS, can be extended to support other providers
            tts = openai.TTS(voice=config.voice or "alloy")
            logger.info(f"TTS initialized with voice: {config.voice or 'alloy'}")
        except Exception as e:
            logger.error(f"Failed to initialize TTS: {e}", exc_info=True)
            raise
        
        # Create system prompt
        initial_context = llm.ChatContext().append(
            role="system",
            text=config.prompt or "You are a helpful meeting assistant. Keep responses concise and natural.",
        )
        
        # Create voice pipeline agent
        try:
            assistant = VoicePipelineAgent(
                vad=vad,
                stt=openai.STT(),  # Speech-to-text
                llm=model,
                tts=tts,
                chat_ctx=initial_context,
            )
            logger.info("Voice pipeline agent created")
        except Exception as e:
            logger.error(f"Failed to create voice pipeline agent: {e}", exc_info=True)
            raise
        
        # Update local participant name
        try:
            await ctx.room.local_participant.set_name(config.display_name)
            logger.info(f"Participant name set to: {config.display_name}")
        except Exception as e:
            logger.warning(f"Failed to set participant name: {e}")
        
        # Set metadata to identify as bot
        try:
            await ctx.room.local_participant.set_metadata(
                json.dumps({"is_agent": True, "agent_type": config.provider})
            )
            logger.info("Agent metadata set")
        except Exception as e:
            logger.warning(f"Failed to set metadata: {e}")
        
        # Start the assistant
        try:
            assistant.start(ctx.room)
            logger.info("Voice assistant started")
        except Exception as e:
            logger.error(f"Failed to start assistant: {e}", exc_info=True)
            raise
        
        # Add greeting message
        try:
            await assistant.say(
                f"Hello! I'm {config.display_name}, your AI meeting assistant. How can I help you today?",
                allow_interruptions=True,
            )
            logger.info("Greeting sent")
        except Exception as e:
            logger.warning(f"Failed to send greeting: {e}")
        
        logger.info(f"Agent '{config.display_name}' successfully started in room {ctx.room.name}")
        
        # Keep agent running
        try:
            await asyncio.sleep(float('inf'))
        except asyncio.CancelledError:
            logger.info(f"Agent cancelled for room {ctx.room.name}")
            raise
        
    except Exception as e:
        logger.error(f"Agent error in room {ctx.room.name}: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    # Start health check server
    async def setup_and_run():
        health_port = int(os.getenv("HEALTH_PORT", "8080"))
        await start_health_server(health_port)
        logger.info(f"Health check server running on port {health_port}")
    
    asyncio.get_event_loop().run_until_complete(setup_and_run())
    
    # Run the worker with CLI
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            # Agent will monitor all rooms and join when enabled
            request_fnc=None,
        )
    )
