# LiveKit Video Meeting Setup

This app now uses LiveKit for the video meeting at `/video-meeting`.

## What changed
- Jitsi embed was removed.
- LiveKit Components are used on the client.
- A server API mints secure access tokens.

Files:
- `app/video-meeting/page.tsx` – LiveKit UI (`<LiveKitRoom><VideoConference/></LiveKitRoom>`)
- `app/api/livekit/token/route.ts` – server-minted token endpoint

## Required environment variables
Add these to your `.env.local` (or deployment env):

- `NEXT_PUBLIC_LIVEKIT_URL` – your LiveKit server URL. Example: `wss://your-livekit-host` (must be wss/http(s) per your deployment; for Cloud use the given wss URL).
- `LIVEKIT_API_KEY` – API key from your LiveKit deployment.
- `LIVEKIT_API_SECRET` – API secret from your LiveKit deployment.

The `/api/livekit/token` endpoint reads these variables and returns `{ token, url }` used by the client.

## Run locally
1. Ensure dependencies are installed (already added to package.json):
   - `@livekit/components-react`
   - `@livekit/components-styles`
   - `livekit-client`
   - `livekit-server-sdk`
2. Create `.env.local` with the three variables above.
3. Start the app and open `http://localhost:3002/video-meeting`.

If you self-host LiveKit, ensure your server is reachable from the client (publicly or via your network/VPN) and uses TLS for `wss://` connections.

## Troubleshooting
- 403/401 joining room: Check API key/secret and that the token has `roomJoin`, `canPublish`, and `canSubscribe` (already configured in the token route).
- Failed to connect: Verify `NEXT_PUBLIC_LIVEKIT_URL` is correct and reachable; if self-hosted, open the appropriate ports and provide valid TLS.
- No camera/mic: Browser permissions must be granted; check site permissions and system privacy settings.

## Notes
- LiveKit styles are imported in the page via `@livekit/components-styles`.
- The room name defaults to `canvas-room`; update the query param in `page.tsx` if you need multiple rooms.
