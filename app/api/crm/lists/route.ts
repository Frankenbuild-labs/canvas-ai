import { NextRequest, NextResponse } from "next/server"
import { createList, deleteList, listListsWithMembers } from "@/lib/crm-supabase"
import { getUserIdFromRequest } from "@/lib/auth-next"

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req as any)
    const lists = await listListsWithMembers(userId)
    return NextResponse.json({ lists })
  } catch (e: any) {
    console.error('CRM lists GET failed:', e)
    return NextResponse.json({ lists: [] }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req as any)
    const { name, leadIds } = await req.json()
    if (!name || !Array.isArray(leadIds)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }
    const lst = await createList(userId, name, leadIds)
    return NextResponse.json({ list: lst })
  } catch (e: any) {
    console.error('CRM lists POST failed:', e)
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req as any)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    await deleteList(userId, id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('CRM lists DELETE failed:', e)
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 })
  }
}
