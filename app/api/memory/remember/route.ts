import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { now } from "@/lib/memory/fileStore";
import { getUserAndSession } from "@/lib/memory/request";
import { MemoryEntry, MemoryKind } from "@/lib/memory/schema";
import { getStore } from "@/lib/memory/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sessionId } = getUserAndSession();
    const kind: MemoryKind = body.kind;
    if (!kind) {
      return NextResponse.json({ error: "kind is required" }, { status: 400 });
    }
    // Sanitize optional fields
    const containerTags = Array.isArray(body.containerTags)
      ? (body.containerTags.filter((t: any) => typeof t === "string") as string[])
      : undefined;
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : undefined;
    const id = uuidv4();
    const entry: any = {
      id,
      kind,
      userId,
      sessionId,
      timestamp: now(),
      containerTags,
      metadata,
      ...body,
    } satisfies MemoryEntry;
  await getStore().append(entry as MemoryEntry);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
