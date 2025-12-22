// Creative Studio - Get/Delete Single Project API
// GET /api/studio/projects/[id]
// DELETE /api/studio/projects/[id]
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const hasDb = !!process.env.DATABASE_URL;
const sql = hasDb ? neon(process.env.DATABASE_URL!) : null as any;
const memoryProjectsGlobal: any[] = (globalThis as any).__studio_memory_projects__ ||= [];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Get actual user_id from session/auth
    const user_id = "00000000-0000-0000-0000-000000000000";
    const projectId = params.id;

    if (!hasDb) {
      const proj = memoryProjectsGlobal.find(p => p.id === projectId && p.user_id === user_id);
      if (!proj) {
        return NextResponse.json({ error: 'Project not found (offline store)' }, { status: 404 });
      }
      return NextResponse.json(proj, { status: 200 });
    }

    const result = await sql`
      SELECT *
      FROM studio_projects
      WHERE id = ${projectId}::uuid AND user_id = ${user_id}::uuid
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0], { status: 200 });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Get actual user_id from session/auth
    const user_id = "00000000-0000-0000-0000-000000000000";
    const projectId = params.id;

    if (!hasDb) {
      const idx = memoryProjectsGlobal.findIndex(p => p.id === projectId && p.user_id === user_id);
      if (idx === -1) {
        return NextResponse.json({ error: 'Project not found (offline store)' }, { status: 404 });
      }
      const removed = memoryProjectsGlobal.splice(idx, 1)[0];
      return NextResponse.json({ message: 'Project deleted successfully', id: removed.id }, { status: 200 });
    }

    const result = await sql`
      DELETE FROM studio_projects
      WHERE id = ${projectId}::uuid AND user_id = ${user_id}::uuid
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Project deleted successfully", id: result[0].id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      { error: "Failed to delete project", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
