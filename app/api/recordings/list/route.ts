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

export async function GET(_req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(_req);
    await ensureBucketExists();

    const prefix = `${userId}/`;
    const { data: items, error } = await supabase.storage.from(BUCKET_NAME).list(prefix, {
      limit: 100,
      offset: 0,
    });
    if (error) throw error;

    const files = await Promise.all(
      (items || [])
        .filter((i) => i.name)
        .map(async (i) => {
          const objectPath = `${prefix}${i.name}`;
          const { data: signed, error: signedError } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(objectPath, 60 * 60);
          if (signedError) throw signedError;

        const mtime = i.updated_at
          ? new Date(i.updated_at).getTime()
          : i.created_at
            ? new Date(i.created_at).getTime()
            : 0;
        const size = (i.metadata as any)?.size ?? 0;
        return {
          name: i.name,
          size,
          mtime,
            url: signed.signedUrl,
            path: objectPath,
        };
        })
    );

    files.sort((a, b) => b.mtime - a.mtime);
    return NextResponse.json(
      { ok: true, files },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    if (e?.message?.includes("Unauthenticated")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("list error", e);
    return NextResponse.json({ ok: false, error: e?.message || "list failed" }, { status: 500 });
  }
}
