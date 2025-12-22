import { NextResponse } from "next/server";
import { getStore } from "@/lib/memory/store";
import { getUserAndSession } from "@/lib/memory/request";

export async function GET() {
  const { userId } = getUserAndSession();
  const mine = await getStore().list({ userId, kind: "research", limit: 1 });
  const last = mine[0];
  if (!last) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, research: last });
}
