'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type State = 'idle' | 'loading' | 'success' | 'error'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || state === 'loading') return

    setState('loading')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    setState(error ? 'error' : 'success')
    if (error) setErrorMsg(error.message)
  }

  return (
    <main
      role="main"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(1rem, 4vw, 2rem)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="bg-orb bg-orb-1" aria-hidden="true" />
      <div className="bg-orb bg-orb-2" aria-hidden="true" />

      {/* Logo */}
      <Link
        href="/"
        className="font-display"
        aria-label="Go to home page"
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          textDecoration: 'none',
          marginBottom: '2.5rem',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <span className="gradient-text">Fashion</span>
        <span style={{ color: 'var(--t1)' }}>AI</span>
      </Link>

      {/* Card */}
      <div
        className="card a-fade-up"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 'clamp(1.75rem, 4vw, 2.5rem) clamp(1.5rem, 3vw, 2rem)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {state === 'success' ? (
          <div style={{ textAlign: 'center' }} className="a-bounce-in" role="status" aria-live="polite">
            <div aria-hidden="true" style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>✉️</div>
            <h1
              className="font-display"
              style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}
            >
              Check your inbox
            </h1>
            <p style={{ color: 'var(--t2)', lineHeight: 1.7, marginBottom: '0.5rem' }}>
              We sent a magic link to
            </p>
            <p
              style={{
                fontWeight: 600,
                color: 'var(--brand-400)',
                marginBottom: '1.75rem',
                wordBreak: 'break-all',
              }}
            >
              {email}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--t3)', marginBottom: '1.5rem' }}>
              Click the link in the email to sign&nbsp;in.&nbsp;It expires in&nbsp;1&nbsp;hour.
            </p>
            <button
              onClick={() => { setState('idle'); setEmail('') }}
              className="btn-ghost"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.75rem' }}>
              <h1
                className="font-display"
                style={{
                  fontSize: 'clamp(1.35rem, 3vw, 1.625rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  marginBottom: '0.5rem',
                }}
              >
                Welcome back
              </h1>
              <p style={{ color: 'var(--t2)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                Enter your email and we&apos;ll send you a magic link to sign&nbsp;in — no&nbsp;password needed.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="email-input" className="form-label">
                  Email address
                </label>
                <input
                  id="email-input"
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  aria-describedby={state === 'error' ? 'login-error' : undefined}
                  aria-invalid={state === 'error' ? 'true' : undefined}
                />
              </div>

              {state === 'error' && (
                <div
                  id="login-error"
                  role="alert"
                  style={{
                    background: 'var(--c-error-dim)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 'var(--r-md)',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    color: '#fca5a5',
                    lineHeight: 1.5,
                  }}
                >
                  {errorMsg || 'Something went wrong. Please try again.'}
                </div>
              )}

              <button
                id="send-magic-link-btn"
                type="submit"
                className="btn-primary"
                disabled={state === 'loading' || !email}
                style={{ width: '100%', padding: '0.875rem' }}
                aria-busy={state === 'loading' ? 'true' : undefined}
              >
                {state === 'loading' ? (
                  <>
                    <span
                      className="a-spin"
                      aria-hidden="true"
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        display: 'inline-block',
                      }}
                    />
                    Sending…
                  </>
                ) : (
                  <>Send Magic Link <span aria-hidden="true">✨</span></>
                )}
              </button>
            </form>

            <p
              style={{
                marginTop: '1.5rem',
                textAlign: 'center',
                fontSize: '0.8125rem',
                color: 'var(--t3)',
              }}
            >
              By signing in you agree to our terms of service.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
