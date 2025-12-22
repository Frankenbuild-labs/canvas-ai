# Voice (SignalWire) Scaffold

This adds a minimal, SaaS-friendly click-to-call path using SignalWire Compatibility REST. It’s disabled until you set backend envs.

What’s included
- API to originate a call and an answer webhook that bridges to the contact.
  - `app/api/voice/sw/call/route.ts`
  - `app/api/voice/sw/answer/route.ts`
- Minimal helpers: `lib/voice/signalwire.ts`
- A simple Dial page: `app/voice/dial/page.tsx` with a contacts list and “Get a phone number” CTA.

Env (server-side)
- `SIGNALWIRE_SPACE_URL` (e.g. yourspace.signalwire.com)
- `SIGNALWIRE_PROJECT_ID`
- `SIGNALWIRE_API_TOKEN` (Project Token starting with PT...)
- `SIGNALWIRE_EMBED_TOKEN` (temporary: Call Widget/Embed token; replace with signed short‑lived token later)
- `SIGNALWIRE_SIGNING_KEY` (optional: PSK_... for future short‑lived token generation)
- `NEXT_PUBLIC_BASE_URL` (your app URL, used to build the answer webhook)

How it works
1) POST `/api/voice/sw/call` with `{ to, userDeviceNumber, fromNumber }`.
   - The server creates a call to `userDeviceNumber` with `Url` pointing to `/api/voice/sw/answer?contact=...`.
2) `/api/voice/sw/answer` returns Twilio-compatible XML to `<Say>` then `<Dial>` the contact.
   - This bridges the user and the contact.

Try it (dev)
1) Set envs in `.env.local`:
   - SIGNALWIRE_SPACE_URL=yourspace.signalwire.com
   - SIGNALWIRE_PROJECT_ID=...
   - SIGNALWIRE_API_TOKEN=PT_... (Project Token)
   - SIGNALWIRE_EMBED_TOKEN=... (Call Widget token; if you don’t have one yet, use the portal to create one)
   - SIGNALWIRE_SIGNING_KEY=PSK_... (optional, for later short‑lived token issuance)
   - NEXT_PUBLIC_BASE_URL=http://localhost:3010
2) Restart dev server.
3) Open `/voice/dial`.
4) Enter “Your Phone” (where you answer) and “From Number” (a purchased SignalWire number), then click Call on a contact.

Notes
- For MVP, users won’t paste keys—your SaaS will hold master credentials. The Dial page now auto-loads purchased numbers via `GET /api/voice/sw/numbers` and shows them in a dropdown. If none are found, it falls back to a manual input.
- WebRTC is not required for this path.
- Add rate limits and basic spending caps before production.

Troubleshooting outbound failures (422 `uri_does_not_resolve_to_address`)
- **Verify PSTN is enabled on the Call Widget token.** In the SignalWire Portal go to **Call Fabric → Click-to-Call → Tokens → Edit token** and ensure “External Calling (PSTN)” (a.k.a. “Allow PSTN”) is toggled on for the embed token whose value you placed in `SIGNALWIRE_EMBED_TOKEN`. Without that capability the widget refuses to dial PSTN destinations and surfaces the 422 you’re seeing.
- **Use a purchased or verified caller ID.** The `fromNumber` dropdown is populated from `/IncomingPhoneNumbers.json`. Pick one of those numbers (or paste a verified number added under Call Fabric → Numbers → Verified Caller IDs). SignalWire blocks PSTN calls if the caller ID is not on that list.
- **Keep host/token pairs aligned.** `SIGNALWIRE_SPACE_URL` must be the **same space** that issued the embed token, otherwise the widget’s `host` attribute points at the wrong realm and the call fails before routing. Example: if the token belongs to `canvasai.signalwire.com`, set `SIGNALWIRE_SPACE_URL=canvasai.signalwire.com`.
- **Double-check the destination format.** The UI normalizes to E.164, but if you override it manually ensure you enter `+15551234567`. Any other format returns `uri_is_invalid`/`uri_does_not_resolve_to_address`.
- **Test the account outside the widget.** From your dev box run `curl -u $SIGNALWIRE_PROJECT_ID:$SIGNALWIRE_API_TOKEN https://$SIGNALWIRE_SPACE_URL/api/laml/2010-04-01/Accounts/$SIGNALWIRE_PROJECT_ID/Calls.json -d To=+1... -d From=+1... -d Url=https://example.com/answer`. If this succeeds the issue is strictly widget token scope; if it fails the account or caller ID lacks PSTN permission.
- **Graduate to signed short-lived tokens when multi-tenant.** Populate `SIGNALWIRE_SIGNING_KEY` and update `/api/voice/sw/token` to mint per-tenant JWTs via `lib/voice/jwt.ts` so you can embed PSTN scope only for authorized tenants and rotate tokens automatically.

Webhooks
- Inbound SMS: point your SignalWire messaging webhook to `${NEXT_PUBLIC_BASE_URL}/api/voice/sw/sms/webhook`.
- Call Answer: the `POST /api/voice/sw/call` endpoint sets the answer URL automatically to `${NEXT_PUBLIC_BASE_URL}/api/voice/sw/answer`.

Short‑lived Call Widget tokens
- The current `/api/voice/sw/token` route returns `SIGNALWIRE_EMBED_TOKEN`. In production, replace it with a backend-signed, short‑lived token using `SIGNALWIRE_SIGNING_KEY` and user/tenant scopes.

Next steps
- Add `/api/voice/sw/numbers/search` and `/purchase` to let tenants buy numbers in-app using your master creds.
- Persist per-tenant “Your Phone” in profile settings for one-click calls.
