import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const IG_GRAPH = 'https://graph.instagram.com/v21.0'

/**
 * POST /api/instagram/post
 *
 * Publishes an image to the user's Instagram Business account via the
 * Instagram Graph API (Content Publishing endpoint).
 *
 * Body: { image_url: string, caption?: string, user_id?: string }
 *
 * - image_url: publicly accessible URL (e.g. Supabase Storage public URL)
 * - caption: optional post caption
 * - user_id: optional — if omitted, uses the authenticated user's ID
 *
 * Flow:
 * 1. POST /{ig_user_id}/media  → creates a container (returns creation_id)
 * 2. POST /{ig_user_id}/media_publish → publishes the container
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image_url, caption } = body
    let { user_id } = body

    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 })
    }

    // ── Resolve user_id ────────────────────────────────────────────────────
    if (!user_id) {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
      user_id = user.id
    }

    // ── Fetch access token from instagram_connections via admin client ─────
    const adminDb = createAdminClient()
    const { data: connection, error: dbError } = await adminDb
      .from('instagram_connections')
      .select('access_token, ig_user_id, token_expires_at')
      .eq('user_id', user_id)
      .single()

    if (dbError || !connection) {
      return NextResponse.json(
        { error: 'Instagram not connected. Please connect your account first.' },
        { status: 400 }
      )
    }

    // ── Check if token is expired ──────────────────────────────────────────
    const expiresAt = new Date(connection.token_expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        {
          error: 'token_expired',
          message: 'Your Instagram token has expired. Please reconnect your account.',
        },
        { status: 401 }
      )
    }

    const { access_token, ig_user_id } = connection
    const postCaption = caption ?? 'My AI Fashion Try-On ✨ #aifashion #virtualtryon #fashionai'

    // ── Step 1: Create a media container ────────────────────────────────────
    const containerUrl = new URL(`${IG_GRAPH}/${ig_user_id}/media`)
    containerUrl.searchParams.set('image_url', image_url)
    containerUrl.searchParams.set('caption', postCaption)
    containerUrl.searchParams.set('access_token', access_token)

    const containerRes = await fetch(containerUrl.toString(), { method: 'POST' })
    const containerData = await containerRes.json()

    if (!containerRes.ok || !containerData.id) {
      const errMsg = containerData.error?.message ?? 'Failed to create media container'
      console.error('[instagram/post] Container error:', containerData)

      // Check for specific token errors
      if (containerData.error?.code === 190 || containerData.error?.type === 'OAuthException') {
        return NextResponse.json(
          {
            error: 'token_expired',
            message: 'Your Instagram token is invalid. Please reconnect your account.',
          },
          { status: 401 }
        )
      }

      return NextResponse.json({ error: errMsg }, { status: 500 })
    }

    const creationId: string = containerData.id

    // ── Step 2: Wait for Instagram to process the media ────────────────────
    // Instagram recommends checking container status before publishing.
    // For simplicity, we poll with a short delay.
    await waitForContainerReady(ig_user_id, creationId, access_token)

    // ── Step 3: Publish the container ──────────────────────────────────────
    const publishUrl = new URL(`${IG_GRAPH}/${ig_user_id}/media_publish`)
    publishUrl.searchParams.set('creation_id', creationId)
    publishUrl.searchParams.set('access_token', access_token)

    const publishRes = await fetch(publishUrl.toString(), { method: 'POST' })
    const publishData = await publishRes.json()

    if (!publishRes.ok || !publishData.id) {
      const errMsg = publishData.error?.message ?? 'Failed to publish media'
      console.error('[instagram/post] Publish error:', publishData)
      return NextResponse.json({ error: errMsg }, { status: 500 })
    }

    const mediaId: string = publishData.id

    // ── Step 4: Get post permalink ────────────────────────────────────────
    const permaUrl = new URL(`${IG_GRAPH}/${mediaId}`)
    permaUrl.searchParams.set('fields', 'permalink')
    permaUrl.searchParams.set('access_token', access_token)

    const permaRes = await fetch(permaUrl.toString())
    const permaData = await permaRes.json()

    return NextResponse.json({
      success: true,
      media_id: mediaId,
      post_url: permaData.permalink ?? 'https://www.instagram.com/',
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('[instagram/post] Unexpected error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Polls the container status until it's ready or times out.
 * Instagram needs a few seconds to download and process the image.
 */
async function waitForContainerReady(
  igUserId: string,
  containerId: string,
  accessToken: string,
  maxAttempts = 10,
  intervalMs = 2000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs))

    const statusUrl = new URL(`${IG_GRAPH}/${containerId}`)
    statusUrl.searchParams.set('fields', 'status_code')
    statusUrl.searchParams.set('access_token', accessToken)

    try {
      const res = await fetch(statusUrl.toString())
      const data = await res.json()

      if (data.status_code === 'FINISHED') {
        return // Ready to publish
      }

      if (data.status_code === 'ERROR') {
        throw new Error(`Media container processing failed: ${data.status ?? 'unknown error'}`)
      }

      // IN_PROGRESS — keep waiting
    } catch (err) {
      if (i === maxAttempts - 1) throw err
      // Otherwise continue polling
    }
  }

  // If we reach here, publish anyway — Instagram might still accept it
  console.warn('[instagram/post] Container status check timed out, attempting publish anyway')
}
