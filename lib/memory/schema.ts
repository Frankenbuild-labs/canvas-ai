export type MemoryKind =
  | "research"
  | "document"
  | "edit"
  | "image"
  | "open"
  | "note"
  | "file";

export interface MemoryBase {
  id: string;
  kind: MemoryKind;
  userId: string; // device or auth user id
  sessionId?: string;
  timestamp: number; // ms epoch
  // Optional grouping tags for containers/projects/users (aligns with supermemory "containerTags")
  containerTags?: string[];
  // Optional arbitrary metadata for richer contexts
  metadata?: Record<string, unknown>;
}

export interface ResearchMemory extends MemoryBase {
  kind: "research";
  query: string;
  answerExcerpt?: string;
  sources?: Array<{ url: string; title?: string }>; // deduped list
  images?: Array<{ url: string; sourcePage?: string; caption?: string }>;
  relatedDocId?: string;
}

export interface DocumentMemory extends MemoryBase {
  kind: "document";
  docId: string;
  title?: string;
  docType?: string; // docx | xlsx | pdf | pptx
  url: string;
  version?: string;
}

export interface EditMemory extends MemoryBase {
  kind: "edit";
  docId: string;
  action: string; // e.g., insert-table, insert-chart, format, edit
  resultUrl?: string;
}

export interface ImageMemory extends MemoryBase {
  kind: "image";
  docId?: string;
  url: string;
  sourcePage?: string;
  caption?: string;
}

export interface OpenMemory extends MemoryBase {
  kind: "open";
  docId: string;
}

export interface NoteMemory extends MemoryBase {
  kind: "note";
  title?: string;
  text: string;
  tags?: string[];
}

export interface FileMemory extends MemoryBase {
  kind: "file";
  filename: string;
  url: string; // public URL under /memory-uploads
  size?: number;
  mime?: string;
  docId?: string; // optionally associate with a document
}

export type MemoryEntry =
  | ResearchMemory
  | DocumentMemory
  | EditMemory
  | ImageMemory
  | OpenMemory
  | NoteMemory
  | FileMemory;
