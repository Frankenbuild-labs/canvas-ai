import { NextRequest, NextResponse } from "next/server"
import { insertLeads, createList } from "@/lib/crm-supabase"
import { getUserIdFromRequest } from "@/lib/auth-next"

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req as any)
    const { items, listName } = await req.json()
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 })
    }

    // Normalize incoming items from BulkUploadDialog into the DB lead shape
    const normalized = (items as any[])
      .map((raw) => {
        const rawName = String(raw.name || "").trim()
        const email = String(raw.email || "").trim()
        const rawCompany = String(raw.company || "").trim()
        // Require at least an email; fall back name/company if missing
        if (!email) {
          return null
        }
        const name = rawName || email
        const company = rawCompany || "Unknown Company"
        const valueRaw = raw.value
        const value =
          valueRaw === undefined || valueRaw === null || valueRaw === ""
            ? 0
            : Number(valueRaw)

        return {
          name,
          email,
          phone: raw.phone ? String(raw.phone) : undefined,
          company,
          position: raw.position ? String(raw.position) : undefined,
          status: String(raw.status || "new"),
          value: isNaN(value) ? 0 : value,
          source: raw.source ? String(raw.source) : "CSV Import",
          notes: raw.notes ? String(raw.notes) : undefined,
          last_contact: raw.lastContact ? String(raw.lastContact) : undefined,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    if (normalized.length === 0) {
      return NextResponse.json({ error: "No valid leads found in upload" }, { status: 400 })
    }

    const created = await insertLeads(userId, normalized as any)
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
