import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/memory/store";
import { getUserAndSession } from "@/lib/memory/request";

export async function GET(req: NextRequest) {
  const { userId } = getUserAndSession();
  const url = new URL(req.url);
  const docId = url.searchParams.get("docId") || undefined;
  if (docId) {
    const imgs = await getStore().list({ userId, kind: "image", limit: 500 });
    const filtered = imgs.filter((e: any) => e.docId === docId)
    return NextResponse.json({ images: filtered });
  }
  const last = (await getStore().list({ userId, kind: "research", limit: 1 }))[0] as any
  const images = last?.images || [];
  return NextResponse.json({ images });
}
