import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserIdFromRequest } from "@/lib/auth-next";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = "meeting-recordings";

async function ensureBucketExists() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  const exists = buckets?.some((b) => b.name === BUCKET_NAME);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
    });
    if (createError) throw createError;
  }
}

function sanitizeFilename(name: string): string {
  const baseName = name.split("/").pop()?.split("\\").pop() || name;
  const safeNameRaw = baseName.endsWith(".webm") ? baseName : `${baseName}.webm`;
  return safeNameRaw.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);

    const form = await req.formData();
    const file = form.get("file");
    const name = (form.get("name") as string) || `recording-${Date.now()}.webm`;

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    await ensureBucketExists();

    const arrayBuffer = await file.arrayBuffer();
    const contentType = file.type || "video/webm";

  const safeName = sanitizeFilename(name);
  const objectPath = `${userId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(objectPath, arrayBuffer, {
        contentType,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: signed, error: signedError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(objectPath, 60 * 60);
    if (signedError) throw signedError;

    return NextResponse.json(
      { ok: true, url: signed.signedUrl, name: objectPath.split("/").pop() || safeName, path: objectPath },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    if (e?.message?.includes("Unauthenticated")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("upload error", e);
    return NextResponse.json({ ok: false, error: e?.message || "upload failed" }, { status: 500 });
  }
}
