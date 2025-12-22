import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/auth-next";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = "meeting-recordings";

function normalizeObjectPath(raw: string): string {
  const trimmed = raw.trim().replace(/^\/+/, "");
  // avoid obvious path traversal-ish keys
  if (!trimmed || trimmed.includes("..")) throw new Error("Invalid path");
  return trimmed;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const userId = await getUserIdFromRequest(req);

    const joined = Array.isArray(params.path) ? params.path.join("/") : "";
    const objectPath = normalizeObjectPath(joined);

    // Must be within this user's prefix
    const prefix = `${userId}/`;
    if (!objectPath.startsWith(prefix)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([objectPath]);
    if (error) throw error;

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    if (e?.message?.includes("Unauthenticated")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (e?.message === "Invalid path") {
      return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
    }

    console.error("delete recording error", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "delete failed" },
      { status: 500 }
    );
  }
}
