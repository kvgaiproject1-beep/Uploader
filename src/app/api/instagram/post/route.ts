import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const FB_API = 'https://graph.facebook.com/v21.0'

/**
 * POST /api/instagram/post
 * Posts an image to the user's Instagram Business account via the Graph API.
 * Auto-refreshes the token on every successful post.
 */
export async function POST(request: NextRequest) {
  try {
    const { imageUrl, caption } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 })
    }

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

    // Get stored credentials
    const { data: creds } = await supabase
      .from('instagram_credentials')
      .select('access_token, ig_user_id, token_expiry')
      .eq('user_id', user.id)
      .single()

    if (!creds?.access_token || !creds?.ig_user_id) {
      return NextResponse.json(
        { error: 'Instagram not connected. Please connect your account from the Instagram page.' },
        { status: 400 }
      )
    }

    // Check if token needs refresh (refresh if within 10 days of expiry)
    const token = creds.access_token
    const expiry = creds.token_expiry ? new Date(creds.token_expiry) : null
    const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)

    if (expiry && expiry < tenDaysFromNow) {
      // Silently attempt to refresh — don't block the post if refresh fails
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/refresh`, {
          method: 'POST',
          headers: { Cookie: cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ') },
        })
      } catch { /* non-fatal */ }
    }

    const postCaption = caption ?? 'My AI Fashion Try-On ✨ #aifashion #virtualtryon #fashionai'

    // ── Step 1: Create a media container ─────────────────────────────────────
    // The image must be publicly accessible. Since Supabase storage URLs are public, this works.
    const containerRes = await fetch(
      `${FB_API}/${creds.ig_user_id}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(postCaption)}&access_token=${token}`,
      { method: 'POST' }
    )
    const containerData = await containerRes.json()

    if (!containerRes.ok || !containerData.id) {
      const errMsg = containerData.error?.message ?? 'Failed to create media container'
      console.error('[instagram/post] Container error:', containerData)
      return NextResponse.json({ error: errMsg }, { status: 500 })
    }

    const creationId: string = containerData.id

    // ── Step 2: Publish the container ─────────────────────────────────────────
    // Instagram recommends waiting a few seconds for processing
    await new Promise(r => setTimeout(r, 3000))

    const publishRes = await fetch(
      `${FB_API}/${creds.ig_user_id}/media_publish?creation_id=${creationId}&access_token=${token}`,
      { method: 'POST' }
    )
    const publishData = await publishRes.json()

    if (!publishRes.ok || !publishData.id) {
      const errMsg = publishData.error?.message ?? 'Failed to publish media'
      console.error('[instagram/post] Publish error:', publishData)
      return NextResponse.json({ error: errMsg }, { status: 500 })
    }

    const mediaId: string = publishData.id

    // ── Step 3: Get post permalink ─────────────────────────────────────────────
    const permaRes = await fetch(
      `${FB_API}/${mediaId}?fields=permalink&access_token=${token}`
    )
    const permaData = await permaRes.json()

    return NextResponse.json({
      success: true,
      media_id: mediaId,
      post_url: permaData.permalink ?? `https://www.instagram.com/`,
    })

  } catch (err: any) {
    console.error('[instagram/post] Unexpected error:', err)
    return NextResponse.json({ error: err.message ?? 'Unexpected error' }, { status: 500 })
  }
}
