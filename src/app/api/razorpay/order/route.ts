import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'

export async function POST(req: Request) {
  try {
    const { amount, planId } = await req.json()
    
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })
    
    // Amount is multiplied by 100 to convert to paise (e.g. 9 becomes 900 paise or ₹9)
    const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: `receipt_${Date.now()}_${planId}`,
    }

    const order = await razorpay.orders.create(options)
    
    return NextResponse.json({ ...order, key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID })
  } catch (error: any) {
    console.error("Razorpay order creation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
