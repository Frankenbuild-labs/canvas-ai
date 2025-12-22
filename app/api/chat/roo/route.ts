/** Roo Integration Removed: All requests return 410 Gone intentionally. */
export async function POST() {
  return new Response(JSON.stringify({ error: "Agent Maestro (Roo) integration removed" }), { status: 410 })
}


