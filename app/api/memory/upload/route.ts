import { NextRequest, NextResponse } from "next/server";
import { now } from "@/lib/memory/fileStore";
import { getUserAndSession } from "@/lib/memory/request";
import path from "path";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";
import { getStore } from "@/lib/memory/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const docId = (form.get("docId") as string) || undefined;
    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = `${Date.now()}-${file.name}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    const destDir = path.join(process.cwd(), "public", "memory-uploads");
    await fs.mkdir(destDir, { recursive: true });
    const destPath = path.join(destDir, safeName);
    await fs.writeFile(destPath, bytes);

    const url = `/memory-uploads/${encodeURIComponent(safeName)}`;
    const { userId, sessionId } = getUserAndSession();

    await getStore().append({
      id: uuidv4(),
      kind: "file",
      userId,
      sessionId,
      timestamp: now(),
      filename: file.name,
      url,
      size: bytes.length,
      mime: file.type,
      docId,
    } as any);

    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
