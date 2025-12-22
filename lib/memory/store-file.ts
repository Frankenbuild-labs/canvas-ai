import { appendMemory, readAllMemory, writeAllMemory } from "./fileStore"
import { MemoryEntry, MemoryKind } from "./schema"
import type { DeleteParams, DeleteResult, ListParams, MemoryStore, SearchParams } from "./store"

export class FileMemoryStore implements MemoryStore {
  async append(entry: MemoryEntry): Promise<void> {
    await appendMemory(entry)
  }

  async list(params: ListParams): Promise<MemoryEntry[]> {
    const { userId, kind, limit = 100, containerTags } = params
    const all = await readAllMemory()
    let mine = all.filter((e) => e.userId === userId)
    if (kind) mine = mine.filter((e) => e.kind === kind)
    if (containerTags && containerTags.length) {
      mine = mine.filter((e: any) => Array.isArray(e.containerTags) && e.containerTags.some((t: string) => containerTags.includes(t)))
    }
    return mine.sort((a, b) => b.timestamp - a.timestamp).slice(0, Math.max(1, Math.min(1000, limit)))
  }

  async search(params: SearchParams): Promise<MemoryEntry[]> {
    const { userId, q, kind, containerTags, limit = 100 } = params
    const all = await readAllMemory()
    let mine = all.filter((e) => e.userId === userId)
    if (kind) mine = mine.filter((e) => e.kind === kind)
    if (containerTags && containerTags.length) {
      mine = mine.filter((e: any) => Array.isArray(e.containerTags) && e.containerTags.some((t: string) => containerTags.includes(t)))
    }
    const ql = q.toLowerCase()
    const results = mine.filter((e: any) => JSON.stringify(e).toLowerCase().includes(ql))
    return results.sort((a, b) => b.timestamp - a.timestamp).slice(0, Math.max(1, Math.min(1000, limit)))
  }

  async delete(params: DeleteParams): Promise<DeleteResult> {
    const all = await readAllMemory()
    const idx = all.findIndex((e: any) => e.userId === params.userId && e.id === params.id)
    if (idx === -1) return { ok: false }
    const [deleted] = all.splice(idx, 1)
    await writeAllMemory(all as any)
    return { ok: true, deleted }
  }
}
