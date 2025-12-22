import { NextRequest, NextResponse } from "next/server";
import { pathfixProxyCall, SOCIAL_TO_PATHFIX_PROVIDER } from "@/lib/pathfix";
import { DatabaseService } from "@/lib/database";

// Best-effort endpoints for connection probing per provider.
// Success indicates a valid token for that userId in Pathfix.
const ME_ENDPOINTS: Record<string, { url: string; method: "GET" | "POST" } > = {
  twitter: { url: "https://api.twitter.com/2/users/me", method: "GET" },
  facebook: { url: "https://graph.facebook.com/v17.0/me", method: "GET" },
  instagram: { url: "https://graph.facebook.com/v17.0/me", method: "GET" }, // IG often via FB Graph; refined later
  linkedin: { url: "https://api.linkedin.com/v2/userinfo", method: "GET" },
  youtube: { url: "https://www.googleapis.com/oauth2/v2/userinfo", method: "GET" },
  // Add more as we validate scopes
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, platforms } = body as { userId: string; platforms?: string[] };

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const targets = (platforms && platforms.length > 0 ? platforms : Object.keys(SOCIAL_TO_PATHFIX_PROVIDER));

    const results: Record<string, { connected: boolean; profile?: any; error?: string }> = {};

    for (const platform of targets) {
      const providerRef = SOCIAL_TO_PATHFIX_PROVIDER[platform];
      if (!providerRef) {
        results[platform] = { connected: false, error: "unknown platform mapping" };
        continue;
      }

      const me = ME_ENDPOINTS[platform];
      if (!me) {
        // If we don't have a probe endpoint yet, skip marking connected
        results[platform] = { connected: false, error: "probe endpoint not configured" };
        continue;
      }

      const res = await pathfixProxyCall({
        providerRef,
        userId,
        url: me.url,
        method: me.method,
      });

      if (res.ok) {
        // Persist a lightweight social_accounts row to reflect connection
        try {
          const profile = (res.data as any) || {};
          const username = profile?.username || profile?.name || profile?.data?.name || undefined;
          const platformUserId = profile?.id || profile?.sub || profile?.data?.id || undefined;

          await DatabaseService.saveSocialAccount({
            user_id: userId,
            platform,
            platform_user_id: platformUserId,
            username,
            access_token: "pathfix-proxy",
            refresh_token: undefined,
            token_expires_at: undefined,
            is_active: true,
          } as any);

          results[platform] = { connected: true, profile };
        } catch (e: any) {
          results[platform] = { connected: true, error: `saved-with-warning: ${e?.message || e}` };
        }
      } else {
        results[platform] = { connected: false, error: res.error || `status ${res.status}` };
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 });
  }
}
