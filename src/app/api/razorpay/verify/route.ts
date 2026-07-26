import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      creditsToAdd,
      planId
    } = await req.json()

    const body = razorpay_order_id + "|" + razorpay_payment_id
    
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex")

    const isAuthentic = expectedSignature === razorpay_signature

    if (!isAuthentic) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 })
    }

    // Payment is verified, update supabase.
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, 
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) { 
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current credits
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single()
    const currentCredits = profile?.credits || 0
    
    // Update credits
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      credits: currentCredits + creditsToAdd,
      plan_type: planId
    })

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Razorpay verification error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
