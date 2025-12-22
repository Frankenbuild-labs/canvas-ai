import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Initiates Twitter (X) OAuth2 PKCE authorization flow.
// Fixes: cookies were not returned previously; `secure` cookies blocked on localhost; using x.com endpoint.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const platform = url.searchParams.get('platform') || 'twitter'
  if (platform !== 'twitter') {
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
  }

  const clientId = process.env.TWITTER_CLIENT_ID
  const redirectUri = process.env.TWITTER_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Twitter client env not set' }, { status: 500 })
  }

  // PKCE code verifier (RFC 7636 recommends high-entropy random URL-safe string 43-128 chars)
  const raw = crypto.getRandomValues(new Uint8Array(32))
  const codeVerifier = Buffer.from(raw).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier))
  const codeChallenge = Buffer.from(digest).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
  const state = crypto.getRandomValues(new Uint32Array(1))[0].toString(36)

  // Scopes required for posting & refresh
  const scope = 'tweet.read tweet.write users.read offline.access'

  // Use twitter.com authorize endpoint (x.com sometimes triggers generic error for some app configs)
  // Use the exact configured redirect URI; X requires exact match.
  const authorizeUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&code_challenge=${codeChallenge}&code_challenge_method=S256`

  // Set cookies (avoid secure on localhost so they persist)
  const isProd = process.env.NODE_ENV === 'production'
  const resp = NextResponse.json({ redirectUrl: authorizeUrl })
  // Debug log (will appear in server console) for troubleshooting "Something went wrong" page
  console.log('[twitter/auth/start] generated state', state, 'verifier.length', codeVerifier.length, 'challenge.length', codeChallenge.length)
  console.log('[twitter/auth/start] authorizeUrl', authorizeUrl)
  resp.cookies.set('tw_code_verifier', codeVerifier, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' })
  resp.cookies.set('tw_oauth_state', state, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' })
  // Ensure a stable device_id exists so callback and main tab map to same user
  const existingDevice = cookies().get('device_id')?.value
  if (!existingDevice) {
    const devId = `dev-${Math.random().toString(36).slice(2, 10)}`
    resp.cookies.set('device_id', devId, { httpOnly: false, secure: isProd, sameSite: 'lax', path: '/' })
    console.log('[twitter/auth/start] set device_id', devId)
  }
  return resp
}
