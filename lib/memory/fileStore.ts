import { promises as fs } from "fs";
import path from "path";
import { MemoryEntry } from "./schema";

const MEM_DIR = path.join(process.cwd(), "data", "memory");
const MEM_FILE = path.join(MEM_DIR, "memory.jsonl");

async function ensureDir() {
  await fs.mkdir(MEM_DIR, { recursive: true }).catch(() => {});
}

export async function appendMemory(entry: MemoryEntry): Promise<void> {
  await ensureDir();
  const line = JSON.stringify(entry) + "\n";
  await fs.appendFile(MEM_FILE, line, "utf-8");
}

export async function readAllMemory(): Promise<MemoryEntry[]> {
  try {
    const raw = await fs.readFile(MEM_FILE, "utf-8");
    const lines = raw.split("\n").filter(Boolean);
    const result: MemoryEntry[] = [];
    for (const l of lines) {
      try {
        result.push(JSON.parse(l));
      } catch {
        // Skip malformed lines instead of failing the entire route
        continue;
      }
    }
    return result;
  } catch (e: any) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

export function now(): number {
  return Date.now();
}

export async function writeAllMemory(entries: MemoryEntry[]): Promise<void> {
  await ensureDir();
  const data = entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "");
  await fs.writeFile(MEM_FILE, data, "utf-8");
}
