import { NextResponse } from 'next/server'

/**
 * GET /api/instagram/oauth
 * Redirects the user to Facebook's OAuth dialog to authorize Instagram permissions.
 */
export async function GET() {
  const appId = process.env.FACEBOOK_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!appId || !appUrl) {
    return NextResponse.json(
      { error: 'FACEBOOK_APP_ID or NEXT_PUBLIC_APP_URL is not configured' },
      { status: 503 }
    )
  }

  const callbackUrl = `${appUrl}/api/instagram/callback`

  const scope = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
  ].join(',')

  const oauthUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  oauthUrl.searchParams.set('client_id', appId)
  oauthUrl.searchParams.set('redirect_uri', callbackUrl)
  oauthUrl.searchParams.set('scope', scope)
  oauthUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(oauthUrl.toString())
}
