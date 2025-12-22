## Embedded VS Code Web

The Integration Container (sandbox panel) now embeds a real `code-server` / VS Code Web instance running on port **3100**.

> New: You can also embed an external ii-agent sandbox (browser/code/terminal environment) into the second tab (Sandbox) of the integration container.

### ii-Agent Sandbox Embed
Add the environment variable (in `.env.local` or `.env`):

```env
NEXT_PUBLIC_IIAGENT_URL=http://localhost:3000/
```

When you open the right-side panel and switch to the "Sandbox" tab, Canvas will attempt to load:
```
${NEXT_PUBLIC_IIAGENT_URL}?embed=1
```
The ii-agent frontend (modified) will suppress its own chat + header in this mode and render only the workspace tabs.

If the iframe shows a loader or unreachable state:
* Ensure the ii-agent frontend container is running and accessible at the configured URL.
* Confirm the site does not set `X-Frame-Options: DENY` or a restrictive `Content-Security-Policy` that blocks embedding.
* Update `NEXT_PUBLIC_IIAGENT_URL` and restart the dev server.

### Minimal Local Usage

1. Start (or ensure) VS Code Web is running on 3100. Examples:

   Using existing code-server install:
   ```powershell
   code-server --bind-addr 127.0.0.1:3100 --auth none .
   ```

   Or Docker (optional):
   ```powershell
   docker run --rm -it -p 3100:8080 -e AUTH=none -v "$PWD:/home/coder/project" codercom/code-server:4.91.1 --bind-addr 0.0.0.0:8080 /home/coder/project
   ```

2. Run the Next.js dev server:
   ```powershell
   pnpm dev
   ```

3. Open http://localhost:3000 and toggle the Integration Container. You should see VS Code Web load (with extensions panel available).

If the panel shows a loader or unreachable state:
* Confirm http://127.0.0.1:3100 opens directly in your browser.
* Check no auth prompt (use `--auth none` locally).
* Restart the dev server if you changed `.env.local`.

### Changing the URL
Update `NEXT_PUBLIC_VSCODE_URL` in `.env.local` if you want another port or remote instance.

### Installing Extensions
Inside the embedded VS Code Web, open the Extensions view and install any web‑compatible extension. They persist in the code-server data directory (or the mounted volume if using Docker).

### Docling MCP Health Check
- Ensure you have the project Python environment configured and Docling MCP installed (`uvx --from=docling-mcp docling-mcp-server --help`).
- Run `pnpm exec tsx scripts/check-docling.ts` to verify the Docling MCP server launches and advertises its tools.
- The check runs Docling from an isolated `.docling-runtime` folder so the server ignores your app `.env` and avoids validation errors from unrelated variables.


# Social Media Management Platform

A comprehensive social media management platform with AI-powered content creation, scheduling, and multi-platform posting capabilities.

## Features

- **Multi-Platform Support**: Connect and post to Instagram, X (Twitter), TikTok, Facebook, LinkedIn, and YouTube
- **AI Content Generation**: Multiple AI agents for content creation, research, and optimization
- **Content Scheduling**: Calendar-based scheduling with visual timeline
- **AI Influencer**: Create AI personas for automated content generation
- **Real-time Collaboration**: Chat-based interface for content planning
- **Voice & TTS Studio** ⭐ NEW: Production-ready text-to-speech system with:
  - 800+ pre-made voices in 40+ languages
  - Voice cloning (upload 30-second samples)
  - Batch TTS generation (up to 50 paragraphs)
  - Multi-speaker dialogue support
  - Emotion controls & speed adjustment
  - Waveform audio player with download
  - Free tier (2,500 chars/month) + BYOK support
  - Real-time streaming for voice agents
  - See `docs/VOICE_SETUP.md` for full documentation

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Social media platform developer accounts for OAuth integration

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd social-media-platform
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

4. Configure your environment variables (see [Environment Variables](#environment-variables) section)

5. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

### Required Variables

Create a `.env.local` file with the following variables:

#### Core Services
\`\`\`env
# Google AI (Required for AI agents)
GOOGLE_API_KEY=your_google_ai_api_key

# Application URL (Required for OAuth redirects)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
\`\`\`


#### Social Media Platform OAuth Credentials

##### Instagram
- LiveKit token endpoint: `app/api/livekit/token/route.ts`
- Meeting UI: `app/video-meeting/page.tsx`
- Recording endpoints: `app/api/recordings/*`
- Agent settings (per meeting): `components/video-meeting/AgentSettings.tsx`
- Save agent config into room metadata: `app/api/livekit/room/agent/route.ts`

Environment variables required for LiveKit:

- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `NEXT_PUBLIC_LIVEKIT_URL` (client WebSocket URL, e.g. wss://<project>.livekit.cloud)

Optional agent integrations:

- Beyond Presence: set `BEYOND_API_KEY` and provide an avatar ID (optional). See https://docs.bey.dev/get-started/agents
- LLM provider (OpenAI): `OPENAI_API_KEY`

Notes:

- Agent settings are stored in the LiveKit room metadata under the `agents` key. Your LiveKit Agent worker can watch for metadata changes and join the room using the configured behavior. See LiveKit Agent starter: https://github.com/livekit-examples/agent-starter-react
- If you're using Beyond Presence's speech-to-video integration, run the worker from their example repo and configure it to connect to your LiveKit Cloud project. The metadata written by this app is designed to be easy to consume by that worker.
\`\`\`env
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
\`\`\`

##### X (Twitter)
\`\`\`env
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
\`\`\`

##### TikTok
\`\`\`env
TIKTOK_CLIENT_ID=your_tiktok_client_id
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
\`\`\`

##### Facebook
\`\`\`env
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
\`\`\`

##### LinkedIn
\`\`\`env
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
\`\`\`

##### YouTube
\`\`\`env
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
\`\`\`

### Optional Variables
\`\`\`env
# OpenAI (Alternative AI provider)
OPENAI_API_KEY=your_openai_api_key

# Composio (Workflow automation)
COMPOSIO_API_KEY=your_composio_api_key
\`\`\`

## Social Media Platform Setup

### Instagram
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app and add Instagram Basic Display product
3. Configure OAuth redirect URI: `{NEXT_PUBLIC_BASE_URL}/api/auth/social/instagram`
4. Copy Client ID and Client Secret to your `.env.local`

### X (Twitter)
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app with OAuth 2.0 enabled
3. Configure callback URL: `{NEXT_PUBLIC_BASE_URL}/api/auth/social/twitter`
4. Copy Client ID and Client Secret to your `.env.local`

### TikTok
1. Go to [TikTok Developers](https://developers.tiktok.com/)
2. Create a new app and enable Login Kit
3. Configure redirect URI: `{NEXT_PUBLIC_BASE_URL}/api/auth/social/tiktok`
4. Copy Client Key and Client Secret to your `.env.local`

### Facebook
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app and add Facebook Login product
3. Configure OAuth redirect URI: `{NEXT_PUBLIC_BASE_URL}/api/auth/social/facebook`
4. Copy App ID and App Secret to your `.env.local`

### LinkedIn
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app and request access to required APIs
3. Configure OAuth 2.0 redirect URL: `{NEXT_PUBLIC_BASE_URL}/api/auth/social/linkedin`
4. Copy Client ID and Client Secret to your `.env.local`

### YouTube
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project and enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Configure authorized redirect URI: `{NEXT_PUBLIC_BASE_URL}/api/auth/social/youtube`
5. Copy Client ID and Client Secret to your `.env.local`

## Usage

### Connecting Social Media Accounts

1. Navigate to the Social Station page
2. Click on any unconnected social media platform icon
3. Complete the OAuth flow in the popup window
4. The account will show as connected with a green checkmark

### Creating and Scheduling Posts

1. Select connected accounts by clicking on them (they'll show a teal ring when selected)
2. Choose content type (Post, Story, Reel)
3. Upload media (images or videos) if desired
4. Write your post content
5. Choose to either:
   - **Post Now**: Immediately publish to selected platforms
   - **Schedule**: Set a future date/time for publishing
   - **Save Draft**: Save for later editing

### AI Influencer Setup

1. Switch to the "Influencer" tab in the right panel
2. Configure your AI influencer's:
   - Name and personality description
   - Tone (friendly, professional, casual, etc.)
   - Creativity level (0-100%)
   - Post frequency
3. Save the configuration
4. Use "Generate Sample Post" to test the AI influencer

## API Routes

### Authentication
- `GET /api/auth/social/[platform]` - OAuth flow for social media platforms
- `POST /api/social/connect` - Initiate platform connection

### Content Management
- `POST /api/social/post` - Publish content immediately
- `POST /api/social/schedule` - Schedule content for later
- `GET /api/social/drafts` - Retrieve saved drafts

### AI Agents
- `POST /api/chat/agent` - Main AI agent for content creation
- `POST /api/chat/researcher` - Research-focused AI agent
- `POST /api/chat/executive` - Strategic planning AI agent
- `POST /api/chat/vibe` - Creative content AI agent

### Voice (SignalWire) Scaffold
- Minimal, disabled-by-default integration to support click-to-call via SignalWire.
- Docs: `docs/VOICE_SIGNALWIRE_README.md`
- Try page: `/voice/dial` (requires server env configuration).

### Documents Panel: Self-hosted OnlyOffice Embeds
- Configure these env vars in `.env.local` to enable Docs/Sheets/PDF embeds using your own OnlyOffice Document Server:
   - `NEXT_PUBLIC_ONLYOFFICE_DOCSERVER_URL` (e.g., https://docs.yourdomain.com)
   - `NEXT_PUBLIC_ONLYOFFICE_DOC_URL` (public or signed URL to a .docx)
   - `NEXT_PUBLIC_ONLYOFFICE_SHEET_URL` (public or signed URL to a .xlsx)
   - `NEXT_PUBLIC_ONLYOFFICE_PDF_URL` (public or signed URL to a .pdf)

Implementation details:
- We load `${DOCSERVER_URL}/web-apps/apps/api/documents/api.js` and instantiate `DocsAPI.DocEditor` per tab.
- For production, add a backend endpoint to mint JWT-signed editor configs and a `callbackUrl` to persist changes (see OnlyOffice Document Server docs for JWT and callbacks).


## Development
### Agent Maestro (Roo) Integration: Removed

The Roo (Agent Maestro) sidecar integration has been fully removed. All `/api/chat/roo/*` routes now return HTTP 410 Gone intentionally. The embedded VS Code experience remains available and is not connected to any agent.

Current agents and routes:
- Vibe agent: `POST /api/chat/vibe` (Gemini 2.5‑flash)
- CRM agent: `POST /api/agents/crm/chat` (OpenAI‑first with Gemini fallback)

If you see references to the sidecar in older docs or comments, they are historical and no longer applicable. There is no configuration required for Roo. Set `NEXT_PUBLIC_VSCODE_URL` to embed your own code-server or OpenVSCode server if desired.


### Project Structure
\`\`\`
├── app/
│   ├── api/                 # API routes
│   │   ├── auth/social/     # OAuth authentication
│   │   ├── social/          # Social media operations
│   │   └── chat/            # AI agent endpoints
│   ├── social-station/      # Main social media interface
│   └── components/          # Reusable UI components
├── components/ui/           # shadcn/ui components
└── lib/                     # Utility functions
\`\`\`

### Adding New Platforms

1. Add platform configuration to `OAUTH_CONFIGS` in `/app/api/auth/social/[platform]/route.ts`
2. Implement platform-specific posting function in `/app/api/social/post/route.ts`
3. Add platform to `SOCIAL_PLATFORMS` array in `/app/social-station/page.tsx`
4. Update environment variable documentation

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Update `NEXT_PUBLIC_BASE_URL` to your production domain
4. Update OAuth redirect URIs in all platform developer consoles

### Docker

\`\`\`bash
docker build -t social-media-platform .
docker run -p 3000:3000 --env-file .env.local social-media-platform
\`\`\`

## Security Considerations

- Never commit `.env.local` or any files containing API keys
- Use environment variables for all sensitive configuration
- Implement proper token storage and refresh mechanisms for production
- Consider implementing rate limiting for API endpoints
- Validate and sanitize all user inputs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Your License Here]

## Support

For support, please open an issue on GitHub or contact [your-email@example.com].
\`\`\`

```env file="" isHidden
