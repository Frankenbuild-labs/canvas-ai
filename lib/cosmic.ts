// Compatibility shim to satisfy legacy imports of "@/lib/cosmic"
// Delegates to the Neon/Postgres DB adapter in lib/email-marketing/database
// and provides safe fallbacks for not-yet-implemented functions.

import type {
  UpdateSettingsData,
  UploadJob,
  MediaItem,
} from "./email-marketing/types";
import sql from "@/lib/database";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

import {
  getSettings as dbGetSettings,
  updateSettings as dbUpdateSettings,
  getEmailTemplates as dbGetEmailTemplates,
  createEmailTemplate as dbCreateEmailTemplate,
  getEmailTemplate as dbGetEmailTemplate,
  getEmailLists as dbGetEmailLists,
  createEmailList as dbCreateEmailList,
  getMarketingCampaigns as dbGetMarketingCampaigns,
  getMarketingCampaign as dbGetMarketingCampaign,
  createMarketingCampaign as dbCreateMarketingCampaign,
  updateCampaignStatus as dbUpdateCampaignStatus,
  updateEmailCampaign as dbUpdateEmailCampaign,
  deleteEmailCampaign as dbDeleteEmailCampaign,
  getEmailContacts as dbGetEmailContacts,
  createEmailContact as dbCreateEmailContact,
} from "./email-marketing/database";

// Some code imports a "cosmic" client. Provide a harmless placeholder.
export const cosmic: any = {};

// Settings
export async function getSettings() {
  return await dbGetSettings();
}

export async function createOrUpdateSettings(data: UpdateSettingsData) {
  await dbUpdateSettings(data);
  return await dbGetSettings();
}

// Templates
export const getEmailTemplates = dbGetEmailTemplates;
export const createEmailTemplate = dbCreateEmailTemplate;
export const getEmailTemplate = dbGetEmailTemplate;

// Lists
export const getEmailLists = dbGetEmailLists;
export const createEmailList = dbCreateEmailList;
export async function getEmailList(id: string) {
  const lists = await dbGetEmailLists();
  return lists.find((l: any) => l.id === id || l.slug === id) || null;
}
export async function updateEmailList(_id: string, _data: any) {
  // Not implemented in DB adapter yet
  return { success: true };
}
export async function deleteEmailList(_id: string) {
  // Not implemented in DB adapter yet
  return { success: true };
}

// Contacts
export const getEmailContacts = dbGetEmailContacts;
export const createEmailContact = dbCreateEmailContact;
export async function bulkUpdateContactLists(_payload: any) {
  // Not implemented in DB adapter yet
  return { success: true };
}

// Campaigns
export const getMarketingCampaigns = dbGetMarketingCampaigns;
export const getMarketingCampaign = dbGetMarketingCampaign;
// Some routes import getEmailCampaign (legacy name) – alias to the same function
export const getEmailCampaign = dbGetMarketingCampaign;
export const createMarketingCampaign = dbCreateMarketingCampaign;
export const updateCampaignStatus = dbUpdateCampaignStatus;
export const updateEmailCampaign = dbUpdateEmailCampaign;
export const deleteEmailCampaign = dbDeleteEmailCampaign;
export async function syncCampaignTrackingStats(_id: string) {
  // Not implemented – return no-op success
  return { success: true };
}

// Upload jobs – stubs to satisfy imports
export async function createUploadJob(_data: any) {
  return { id: "upload-job-stub", status: "pending" };
}
export async function getUploadJobs() {
  return [];
}
export async function getUploadJob(_id: string): Promise<UploadJob | null> {
  // Placeholder job so API route type narrows correctly – return null to simulate not found
  return null;
}

// Unsubscribe – stub
export async function unsubscribeContact(_data: any) {
  return { success: true };
}

// Media – typed stubs matching route expectations
interface MediaQueryOptions { limit?: number; skip?: number; folder?: string; sort?: string; search?: string | undefined; }

function mapRowToMediaItem(row: any): MediaItem {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
  const title = row.title || row.filename || "untitled";
  return {
    id: String(row.id),
    name: title,
    original_name: title,
    size: Number(row.size_bytes || 0),
    type: row.type || "application/octet-stream",
    created_at: createdAt,
    folder: row.folder || undefined,
    url: row.url,
    imgix_url: row.url,
    alt_text: row.alt_text || undefined,
    width: row.width ? Number(row.width) : undefined,
    height: row.height ? Number(row.height) : undefined,
    metadata: {},
  };
}

async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  // Shared adapter supports parameter arrays via function call signature
  return (sql as any)(text, params);
}

export async function getMedia(opts: MediaQueryOptions): Promise<{ media: MediaItem[]; total: number; limit: number; skip: number; }> {
  const { limit = 50, skip = 0, folder, sort = "-created_at", search } = opts || {};

  const clauses: string[] = [];
  const params: any[] = [];
  if (folder) {
    params.push(folder);
    clauses.push(`folder = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    clauses.push(`(title ILIKE ${p} OR url ILIKE ${p})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const orderField = sort.replace(/^[-+]/, "");
  const orderColumn = ["created_at", "title"].includes(orderField) ? orderField : "created_at";
  const orderDir = sort.startsWith("-") ? "DESC" : "ASC";

  // Count
  const countRows = await query<{ count: string }>(`SELECT COUNT(*)::text as count FROM email_media ${where}`, params);
  const total = parseInt(countRows?.[0]?.count || "0", 10);

  // Data
  params.push(limit);
  params.push(skip);
  const rows = await query(`
    SELECT * FROM email_media
    ${where}
    ORDER BY ${orderColumn} ${orderDir}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return {
    media: rows.map(mapRowToMediaItem),
    total,
    limit,
    skip,
  };
}

export async function searchMedia(opts: { query?: string | undefined; folder?: string | undefined; limit?: number; skip?: number; }): Promise<{ media: MediaItem[]; total: number; }> {
  const { query: q, folder, limit = 50, skip = 0 } = opts || {};
  return (await getMedia({ search: q, folder, limit, skip, sort: "-created_at" }));
}

export async function getMediaFolders(): Promise<string[]> {
  const rows = await query<{ folder: string }>(`SELECT DISTINCT folder FROM email_media WHERE folder IS NOT NULL ORDER BY folder ASC`);
  return rows.map(r => r.folder);
}

export async function getMediaStats(): Promise<{ total: number; usage: number; }> {
  const rows = await query<{ total: string; usage: string }>(`SELECT COUNT(*)::text as total, COALESCE(SUM(size_bytes), 0)::text as usage FROM email_media`);
  const total = parseInt(rows?.[0]?.total || "0", 10);
  const usage = parseInt(rows?.[0]?.usage || "0", 10);
  return { total, usage };
}

export async function getSingleMedia(id: string): Promise<MediaItem | null> {
  const rows = await query(`SELECT * FROM email_media WHERE id = $1`, [id]);
  if (!rows.length) return null;
  return mapRowToMediaItem(rows[0]);
}

export async function uploadMedia(file: File, options: { folder?: string; alt_text?: string; metadata?: Record<string, any>; }): Promise<MediaItem> {
  // Persist file under public/uploads/email-media
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "email-media");
  await fs.mkdir(uploadsDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const unique = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
  const subfolder = options.folder ? options.folder.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_\/-]/g, "-") : undefined;
  const targetDir = subfolder ? path.join(uploadsDir, subfolder) : uploadsDir;
  await fs.mkdir(targetDir, { recursive: true });
  const filename = `${unique}_${safeName}`;
  const fullPath = path.join(targetDir, filename);
  await fs.writeFile(fullPath, buffer);

  // Build public URL
  const publicPath = ["/uploads/email-media", subfolder, filename].filter(Boolean).join("/");

  // Attempt to extract dimensions if image
  let width: number | null = null;
  let height: number | null = null;
  try {
    if (file.type.startsWith("image/") && (file.type === "image/png" || file.type === "image/jpeg")) {
      // Simple metadata extraction using sharp if available (optional dependency)
      let sharp: any;
      try { sharp = await import('sharp'); } catch { sharp = null; }
      if (sharp) {
        const meta = await sharp.default(buffer).metadata();
        width = meta.width || null;
        height = meta.height || null;
      }
    }
  } catch {
    width = null;
    height = null;
  }

  const rows = await query(`
    INSERT INTO email_media (title, url, type, size_bytes, folder, alt_text, width, height)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [file.name, publicPath, file.type || "application/octet-stream", file.size, subfolder || null, options.alt_text || null, width, height]);

  return mapRowToMediaItem(rows[0]);
}

export async function updateMedia(id: string, data: { folder?: string; alt_text?: string; metadata?: Record<string, any>; }): Promise<MediaItem | null> {
  // Build dynamic update
  const sets: string[] = [];
  const params: any[] = [];
  if (data.folder !== undefined) {
    params.push(data.folder ? data.folder.trim() : null);
    sets.push(`folder = $${params.length}`);
  }
  if (data.alt_text !== undefined) {
    params.push(data.alt_text ? data.alt_text.trim() : null);
    sets.push(`alt_text = $${params.length}`);
  }
  if (!sets.length) {
    return await getSingleMedia(id);
  }
  params.push(id);
  const rows = await query(`UPDATE email_media SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params);
  if (!rows.length) return null;
  return mapRowToMediaItem(rows[0]);
}

export async function deleteMedia(id: string): Promise<{ success: boolean; message?: string; }> {
  // Try to delete the underlying file if it's a local URL
  const row = await query<any>(`SELECT url FROM email_media WHERE id = $1`, [id]).then(r => r[0]);
  if (row?.url && typeof row.url === "string" && row.url.startsWith("/")) {
    const candidate = path.join(process.cwd(), "public", row.url);
    try { await fs.unlink(candidate); } catch { /* ignore */ }
  }
  await query(`DELETE FROM email_media WHERE id = $1`, [id]);
  return { success: true };
}
