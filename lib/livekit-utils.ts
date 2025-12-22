import crypto from "crypto";
import { RoomServiceClient } from "livekit-server-sdk";

const DEFAULT_ROOM = "canvas-room";

function slugify(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 128);
}

export function normalizeLiveKitRoomName(raw: unknown, fallback = DEFAULT_ROOM): string {
  if (typeof raw !== "string") return fallback;
  const s = slugify(raw);
  return s.length > 0 ? s : fallback;
}

export function normalizeLiveKitIdentity(raw: unknown): string {
  if (typeof raw === "string") {
    const s = slugify(raw);
    if (s) return s;
  }

  // Prefer UUID; LiveKit accepts up to 128 chars.
  const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
  return `u-${id}`;
}

export function normalizeDisplayName(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const s = raw.trim().slice(0, 64);
  return s.length > 0 ? s : fallback;
}

export function getLiveKitJoinUrlFromEnv(): string | null {
  const joinUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || "";
  if (!joinUrl) return null;
  return joinUrl;
}

export function getLiveKitRestUrlFromEnv(): string | null {
  const joinUrl = getLiveKitJoinUrlFromEnv();
  if (!joinUrl) return null;

  try {
    const u = new URL(joinUrl);
    if (u.protocol === "wss:") u.protocol = "https:";
    if (u.protocol === "ws:") u.protocol = "http:";
    return u.origin;
  } catch {
    if (joinUrl.startsWith("http")) return joinUrl;
    return `https://${joinUrl}`;
  }
}

export function getLiveKitServerCredsFromEnv(): { apiKey: string; apiSecret: string; joinUrl: string; restUrl: string } | null {
  const apiKey = process.env.LIVEKIT_API_KEY || "";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "";
  const joinUrl = getLiveKitJoinUrlFromEnv() || "";
  const restUrl = getLiveKitRestUrlFromEnv() || "";
  if (!apiKey || !apiSecret || !joinUrl || !restUrl) return null;
  return { apiKey, apiSecret, joinUrl, restUrl };
}

export async function ensureLiveKitRoomExists(
  rsc: RoomServiceClient,
  roomName: string,
  createOptions?: Omit<Parameters<RoomServiceClient["createRoom"]>[0], "name">
): Promise<void> {
  const existing = await rsc.listRooms([roomName]);
  if (existing.length > 0) return;
  await rsc.createRoom({ name: roomName, ...(createOptions || {}) });
}
