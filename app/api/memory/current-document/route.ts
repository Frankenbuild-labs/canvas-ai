import { NextResponse } from "next/server";
import { getStore } from "@/lib/memory/store";
import { getUserAndSession } from "@/lib/memory/request";

export async function GET() {
  const { userId } = getUserAndSession();
  const mine = await getStore().list({ userId, limit: 1000 });
  // Prefer explicit 'open' or most recent 'edit', otherwise latest 'document'
  const open = mine.filter((e) => e.kind === "open").sort((a, b) => b.timestamp - a.timestamp)[0];
  const edit = mine.filter((e) => e.kind === "edit").sort((a, b) => b.timestamp - a.timestamp)[0];
  const doc = mine.filter((e) => e.kind === "document").sort((a, b) => b.timestamp - a.timestamp)[0];
  const pick = open || edit || doc;
  if (!pick) return NextResponse.json({ found: false });
  // If we picked edit/open, try to enrich from latest document entry for the same docId
  let meta = pick;
  if ((pick as any).docId) {
    const d = mine
      .filter((e) => e.kind === "document" && (e as any).docId === (pick as any).docId)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (d) meta = { ...d, lastAction: pick.kind, lastActionAt: pick.timestamp } as any;
  }
  return NextResponse.json({ found: true, document: meta });
}
