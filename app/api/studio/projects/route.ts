// Creative Studio - Get All Projects API
// GET /api/studio/projects
import { NextRequest, NextResponse } from "next/server";
// Uses request.url/searchParams and may access DB; mark dynamic to avoid static prerender
export const dynamic = 'force-dynamic'
import { neon } from "@neondatabase/serverless";

const hasDb = !!process.env.DATABASE_URL;
const sql = hasDb ? neon(process.env.DATABASE_URL!) : null as any;
// re-use the array created in save route if module caching persists, else keep a local
const memoryProjectsGlobal: any[] = (globalThis as any).__studio_memory_projects__ ||= [];

export async function GET(request: NextRequest) {
  try {
    // TODO: Get actual user_id from session/auth
    const user_id = "00000000-0000-0000-0000-000000000000";

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // Optional filter by type

    let projects;

    if (!hasDb) {
      const base = memoryProjectsGlobal.filter(p => p.user_id === user_id);
      projects = (type && (type === 'design' || type === 'video')) ? base.filter(p => p.type === type) : base;
      // Sort desc by updated_at
      projects = projects.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .map(p => ({ id: p.id, name: p.name, type: p.type, thumbnail: p.thumbnail, updated_at: p.updated_at, created_at: p.created_at }));
      return NextResponse.json(projects, { status: 200 });
    }

    if (type && (type === "design" || type === "video")) {
      projects = await sql`
        SELECT 
          id,
          name,
          type,
          thumbnail,
          updated_at,
          created_at
        FROM studio_projects
        WHERE user_id = ${user_id}::uuid AND type = ${type}
        ORDER BY updated_at DESC
      `;
    } else {
      projects = await sql`
        SELECT 
          id,
          name,
          type,
          thumbnail,
          updated_at,
          created_at
        FROM studio_projects
        WHERE user_id = ${user_id}::uuid
        ORDER BY updated_at DESC
      `;
    }

    return NextResponse.json(projects, { status: 200 });
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
