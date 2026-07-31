import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FB_API = 'https://graph.facebook.com/v21.0'

/**
 * POST /api/instagram/refresh
 * Refreshes the user's long-lived token, resetting the 60-day clock.
 * Safe to call anytime — Instagram won't penalise early refreshes.
 */
export async function POST(_request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: creds } = await supabase
    .from('instagram_credentials')
    .select('access_token')
    .eq('user_id', user.id)
    .single()

  if (!creds?.access_token) {
    return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })
  }

  try {
    const appId = process.env.FACEBOOK_APP_ID!
    const appSecret = process.env.FACEBOOK_APP_SECRET!

    const refreshRes = await fetch(
      `${FB_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${creds.access_token}`
    )
    const data = await refreshRes.json()

    if (!refreshRes.ok || !data.access_token) {
      throw new Error(data.error?.message || 'Token refresh failed')
    }

    const expiresInSecs: number = data.expires_in ?? 5183944
    const tokenExpiry = new Date(Date.now() + expiresInSecs * 1000).toISOString()

    await supabase
      .from('instagram_credentials')
      .update({ access_token: data.access_token, token_expiry: tokenExpiry, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return NextResponse.json({ success: true, token_expiry: tokenExpiry })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
