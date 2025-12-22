import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/memory/store";
import { getUserAndSession } from "@/lib/memory/request";

export async function GET(req: NextRequest) {
  const { userId } = getUserAndSession();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").toLowerCase();
  const kind = url.searchParams.get("kind") || undefined;
  if (!q) {
    const latest = await getStore().list({ userId, kind: kind as any, limit: 50 });
    return NextResponse.json({ results: latest });
  }
  const results = await getStore().search({ userId, q, kind: kind as any, limit: 200 });
  return NextResponse.json({ results });
}
