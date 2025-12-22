# Memory Foundation – Handoff Summary

This README captures exactly where we left the memory system so we can resume wiring later without re-discovery.

## Snapshot (as of now)

- Storage model
  - JSONL file store at `data/memory/memory.jsonl` (append-only).
  - Hardened reader skips malformed lines (prevents tab crashes).
  - Types extended with:
    - `containerTags?: string[]` for grouping (user/project/space) – aligns with SuperMemory.
    - `metadata?: Record<string, unknown>` for arbitrary context.

- Store abstraction
  - `lib/memory/store.ts` – MemoryStore interface + `getStore()` factory (default: file backend).
  - `lib/memory/store-file.ts` – file-backed implementation using existing read/append/write helpers.

- API routes (refactored to use MemoryStore)
  - `GET  /api/memory/list?kind=&limit=` – list entries (user-scoped).
  - `GET  /api/memory/search?q=&kind=` – substring search (user-scoped; backend-agnostic).
  - `GET  /api/memory/last-research` – last research entry.
  - `GET  /api/memory/current-document` – picks current by open/edit/document order.
  - `GET  /api/memory/images?docId=` – images for a doc or last research images.
  - `POST /api/memory/remember` – add memory; now accepts `containerTags` and `metadata`.
  - `POST /api/memory/upload` – persists under `/public/memory-uploads` and appends a `file` entry.
  - `DELETE /api/memory/delete?id=` – deletes entry; removes public file if applicable.
  - `POST /api/memory/vectors/search` – placeholder (501) with setup instructions.

- UI (Management Center)
  - `components/management-center/memory-tab.tsx`:
    - Fixed file chooser button.
    - Error messages displayed if listing fails.

- Orchestrator tools (agent-friendly)
  - File: `lib/mcp/orchestrator.ts`
  - Added tools (backed by MemoryStore):
    - `search_memories({ q, kind?, limit?, containerTags? })`
    - `add_memory({ text, kind?='note', title?, containerTags?, metadata? })`
    - `fetch_memory({ id })`
  - Constructor now supports `userId` and `sessionId` options for correct scoping.

## What is intentionally NOT done yet

- Database backend (Postgres + pgvector) and real vector search.
- Embeddings pipeline and chunking.
- Wiring `userId/sessionId` into orchestrator construction at call sites.
- Rich search filters/thresholds and re-ranking.

## How to resume quickly

1) Choose backend
- Keep file store (default) while shipping features.
- Or switch later via env:
  - `MEMORY_BACKEND=postgres`
  - `DATABASE_URL=postgresql://user:pass@host:port/db`

2) Enable embeddings and vector search (later)
- `EMBEDDING_PROVIDER=openai`
- `OPENAI_API_KEY=...`
- Implement `PgMemoryStore` and replace `/api/memory/vectors/search` 501 with real query logic.

3) Pass identity to orchestrator
- Where the `MCPOrchestrator` is instantiated, pass:
  - `{ userId: '<your-user-id>', sessionId: '<session-id>' }` so memory tools auto-scope.

4) Agent prompting (optional next step)
- Instruct when to use `search_memories` vs. `add_memory`, and how to use `containerTags` for per-project contexts.

## Minimal contracts to rely on

- Memory entry (extends by kind):
  - `{ id, kind, userId, sessionId?, timestamp, containerTags?, metadata?, ...kindFields }`
- Store API:
  - `append(entry)`
  - `list({ userId, kind?, limit?, containerTags? })`
  - `search({ userId, q, kind?, containerTags?, limit? })`
  - `delete({ userId, id })`

## Fast sanity checks

- Add a note
  - POST `/api/memory/remember` with:
    - `{ "kind":"note", "title":"Q4 goals", "text":"Ship memory tools", "containerTags":["user_123","project_memory"] }`
- List notes
  - GET `/api/memory/list?kind=note&limit=50`
- Search
  - GET `/api/memory/search?q=memory&kind=note`
- Vector endpoint (placeholder)
  - POST `/api/memory/vectors/search` → returns 501 with setup tips.

## Files touched in this phase

- `lib/memory/fileStore.ts` – reader hardened.
- `lib/memory/schema.ts` – `containerTags`, `metadata` added.
- `lib/memory/store.ts` – interface + factory.
- `lib/memory/store-file.ts` – file-backed store.
- `lib/memory/embeddings.ts` – provider skeleton.
- `app/api/memory/*` – refactored to store abstraction; vectors endpoint added.
- `components/management-center/memory-tab.tsx` – UX/error improvements.
- `lib/mcp/orchestrator.ts` – new memory tools; user/session support.

---
This doc is a handoff checkpoint. When ready, pick the next item (DB + vectors, or wiring user/session + prompts) and we can proceed without rework.