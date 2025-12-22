import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { DatabaseService } from '@/lib/database'
import { encryptToken } from '@/lib/auth-utils'

// Handles Twitter OAuth2 callback: exchanges code for access & refresh tokens and stores them.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  if (error) {
    return NextResponse.json({ error })
  }
  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code/state' }, { status: 400 })
  }
  const cookieStore = cookies()
  const expectedState = cookieStore.get('tw_oauth_state')?.value
  const codeVerifier = cookieStore.get('tw_code_verifier')?.value
  if (!expectedState || state !== expectedState || !codeVerifier) {
    return NextResponse.json({ error: 'State or verifier mismatch' }, { status: 400 })
  }
  const clientId = process.env.TWITTER_CLIENT_ID
  const clientSecret = process.env.TWITTER_CLIENT_SECRET
  const redirectUri = process.env.TWITTER_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: 'Twitter client env missing' }, { status: 500 })
  }
  try {
    // For a Confidential client X expects a Basic auth header (client_id:client_secret)
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId, // still required in body for PKCE on X
      code_verifier: codeVerifier,
    })
    const tokenResp = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: form,
    })
    const rawText = await tokenResp.text()
    let tokenData: any = {}
    try { tokenData = JSON.parse(rawText) } catch { tokenData = { raw: rawText } }
    if (!tokenResp.ok) {
      console.error('[twitter/auth/callback] token exchange failed', tokenResp.status, rawText)
      return NextResponse.json({ error: tokenData?.error || 'Token exchange failed', details: tokenData }, { status: 400 })
    }
    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    // Retrieve user id via twitter users/me endpoint
    let twitterUserId: string | null = null
    try {
      const meResp = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const meData = await meResp.json().catch(()=>({}))
      twitterUserId = meData?.data?.id || null
    } catch {}
    // Use device_id cookie to map local user (fallback default)
    // Use cookie device_id only to avoid redirect_uri mismatches
    const localDeviceId = cookieStore.get('device_id')?.value || 'default'
    const localUserId = await DatabaseService.getOrCreateComposioUserIdForDevice(localDeviceId) // reuse existing ID infra
    console.log('[twitter/auth/callback] resolved identity', { localDeviceId, localUserId, twitterUserId })
    // Persist account (encrypt tokens)
    try {
      const saved = await DatabaseService.saveSocialAccount({
        user_id: localUserId,
        platform: 'twitter',
        platform_user_id: twitterUserId,
        username: null,
        access_token: encryptToken(accessToken),
        refresh_token: refreshToken ? encryptToken(refreshToken) : null,
        token_expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        is_active: true,
      } as any)
      console.log('[twitter/auth/callback] saved social account', { id: saved?.id, user_id: saved?.user_id, platform: saved?.platform })
    } catch (e) {
      return NextResponse.json({ error: 'Failed to persist twitter account', details: String(e) }, { status: 500 })
    }
    // Clear PKCE cookies. Use absolute URL (Next 14 app routes require absolute in middleware-style redirects)
    const origin = new URL(request.url).origin
    // Include success flag for UI logic
    const redirectTarget = `${origin}/social-station?connected=twitter&success=true`
    const resp = NextResponse.redirect(redirectTarget)
    resp.cookies.set('tw_code_verifier', '', { path: '/', maxAge: 0 })
    resp.cookies.set('tw_oauth_state', '', { path: '/', maxAge: 0 })
    return resp
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Twitter callback error' }, { status: 500 })
  }
}
