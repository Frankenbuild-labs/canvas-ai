import { NextRequest } from "next/server"
import { getPrisma } from "../../../../lib/prisma"
import { getLeadgenFeatures } from "../../../../lib/feature-flags"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  const prisma = getPrisma()
  const features = getLeadgenFeatures()

  const brightdata = {
    token: !!process.env.BRIGHTDATA_API_TOKEN,
    endpoint: !!(process.env.BRIGHTDATA_LEADS_ENDPOINT || process.env.BRIGHTDATA_ENDPOINT),
    enabled: features.brightdata,
  }

  const db = { connected: false }
  try {
    if (prisma) {
      await prisma.$queryRaw`SELECT 1` // simple connectivity check
      db.connected = true
    }
  } catch (e: any) {
    db.connected = false
  }

  return new Response(JSON.stringify({
    ok: db.connected && (!brightdata.enabled || (brightdata.token && brightdata.endpoint)),
    db,
    features,
    brightdata
  }), { status: 200 })
}
