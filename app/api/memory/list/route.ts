import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/memory/store";
import { getUserAndSession } from "@/lib/memory/request";

export async function GET(req: NextRequest) {
  const { userId } = getUserAndSession();
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") || undefined;
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 100)));
  const items = await getStore().list({ userId, kind: kind as any, limit });
  return NextResponse.json({ items });
}
