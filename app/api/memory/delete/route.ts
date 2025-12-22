import { NextRequest, NextResponse } from "next/server";
import { readAllMemory, writeAllMemory } from "@/lib/memory/fileStore";
import { getUserAndSession } from "@/lib/memory/request";
import path from "path";
import { promises as fs } from "fs";
import { getStore } from "@/lib/memory/store";

export async function DELETE(req: NextRequest) {
  const { userId } = getUserAndSession();
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const res = await getStore().delete({ userId, id })
  const target = res.deleted
  if (!res.ok || !target) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  // If this was a file under /public, attempt to delete it
  try {
    if ((target as any).kind === "file" && (target as any).url && (target as any).url.startsWith("/")) {
      const abs = path.join(process.cwd(), "public", (target as any).url.replace(/^\//, ""));
      await fs.unlink(abs).catch(() => {});
    }
  } catch {}
  return NextResponse.json({ ok: true });
}
