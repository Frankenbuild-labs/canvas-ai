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


# Social Media Management Platform

A comprehensive social media management platform with AI-powered content creation, scheduling, and multi-platform posting capabilities.

## Features

- **Multi-Platform Support**: Connect and post to Instagram, X (Twitter), TikTok, Facebook, LinkedIn, and YouTube
- **AI Content Generation**: Multiple AI agents for content creation, research, and optimization
- **Content Scheduling**: Calendar-based scheduling with visual timeline
- **AI Influencer**: Create AI personas for automated content generation
- **Real-time Collaboration**: Chat-based interface for content planning

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

## Development
### Roo / Agent Maestro Integration (Production-Ready Core)

The Vibe agent button now drives a **real** Roo (Agent Maestro) task. All mock / simulated fallback streaming has been **removed**. If the sidecar is not reachable you will get a 5xx error—this is intentional so production misconfiguration is never masked.

Current request flow:
1. Front-end issues a POST to `/api/chat/roo` with `{ message }`.
2. The API route streams raw SSE events from the sidecar (`/roo/task`).
3. On `taskCreated` the UI stores the `taskId`.
4. Subsequent follow‑up / approval interactions go through:
    - `POST /api/chat/roo/message` (continuation / follow-up)
    - `POST /api/chat/roo/action` (approve / reject)

Supporting status probe:
`GET /api/chat/roo/status` checks env + basic reachability and returns JSON diagnostic notes.

#### Bring Up Sidecar via Docker Compose

`docker-compose.yml` now contains a `roo-sidecar` service placeholder:
```yaml
roo-sidecar:
   image: ghcr.io/roo-ai/agent-maestro:latest
   ports:
      - "23333:23333"
   environment:
      - PORT=23333
      - LOG_LEVEL=info
```

Start everything:
```powershell
docker compose up -d --build
pnpm dev
```

Then set in `.env.local`:
```env
ROO_SIDECAR_URL=http://localhost:23333/api/v1
```

Restart the Next.js dev server after changing env variables.

#### VS Code / Extension Requirements
Ensure the Roo Code extension is installed inside the embedded `code-server` (or whichever VS Code instance the sidecar inspects). Open the Extensions panel in the embedded editor and install it if missing.

#### Streaming Event Shape (Passthrough)
The backend does not reinterpret events; it forwards them. The UI currently extracts:
- `message` events with JSON `{ text, partial }`
- `taskCreated` (captures `taskId`)
- `taskCompleted`
- Follow-up ask events flagged via upstream payload (`ask === 'followup'`) to show approve / reject buttons.

#### Configuration API
Persisted (file-backed) config lives at `GET/POST /api/chat/roo/config` with fields:
```json
{ "model": "string", "temperature": "string", "autoApprove": true|false, "updatedAt": "iso-date" }
```
The task creation & follow-up routes inject `model` and `temperature`. If `autoApprove` is true the UI will automatically invoke the primary follow-up action when Roo asks for a follow-up.

#### Health & Status Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/api/chat/roo/status` | Lightweight reachability + task create probe (basic) |
| `/api/chat/roo/health` | Aggregated: reachability, task probe, config snapshot, timings |

#### Troubleshooting
| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| 500/502 on `/api/chat/roo` | Sidecar not running or wrong `ROO_SIDECAR_URL` | Verify container running, curl sidecar base, fix env, restart dev server |
| Status `reachable: false` | Port not exposed / firewall | Check compose port mapping, ensure no host collision |
| No follow-up buttons | Upstream never emitted follow-up ask | Check sidecar logs for ask generation |
| Stream stops abruptly | Sidecar closed SSE | Inspect sidecar logs, confirm task not erroring |

#### SSE Robustness
The chat client includes a heartbeat / timeout guard (15s heartbeat, 45s timeout). If no chunks arrive within the timeout it aborts the stream to avoid hanging UI state.

#### Implemented Enhancements
- Real-only sidecar (no mock fallback).
- Config persistence API (`/api/chat/roo/config`).
- Auto-approve follow-ups (optional via config).
- SSE timeout guard.
- Health endpoint (`/api/chat/roo/health`).

#### Remaining / Future (Deferred)
- Rich visualization for reasoning / tools.
- Multi-tenant config storage (DB) & auth.
- Raw event debug viewer toggle.
- Structured error telemetry export.


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
