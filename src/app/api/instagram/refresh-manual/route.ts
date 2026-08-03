import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const IG_GRAPH = 'https://graph.instagram.com'

/**
 * POST /api/instagram/refresh-manual
 *
 * User-triggered token refresh (called from the "Renew Token" button).
 * Uses the authenticated user's session to identify which token to refresh.
 *
 * Unlike /api/instagram/refresh (cron), this requires user authentication
 * and refreshes only the calling user's token.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Read token via admin client (bypasses RLS for access_token column)
  const adminDb = createAdminClient()
  const { data: conn, error: dbError } = await adminDb
    .from('instagram_connections')
    .select('id, access_token, token_expires_at')
    .eq('user_id', user.id)
    .single()

  if (dbError || !conn?.access_token) {
    return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })
  }

  try {
    const refreshUrl = new URL(`${IG_GRAPH}/refresh_access_token`)
    refreshUrl.searchParams.set('grant_type', 'ig_refresh_token')
    refreshUrl.searchParams.set('access_token', conn.access_token)

    const refreshRes = await fetch(refreshUrl.toString())
    const data = await refreshRes.json()

    if (!refreshRes.ok || !data.access_token) {
      throw new Error(data.error?.message || 'Token refresh failed')
    }

    const expiresInSecs: number = data.expires_in ?? 5184000
    const tokenExpiresAt = new Date(Date.now() + expiresInSecs * 1000).toISOString()

    const { error: updateError } = await adminDb
      .from('instagram_connections')
      .update({
        access_token: data.access_token,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conn.id)

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    return NextResponse.json({ success: true, token_expires_at: tokenExpiresAt })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
