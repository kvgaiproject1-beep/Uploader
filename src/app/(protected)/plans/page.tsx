'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

export default function PlansPage() {
  const [user, setUser] = useState<User | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchUserAndCredits = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data, error } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', user.id)
          .single()
        
        if (data && !error) {
          setCredits(data.credits)
        }
      }
    }
    fetchUserAndCredits()
  }, [])

  const handlePurchase = async (planId: string, creditsToAdd: number, amount: number) => {
    if (!user) {
      alert("Please login to purchase a plan.")
      return
    }
    
    setIsProcessing(planId)
    
    try {
      // 1. Create Order on Backend
      const orderRes = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, planId }),
      })
      
      const orderData = await orderRes.json()
      
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create order')
      }

      // 2. Initialize Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Virtual Try-On",
        description: `${creditsToAdd} Credits Plan`,
        order_id: orderData.id,
        handler: async function (response: any) {
          // 3. Verify Payment on Backend
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                creditsToAdd,
                planId
              })
            })

            const verifyData = await verifyRes.json()

            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Verification failed')
            }

            // Success! Update local state
            setCredits((prev) => (prev || 0) + creditsToAdd)
            alert(`Successfully added ${creditsToAdd} credits!`)
            router.refresh()
            
          } catch (verifyError: any) {
            alert(`Payment verification failed: ${verifyError.message}`)
          } finally {
            setIsProcessing(null)
          }
        },
        prefill: {
          email: user.email || '',
        },
        theme: {
          color: "#000000" // Matches our dark aesthetic, change to brand color if desired
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(null)
          }
        }
      }

      const paymentObject = new (window as any).Razorpay(options)
      paymentObject.on('payment.failed', function (response: any) {
        alert(`Payment failed: ${response.error.description}`)
        setIsProcessing(null)
      })
      
      paymentObject.open()
      
    } catch (err: any) {
      alert(`Initialization failed: ${err.message}`)
      setIsProcessing(null)
    }
  }

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '₹99',
      amount: 99,
      credits: 50,
      description: 'Perfect for casual users looking to try out AI fashion.',
      features: ['50 image generations', 'Standard resolution', 'Community support'],
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '₹299',
      amount: 299,
      credits: 200,
      description: 'For fashion enthusiasts needing more frequent try-ons.',
      features: ['200 image generations', 'High resolution', 'Priority processing', 'Email support'],
      popular: true,
    },
    {
      id: 'creator',
      name: 'Creator',
      price: '₹999',
      amount: 999,
      credits: 1000,
      description: 'For power users and small businesses.',
      features: ['1000 image generations', 'Ultra resolution', 'Fastest processing', 'API Access'],
      popular: false,
    }
  ]

  return (
    <>
      <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(2rem, 5vw, 4rem)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, marginBottom: '1rem' }}>
            Choose your <span style={{ color: 'var(--brand-400)' }}>plan</span>
          </h1>
          <p style={{ color: 'var(--t2)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto' }}>
            Unlock more AI virtual try-on generations. Your current balance is{' '}
            <strong style={{ color: 'var(--t1)' }}>{credits !== null ? credits : '...'} credits</strong>.
          </p>
        </div>

        {/* Pricing Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'center' }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                position: 'relative',
                background: 'var(--s-card)',
                border: plan.popular ? '2px solid var(--brand-400)' : '1px solid var(--b1)',
                borderRadius: 'var(--r-lg)',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                boxShadow: plan.popular ? '0 10px 40px -10px rgba(var(--brand-400), 0.3)' : 'none',
                transform: plan.popular ? 'scale(1.02)' : 'none',
                transition: 'transform 0.2s',
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--brand-500)',
                  color: 'var(--bg)',
                  padding: '0.25rem 1rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Most Popular
                </div>
              )}

              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{plan.name}</h2>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{plan.price}</span>
                  <span style={{ color: 'var(--t3)' }}>/month</span>
                </div>
                <p style={{ color: 'var(--t2)', fontSize: '0.875rem', marginTop: '1rem' }}>{plan.description}</p>
              </div>

              <button
                onClick={() => handlePurchase(plan.id, plan.credits, plan.amount)}
                disabled={isProcessing !== null}
                className={plan.popular ? 'btn-primary' : 'btn-ghost'}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  border: plan.popular ? 'none' : '1px solid var(--b1)'
                }}
              >
                {isProcessing === plan.id ? 'Processing...' : `Get ${plan.credits} Credits`}
              </button>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '1rem' }}>
                {plan.features.map((feature, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--t2)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
