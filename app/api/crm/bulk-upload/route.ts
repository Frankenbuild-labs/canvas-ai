import { NextResponse } from "next/server"
import { insertLeads, createList } from "@/lib/crm-supabase"
import { DatabaseService } from "@/lib/database"

export async function POST(req: Request) {
  try {
    const userId = await DatabaseService.getOrCreateTestUser()
    const { items, listName } = await req.json()
    if (!Array.isArray(items)) return NextResponse.json({ error: "Invalid items" }, { status: 400 })

    const created = await insertLeads(userId, items)
    let list: { id: string; name: string } | undefined
    if (listName) {
      const lst = await createList(userId, String(listName), created.map((c) => c.id))
      list = { id: lst.id, name: lst.name }
    }

    return NextResponse.json({ created, list })
  } catch (error: any) {
    console.error('[BULK UPLOAD ERROR]', error)
    return NextResponse.json({ error: error.message || 'Failed to upload leads' }, { status: 500 })
  }
}
