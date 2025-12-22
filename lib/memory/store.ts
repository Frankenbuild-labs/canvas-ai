import { MemoryEntry, MemoryKind } from "./schema"
import { FileMemoryStore } from "./store-file"

export interface ListParams {
  userId: string
  kind?: MemoryKind
  limit?: number
  containerTags?: string[]
}

export interface SearchParams {
  userId: string
  q: string
  kind?: MemoryKind
  containerTags?: string[]
  limit?: number
}

export interface DeleteParams {
  userId: string
  id: string
}

export interface DeleteResult {
  ok: boolean
  deleted?: MemoryEntry
}

export interface MemoryStore {
  append(entry: MemoryEntry): Promise<void>
  list(params: ListParams): Promise<MemoryEntry[]>
  search(params: SearchParams): Promise<MemoryEntry[]>
  delete(params: DeleteParams): Promise<DeleteResult>
}

let _store: MemoryStore | null = null

export function getStore(): MemoryStore {
  if (_store) return _store
  const backend = (process.env.MEMORY_BACKEND || "file").toLowerCase()
  if (backend === "file") {
    _store = new FileMemoryStore()
    return _store as MemoryStore
  }
  // Future: postgres/pgvector backend
  _store = new FileMemoryStore()
  return _store as MemoryStore
}
