// Alias route for generated agent execution to maintain parity with original Lovable repo
// This re-exports the existing implementation mounted under /api/lovable/execute-agent
// Generated preview HTML posts to /api/execute-generated-agent; without this alias it 404s.
export { POST, OPTIONS } from "@/external/lovable-for-ai-agents/app/api/execute-generated-agent/route";
