import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { decrypt } from '@/lib/encrypt'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, caption } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 })
    }

    // Authenticate user via Supabase session
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch stored Instagram credentials
    const { data: creds, error: credsError } = await supabase
      .from('instagram_credentials')
      .select('ig_username, ig_password')
      .eq('user_id', user.id)
      .single()

    if (credsError || !creds) {
      return NextResponse.json(
        { error: 'Instagram account not connected. Please connect your account in Settings.' },
        { status: 400 }
      )
    }

    // Decrypt the stored password
    let password: string
    try {
      password = decrypt(creds.ig_password)
    } catch {
      return NextResponse.json(
        { error: 'Failed to decrypt credentials. Please reconnect your Instagram account.' },
        { status: 500 }
      )
    }

    // Call the Modal.com Instagram posting endpoint
    const modalUrl = process.env.INSTAGRAM_MODAL_URL
    if (!modalUrl) {
      return NextResponse.json(
        { error: 'Instagram posting service is not configured.' },
        { status: 503 }
      )
    }

    const modalRes = await fetch(modalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: creds.ig_username,
        password,
        image_url: imageUrl,
        caption: caption || 'My AI Fashion Try-On ✨ #aifashion #virtualtryon #fashionai',
      }),
      signal: AbortSignal.timeout(120_000), // 2 min timeout for Instagram login + upload
    })

    if (!modalRes.ok) {
      const errText = await modalRes.text()
      console.error('[instagram/post] Modal error:', errText)
      return NextResponse.json(
        { error: `Instagram post failed: ${errText.slice(0, 200)}` },
        { status: 500 }
      )
    }

    const result = await modalRes.json()
    return NextResponse.json(result)

  } catch (err: any) {
    console.error('[instagram/post] Unexpected error:', err)
    return NextResponse.json(
      { error: err.message || 'Unexpected error' },
      { status: 500 }
    )
  }
}
