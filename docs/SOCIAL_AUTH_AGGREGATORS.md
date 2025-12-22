# Social OAuth Aggregators: Pick the right one (no more creating individual apps)

This doc compares battle‑tested options to handle social connections without you setting up a separate dev app for each network.

## TL;DR
- Social posting/scheduling across many networks, zero provider app setup: choose Ayrshare.
- Generic OAuth across many SaaS APIs (not just social), with hosted keys and proxy: choose Pathfix.
- Managed OAuth infra when you still want to call raw provider APIs yourself (often bring-your-own keys, but has shared apps on cloud): choose Nango Cloud.

## Option A: Ayrshare (best for Social Station)
- What it is: A unified Social Media API for posting, scheduling, analytics, comments, DMs, and webhooks.
- Why it fits: They handle the provider OAuth, tokens, and maintenance. Your users connect their social accounts in Ayrshare’s hosted portal; you post via a single API.
- Supported: X/Twitter, Facebook Pages, Instagram Business (via FB), LinkedIn, TikTok, YouTube, Pinterest, Reddit, Telegram, Google Business, Threads, Bluesky, etc.
- Dev experience:
  - Create a "User Profile" via API → receive `user_key`.
  - Redirect user to Ayrshare Connections UI to link their accounts.
  - Post via `POST /api/post` with the `user_key` and list of platforms.
  - Webhooks for status updates and schedules.
- Pros:
  - No per‑network app registration.
  - Deep feature set for social use cases (scheduling, analytics, comments/DM, review mgmt).
  - Saves months of maintenance and approval processes.
- Cons:
  - Paid SaaS (Business plan for multiple users).
  - Vendor lock‑in for social features (acceptable for speed to market).

## Option B: Pathfix (hosted OAuth proxy for 300+ providers)
- What it is: Fully managed OAuth + request proxy. They host the provider apps, you never create your own. After auth, you call provider endpoints via Pathfix.
- Why it fits: If you need broad connectors beyond social (CRMs, mail, storage, etc.) and don’t want to own any OAuth apps.
- Pros:
  - No provider apps. Handles token storage/refresh.
  - Works with any API supporting OAuth.
- Cons:
  - You still implement per‑provider API logic for posting, scheduling, etc. (unified API is on you).
  - Cost + egress via proxy.

## Option C: Nango Cloud (managed OAuth + proxy + syncs)
- What it is: Integration infra: managed OAuth, request proxy, data syncs, webhooks, observability.
- Why it fits: If you want to retain raw control over APIs and mappings, and you’re OK setting up some provider apps (Cloud offers some shared apps, varies by provider).
- Pros:
  - Great infra and dashboards; open‑source core, cloud convenience.
- Cons:
  - For social posting, you still code the platform specifics unless you add a unified layer.

## Recommendation
For Social Station’s immediate goals (click icon → authenticate → post/schedule without setting up provider apps), integrate Ayrshare first. If/when you need broader SaaS connectors, add Pathfix or Nango for those.

## Integration Plan (Ayrshare)
1) Create Ayrshare account (Business plan recommended).
2) Generate API Key in Ayrshare dashboard.
3) In our app:
   - Server: create a user profile via Ayrshare API and store the returned `user_key` mapped to our user.
   - UI: when the user clicks a platform icon, open Ayrshare’s Connections UI for that `user_key`.
   - Posting: send to Ayrshare `POST /api/post` with content + platforms; store returned IDs.
   - Webhooks: add an endpoint to receive post status and schedule events.
4) Migrate existing per‑provider OAuth UI to display connected status from Ayrshare (rather than our DB tokens).

### Minimal Env
- `AYRSHARE_API_KEY=` (server‑side)
- `AYRSHARE_WEBHOOK_SECRET=` (optional, if validating webhooks)

### Data We Store
- `ayr_user_key` per CanvasAI user.
- Optional: post history mirror, schedules, and analytics for faster UI. Source of truth remains Ayrshare.

### Security Notes
- API key is server‑only.
- Validate webhooks with Ayrshare’s signature/secret.
- Rate limit UI actions; debounce multi‑post.

## Pathfix/Nango Plan (if chosen instead)
- Add `PATHFIX_CLIENT_ID/SECRET` or `NANGO_SECRET_KEY`.
- Use their Connect UI to gather tokens; store connection IDs.
- Proxy subsequent API calls through their gateway.
- Build/maintain per‑network logic for posting/scheduling.

## Rollout Strategy
- Phase 1: Ayrshare behind a feature flag; connect flow + “send test post” sandbox.
- Phase 2: Replace existing per‑platform connects in Social Station; keep legacy hidden.
- Phase 3: Webhooks + analytics; scheduling UI parity.
- Phase 4: Optional: Add Pathfix/Nango for non‑social integrations.

## Links
- Ayrshare Developers: https://www.ayrshare.com/developers/ and Docs: https://www.ayrshare.com/docs
- Pathfix OAuth Platform: https://pathfix.com/ and Docs: https://docs.pathfix.com/
- Nango Docs: https://www.nango.dev/docs
