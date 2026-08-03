import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

/**
 * GET /api/instagram/oauth
 *
 * Redirects the authenticated user to Instagram's OAuth authorize URL
 * using the "Instagram Login" (Business Login) flow.
 *
 * Endpoint: https://www.instagram.com/oauth/authorize
 * Scopes: instagram_business_basic, instagram_business_content_publish
 */
export async function GET() {
  const appId = process.env.INSTAGRAM_APP_ID
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI

  if (!appId || !redirectUri) {
    return NextResponse.json(
      { error: 'INSTAGRAM_APP_ID or INSTAGRAM_REDIRECT_URI is not configured' },
      { status: 503 }
    )
  }

  // Verify user is authenticated before starting OAuth
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    return NextResponse.redirect(`${appUrl}/login?next=/instagram`)
  }

  // Generate a CSRF state token using user ID + random bytes
  const statePayload = `${user.id}:${crypto.randomBytes(16).toString('hex')}`
  // In production you'd store this in a short-lived cookie/session to verify on callback.
  // For simplicity, we encode the user ID so the callback can cross-check.
  const state = Buffer.from(statePayload).toString('base64url')

  const oauthUrl = new URL('https://www.instagram.com/oauth/authorize')
  oauthUrl.searchParams.set('client_id', appId)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('scope', 'instagram_business_basic,instagram_business_content_publish')
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('state', state)

  return NextResponse.redirect(oauthUrl.toString())
}
