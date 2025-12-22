// Creative Studio - Save/Update Project API
// POST /api/studio/save
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const hasDb = !!process.env.DATABASE_URL;
const sql = hasDb ? neon(process.env.DATABASE_URL!) : null as any;
const memoryProjects: any[] = (globalThis as any).__studio_memory_projects__ ||= [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, scene_data, name, thumbnail } = body;

    // TODO: Get actual user_id from session/auth
    // For now, using a placeholder
    const user_id = "00000000-0000-0000-0000-000000000000";

    if (!type || !scene_data) {
      return NextResponse.json(
        { error: "Missing required fields: type, scene_data" },
        { status: 400 }
      );
    }

    if (type !== "design" && type !== "video") {
      return NextResponse.json(
        { error: "Invalid type. Must be 'design' or 'video'" },
        { status: 400 }
      );
    }

    let project;

    if (!hasDb) {
      // In-memory create/update for offline/local mode
      if (id) {
        const idx = memoryProjects.findIndex(p => p.id === id);
        if (idx === -1) {
          return NextResponse.json(
            { error: "Project not found (offline store)" },
            { status: 404 }
          );
        }
        memoryProjects[idx] = {
          ...memoryProjects[idx],
          name: name || memoryProjects[idx].name || "Untitled Project",
          scene_data,
          thumbnail: thumbnail || memoryProjects[idx].thumbnail || null,
          updated_at: new Date().toISOString(),
        };
        project = memoryProjects[idx];
      } else {
        const newProject = {
          id: crypto.randomUUID(),
          user_id: "00000000-0000-0000-0000-000000000000",
          name: name || "Untitled Project",
          type,
          scene_data,
          thumbnail: thumbnail || null,
          is_template: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        memoryProjects.unshift(newProject);
        project = newProject;
      }
      return NextResponse.json(project, { status: 200 });
    }

    if (id) {
      // Update existing project
      const result = await sql`
        UPDATE studio_projects
        SET 
          name = ${name || "Untitled Project"},
          scene_data = ${scene_data},
          thumbnail = ${thumbnail || null},
          updated_at = NOW()
        WHERE id = ${id}::uuid AND user_id = ${user_id}::uuid
        RETURNING *
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 404 }
        );
      }

      project = result[0];
    } else {
      // Create new project
      const result = await sql`
        INSERT INTO studio_projects (
          user_id,
          name,
          type,
          scene_data,
          thumbnail,
          is_template
        ) VALUES (
          ${user_id}::uuid,
          ${name || "Untitled Project"},
          ${type},
          ${scene_data},
          ${thumbnail || null},
          false
        )
        RETURNING *
      `;

      project = result[0];
    }

    return NextResponse.json(project, { status: 200 });
  } catch (error) {
    console.error("Save project error:", error);
    return NextResponse.json(
      { error: "Failed to save project", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
