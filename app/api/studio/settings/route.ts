// Creative Studio - User Settings API
// GET/POST /api/studio/settings
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// If no DATABASE_URL, operate in in-memory/local mode to avoid hard failures
const hasDb = !!process.env.DATABASE_URL;
const sql = hasDb ? neon(process.env.DATABASE_URL!) : null as any;
let memorySettings: any | null = null; // simple in-memory fallback

export async function GET(request: NextRequest) {
  try {
    // TODO: Get actual user_id from session/auth
    const user_id = "00000000-0000-0000-0000-000000000000";

    // If DB is not configured, return memory or default settings
    if (!hasDb) {
      if (!memorySettings) {
        memorySettings = {
          user_id,
          active_tab: "design",
          last_project_id: null,
          auto_save_enabled: true,
          auto_save_interval: 5000,
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return NextResponse.json(memorySettings, { status: 200 });
    }

    const result = await sql`
      SELECT *
      FROM studio_settings
      WHERE user_id = ${user_id}::uuid
    `;

    if (result.length === 0) {
      // Return default settings if none exist
      return NextResponse.json({
        user_id,
        active_tab: "design",
        last_project_id: null,
        auto_save_enabled: true,
        auto_save_interval: 5000,
        preferences: {},
      }, { status: 200 });
    }

    return NextResponse.json(result[0], { status: 200 });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      active_tab,
      last_project_id,
      auto_save_enabled,
      auto_save_interval,
      preferences,
    } = body;

    // TODO: Get actual user_id from session/auth
    const user_id = "00000000-0000-0000-0000-000000000000";

    // If DB is not configured, persist to memory for this process
    if (!hasDb) {
      const now = new Date().toISOString();
      memorySettings = {
        user_id,
        active_tab: active_tab || "design",
        last_project_id: last_project_id || null,
        auto_save_enabled: auto_save_enabled !== undefined ? auto_save_enabled : true,
        auto_save_interval: auto_save_interval || 5000,
        preferences: preferences || {},
        created_at: memorySettings?.created_at || now,
        updated_at: now,
      };
      return NextResponse.json(memorySettings, { status: 200 });
    }

    // Upsert settings in DB
    const result = await sql`
      INSERT INTO studio_settings (
        user_id,
        active_tab,
        last_project_id,
        auto_save_enabled,
        auto_save_interval,
        preferences
      ) VALUES (
        ${user_id}::uuid,
        ${active_tab || "design"},
        ${last_project_id || null}::uuid,
        ${auto_save_enabled !== undefined ? auto_save_enabled : true},
        ${auto_save_interval || 5000},
        ${JSON.stringify(preferences || {})}::jsonb
      )
      ON CONFLICT (user_id) DO UPDATE SET
        active_tab = EXCLUDED.active_tab,
        last_project_id = EXCLUDED.last_project_id,
        auto_save_enabled = EXCLUDED.auto_save_enabled,
        auto_save_interval = EXCLUDED.auto_save_interval,
        preferences = EXCLUDED.preferences,
        updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 200 });
  } catch (error) {
    console.error("Save settings error:", error);
    return NextResponse.json(
      { error: "Failed to save settings", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
