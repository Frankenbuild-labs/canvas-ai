import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { getLiveKitServerCredsFromEnv, normalizeDisplayName, normalizeLiveKitIdentity, normalizeLiveKitRoomName } from "@/lib/livekit-utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const room = normalizeLiveKitRoomName(url.searchParams.get("room"));
    const identity = normalizeLiveKitIdentity(url.searchParams.get("identity"));
    const name = normalizeDisplayName(url.searchParams.get("name"), identity);

    const creds = getLiveKitServerCredsFromEnv();
    if (!creds) {
      return NextResponse.json({ error: "LiveKit env vars missing" }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    const at = new AccessToken(creds.apiKey, creds.apiSecret, { identity, name });
    at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
    const token = await at.toJwt();

    return NextResponse.json(
      { token, url: creds.joinUrl, identity, room },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "token error" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
