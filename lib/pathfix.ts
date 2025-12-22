import { NextRequest } from "next/server";

const BASE_URL = process.env.PATHFIX_BASE_URL || "https://labs.pathfix.com";
const PUBLIC_KEY = process.env.PATHFIX_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.PATHFIX_PRIVATE_KEY || "";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export function buildPathfixConnectPageUrl(params: {
  userId: string;
  providersCsv?: string; // comma-separated provider reference names (per Pathfix dashboard). Optional.
  headerText?: string;
  subHeaderText?: string;
  style?: "list" | "list-panel" | "list-columns";
}): string {
  const { userId, providersCsv, headerText, subHeaderText, style } = params;
  const url = new URL("/integrate/page", BASE_URL);
  if (!PUBLIC_KEY) {
    // Return a placeholder with instructions if unset
    return "";
  }
  url.searchParams.set("public_key", PUBLIC_KEY);
  url.searchParams.set("user_id", userId);
  if (providersCsv) url.searchParams.set("providers", providersCsv);
  if (headerText) url.searchParams.set("header", headerText);
  if (subHeaderText) url.searchParams.set("sub_header", subHeaderText);
  if (style) url.searchParams.set("style", style);
  return url.toString();
}

export async function pathfixProxyCall<T = unknown>(params: {
  providerRef: string; // e.g., "twitter", "facebook", etc. Must match Pathfix provider reference.
  userId: string;
  url: string; // full provider API endpoint
  method: HttpMethod;
  payload?: any;
  headers?: Record<string, string>;
}): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const { providerRef, userId, url, method, payload, headers } = params;
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    return { ok: false, status: 500, error: "Pathfix keys not configured" };
  }
  const endpoint = `${BASE_URL}/oauth/method/${encodeURIComponent(providerRef)}/call`;
  const callUrl = new URL(endpoint);
  callUrl.searchParams.set("user_id", userId);
  callUrl.searchParams.set("public_key", PUBLIC_KEY);
  callUrl.searchParams.set("private_key", PRIVATE_KEY);

  const res = await fetch(callUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, method, payload: payload ?? {}, headers: headers ?? {} }),
    // Pathfix is external; no credentials
  });

  const status = res.status;
  try {
    const data = (await res.json()) as T;
    return { ok: res.ok, status, data, error: res.ok ? undefined : (data as any)?.error || "Proxy call failed" };
  } catch (e) {
    const text = await res.text();
    return { ok: res.ok, status, error: text || "Proxy call failed" };
  }
}

// Basic platform mapping. Verify exact references in Pathfix dashboard and adjust as needed.
export const SOCIAL_TO_PATHFIX_PROVIDER: Record<string, string> = {
  twitter: "twitter",
  instagram: "instagram",
  facebook: "facebook",
  linkedin: "linkedin",
  tiktok: "tiktok",
  youtube: "youtube",
  pinterest: "pinterest",
  reddit: "reddit",
  telegram: "telegram",
  threads: "threads",
  bluesky: "bluesky",
};
