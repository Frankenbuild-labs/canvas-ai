import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { AgentSettings, RoomAgentMetadata, sanitizeAgentSettings } from "@/types/agent";
import { ensureLiveKitRoomExists, getLiveKitServerCredsFromEnv, normalizeLiveKitRoomName } from "@/lib/livekit-utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const room = normalizeLiveKitRoomName(body?.room || body?.roomName);
    const agentInput: unknown = body?.agent || body?.settings;
    if (!agentInput) {
      return NextResponse.json({ ok: false, error: "Missing agent settings" }, { status: 400 });
    }

    const creds = getLiveKitServerCredsFromEnv();
    if (!creds) {
      return NextResponse.json({ ok: false, error: "LiveKit env vars missing" }, { status: 500 });
    }

    const rsc = new RoomServiceClient(creds.restUrl, creds.apiKey, creds.apiSecret);

    // Allow saving agent config before anyone joins by creating the room if needed.
    await ensureLiveKitRoomExists(rsc, room);

    const existing = await rsc.listRooms([room]);
    let metadata: RoomAgentMetadata = {};
    if (existing.length > 0 && existing[0].metadata) {
      try { metadata = JSON.parse(existing[0].metadata) as RoomAgentMetadata; } catch {}
    }

    const newAgent: AgentSettings = sanitizeAgentSettings(agentInput);
    const agents = Array.isArray(metadata.agents) ? metadata.agents.slice() : [];
    // Upsert by provider+displayName to keep it simple
    const idx = agents.findIndex(a => a.provider === newAgent.provider && a.displayName === newAgent.displayName);
    if (idx >= 0) agents[idx] = newAgent; else agents.push(newAgent);
    const newMeta: RoomAgentMetadata = { ...metadata, agents };

    await rsc.updateRoomMetadata(room, JSON.stringify(newMeta));

    return NextResponse.json({ ok: true, room, metadata: newMeta });
  } catch (e: any) {
    console.error("agent metadata error", e);
    return NextResponse.json({ ok: false, error: e?.message || "agent route error" }, { status: 500 });
  }
}
