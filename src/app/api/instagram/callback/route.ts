import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FB_API = 'https://graph.facebook.com/v21.0'

/**
 * GET /api/instagram/callback
 * Handles the OAuth redirect from Facebook after user authorizes.
 * Exchanges the code for tokens, fetches Instagram account info, stores in DB.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error) {
    return NextResponse.redirect(`${appUrl}/instagram?error=${encodeURIComponent('Authorization was cancelled or denied.')}`)
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/instagram?error=${encodeURIComponent('No authorization code received.')}`)
  }

  const appId = process.env.FACEBOOK_APP_ID!
  const appSecret = process.env.FACEBOOK_APP_SECRET!
  const callbackUrl = `${appUrl}/api/instagram/callback`

  try {
    // ── Step 1: Exchange code for short-lived user access token ──────────────
    const tokenRes = await fetch(`${FB_API}/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: callbackUrl,
        code,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error?.message || 'Failed to get access token')
    }
    const shortLivedToken: string = tokenData.access_token

    // ── Step 2: Exchange for long-lived token (60 days) ──────────────────────
    const longTokenRes = await fetch(
      `${FB_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`
    )
    const longTokenData = await longTokenRes.json()
    if (!longTokenRes.ok || !longTokenData.access_token) {
      throw new Error(longTokenData.error?.message || 'Failed to get long-lived token')
    }
    const longLivedToken: string = longTokenData.access_token
    // expires_in is in seconds (typically ~5183944 = 60 days)
    const expiresInSecs: number = longTokenData.expires_in ?? 5183944
    const tokenExpiry = new Date(Date.now() + expiresInSecs * 1000).toISOString()

    // ── Step 3: Get Facebook user ID ─────────────────────────────────────────
    const meRes = await fetch(`${FB_API}/me?fields=id,name&access_token=${longLivedToken}`)
    const meData = await meRes.json()
    const fbUserId: string = meData.id

    // ── Step 4: Get Facebook Pages this user manages ─────────────────────────
    const pagesRes = await fetch(`${FB_API}/${fbUserId}/accounts?access_token=${longLivedToken}`)
    const pagesData = await pagesRes.json()
    const pages: Array<{ id: string; name: string; access_token: string }> = pagesData.data ?? []

    if (pages.length === 0) {
      throw new Error('No Facebook Pages found. You need a Facebook Page connected to your Instagram Business or Creator account.')
    }

    // ── Step 5: Find Instagram Business Account from Pages ───────────────────
    let igUserId: string | null = null
    let igUsername: string | null = null
    let igProfilePic: string | null = null
    let pageAccessToken: string | null = null

    for (const page of pages) {
      const igRes = await fetch(
        `${FB_API}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      )
      const igData = await igRes.json()

      if (igData.instagram_business_account?.id) {
        igUserId = igData.instagram_business_account.id
        pageAccessToken = page.access_token

        // Fetch IG profile details
        const profileRes = await fetch(
          `${FB_API}/${igUserId}?fields=username,profile_picture_url,followers_count&access_token=${pageAccessToken}`
        )
        const profileData = await profileRes.json()
        igUsername = profileData.username ?? null
        igProfilePic = profileData.profile_picture_url ?? null
        break
      }
    }

    if (!igUserId) {
      throw new Error(
        'No Instagram Business or Creator account found connected to your Facebook Page. ' +
        'Please convert your Instagram account to Business/Creator and connect it to a Facebook Page.'
      )
    }

    // ── Step 6: Save to Supabase ─────────────────────────────────────────────
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.redirect(`${appUrl}/login?next=/instagram`)
    }

    const { error: upsertError } = await supabase
      .from('instagram_credentials')
      .upsert({
        user_id: user.id,
        ig_username: igUsername ?? igUserId,
        ig_user_id: igUserId,
        access_token: longLivedToken,
        token_expiry: tokenExpiry,
        ig_profile_pic: igProfilePic,
        // Clear old password-based fields
        ig_password: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertError) {
      throw new Error(`Database error: ${upsertError.message}`)
    }

    return NextResponse.redirect(`${appUrl}/instagram?connected=true`)

  } catch (err: any) {
    console.error('[instagram/callback] Error:', err)
    return NextResponse.redirect(
      `${appUrl}/instagram?error=${encodeURIComponent(err.message ?? 'Unknown error during Instagram connection.')}`
    )
  }
}
