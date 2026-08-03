import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const IG_GRAPH = 'https://graph.instagram.com'

/**
 * GET /api/instagram/refresh
 *
 * Vercel Cron handler — runs daily to refresh Instagram long-lived tokens
 * that are within 10 days of expiring.
 *
 * Protected by CRON_SECRET in the Authorization header.
 * Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` for cron invocations.
 *
 * For each expiring token:
 *   GET https://graph.instagram.com/refresh_access_token
 *     ?grant_type=ig_refresh_token
 *     &access_token=<current_long_lived_token>
 *
 * Returns a new long-lived token (60 days from now).
 */
export async function GET(request: NextRequest) {
  // ── Verify cron secret ──────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[instagram/refresh] CRON_SECRET not configured')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminDb = createAdminClient()

  // ── Find tokens expiring within 10 days ─────────────────────────────────
  const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()

  const { data: expiringConnections, error: queryError } = await adminDb
    .from('instagram_connections')
    .select('id, user_id, ig_username, access_token, token_expires_at')
    .lt('token_expires_at', tenDaysFromNow)

  if (queryError) {
    console.error('[instagram/refresh] Query error:', queryError)
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  if (!expiringConnections || expiringConnections.length === 0) {
    return NextResponse.json({
      message: 'No tokens need refreshing',
      checked_at: new Date().toISOString(),
    })
  }

  // ── Refresh each token ──────────────────────────────────────────────────
  const results: Array<{
    user_id: string
    ig_username: string | null
    status: 'refreshed' | 'failed'
    error?: string
    new_expiry?: string
  }> = []

  for (const conn of expiringConnections) {
    try {
      const refreshUrl = new URL(`${IG_GRAPH}/refresh_access_token`)
      refreshUrl.searchParams.set('grant_type', 'ig_refresh_token')
      refreshUrl.searchParams.set('access_token', conn.access_token)

      const refreshRes = await fetch(refreshUrl.toString())
      const refreshData = await refreshRes.json()

      if (!refreshRes.ok || !refreshData.access_token) {
        const errMsg = refreshData.error?.message || 'Token refresh failed'
        console.error(
          `[instagram/refresh] Failed for @${conn.ig_username} (user ${conn.user_id}):`,
          refreshData
        )
        results.push({
          user_id: conn.user_id,
          ig_username: conn.ig_username,
          status: 'failed',
          error: errMsg,
        })
        continue
      }

      // Update token in database
      const expiresInSecs: number = refreshData.expires_in ?? 5184000
      const newExpiry = new Date(Date.now() + expiresInSecs * 1000).toISOString()

      const { error: updateError } = await adminDb
        .from('instagram_connections')
        .update({
          access_token: refreshData.access_token,
          token_expires_at: newExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conn.id)

      if (updateError) {
        console.error(
          `[instagram/refresh] DB update failed for @${conn.ig_username}:`,
          updateError
        )
        results.push({
          user_id: conn.user_id,
          ig_username: conn.ig_username,
          status: 'failed',
          error: `Database update failed: ${updateError.message}`,
        })
        continue
      }

      console.log(
        `[instagram/refresh] Refreshed token for @${conn.ig_username} — new expiry: ${newExpiry}`
      )
      results.push({
        user_id: conn.user_id,
        ig_username: conn.ig_username,
        status: 'refreshed',
        new_expiry: newExpiry,
      })

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      console.error(
        `[instagram/refresh] Exception for @${conn.ig_username}:`,
        err
      )
      results.push({
        user_id: conn.user_id,
        ig_username: conn.ig_username,
        status: 'failed',
        error: message,
      })
    }
  }

  const refreshed = results.filter((r) => r.status === 'refreshed').length
  const failed = results.filter((r) => r.status === 'failed').length

  return NextResponse.json({
    message: `Processed ${results.length} token(s): ${refreshed} refreshed, ${failed} failed`,
    checked_at: new Date().toISOString(),
    results,
  })
}
