import { NextRequest } from "next/server"
import { getLeadgenFeatures } from "../../../../lib/feature-flags"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  const flags = getLeadgenFeatures()
  return new Response(JSON.stringify(flags), { status: 200 })
}
