import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const IG_API = 'https://api.instagram.com'
const IG_GRAPH = 'https://graph.instagram.com'

/**
 * GET /api/instagram/callback
 *
 * Handles the OAuth redirect from Instagram after user authorizes.
 * Uses the "Instagram Login" (Business Login) flow:
 *
 * 1. Exchange code → short-lived token via api.instagram.com/oauth/access_token
 * 2. Exchange short-lived → long-lived token via graph.instagram.com/access_token
 * 3. Fetch user profile via graph.instagram.com/v21.0/me
 * 4. Upsert into instagram_connections
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorReason = searchParams.get('error_reason')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // ── Handle user denial ────────────────────────────────────────────────────
  if (error) {
    const msg = errorReason || error || 'Authorization was cancelled or denied.'
    return NextResponse.redirect(
      `${appUrl}/instagram?error=${encodeURIComponent(msg)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/instagram?error=${encodeURIComponent('No authorization code received.')}`
    )
  }

  const clientId = process.env.INSTAGRAM_APP_ID!
  const clientSecret = process.env.INSTAGRAM_APP_SECRET!
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI!

  try {
    // ── Verify the user is authenticated ──────────────────────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.redirect(`${appUrl}/login?next=/instagram`)
    }

    // ── Step 1: Exchange code for short-lived token ──────────────────────────
    // POST https://api.instagram.com/oauth/access_token
    // Content-Type: application/x-www-form-urlencoded
    const tokenRes = await fetch(`${IG_API}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      const errMsg = tokenData.error_message || tokenData.error?.message || 'Failed to exchange code for token'
      console.error('[instagram/callback] Token exchange error:', tokenData)
      throw new Error(errMsg)
    }

    const shortLivedToken: string = tokenData.access_token
    // tokenData also has: user_id (the IG user ID) and permissions
    const igUserIdFromToken: string = String(tokenData.user_id)

    // ── Step 2: Exchange for long-lived token (60 days) ─────────────────────
    // GET https://graph.instagram.com/access_token
    //   ?grant_type=ig_exchange_token
    //   &client_secret=...
    //   &access_token=...
    const longTokenUrl = new URL(`${IG_GRAPH}/access_token`)
    longTokenUrl.searchParams.set('grant_type', 'ig_exchange_token')
    longTokenUrl.searchParams.set('client_secret', clientSecret)
    longTokenUrl.searchParams.set('access_token', shortLivedToken)

    const longTokenRes = await fetch(longTokenUrl.toString())
    const longTokenData = await longTokenRes.json()

    if (!longTokenRes.ok || !longTokenData.access_token) {
      const errMsg = longTokenData.error?.message || 'Failed to exchange for long-lived token'
      console.error('[instagram/callback] Long-lived token error:', longTokenData)
      throw new Error(errMsg)
    }

    const longLivedToken: string = longTokenData.access_token
    // expires_in is in seconds (typically ~5183944 ≈ 60 days)
    const expiresInSecs: number = longTokenData.expires_in ?? 5184000
    const tokenExpiresAt = new Date(Date.now() + expiresInSecs * 1000).toISOString()

    // ── Step 3: Fetch Instagram user profile ─────────────────────────────────
    // GET https://graph.instagram.com/v21.0/me?fields=user_id,username
    const meUrl = new URL(`${IG_GRAPH}/v21.0/me`)
    meUrl.searchParams.set('fields', 'user_id,username')
    meUrl.searchParams.set('access_token', longLivedToken)

    const meRes = await fetch(meUrl.toString())
    const meData = await meRes.json()

    if (!meRes.ok) {
      console.error('[instagram/callback] /me error:', meData)
      throw new Error(meData.error?.message || 'Failed to fetch Instagram profile')
    }

    const igUserId: string = meData.user_id || igUserIdFromToken
    const igUsername: string | null = meData.username ?? null

    // ── Step 4: Upsert into instagram_connections ────────────────────────────
    // Use admin client (service role) to bypass RLS for insert/update
    const adminDb = createAdminClient()

    const { error: upsertError } = await adminDb
      .from('instagram_connections')
      .upsert(
        {
          user_id: user.id,
          ig_user_id: igUserId,
          ig_username: igUsername,
          access_token: longLivedToken,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      console.error('[instagram/callback] Upsert error:', upsertError)
      throw new Error(`Database error: ${upsertError.message}`)
    }

    console.log(`[instagram/callback] Connected @${igUsername} (${igUserId}) for user ${user.id}`)
    return NextResponse.redirect(`${appUrl}/instagram?connected=true`)

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during Instagram connection.'
    console.error('[instagram/callback] Error:', err)
    return NextResponse.redirect(
      `${appUrl}/instagram?error=${encodeURIComponent(message)}`
    )
  }
}
