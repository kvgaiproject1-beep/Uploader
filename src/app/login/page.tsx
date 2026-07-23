'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup'
type State = 'idle' | 'loading' | 'success' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleGoogleLogin = async () => {
    setState('loading')
    setErrorMsg('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setState('error')
      setErrorMsg(error.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || state === 'loading') return

    setState('loading')
    setErrorMsg('')

    const supabase = createClient()
    
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      
      if (error) {
        setState('error')
        setErrorMsg(error.message)
      } else {
        setState('success') // Tells them to check email
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })
      
      if (error) {
        setState('error')
        setErrorMsg(error.message)
      } else {
        // Successful login
        router.push('/')
        router.refresh()
      }
    }
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
              We sent a confirmation link to
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
              Click the link in the email to activate your account and sign in.
            </p>
            <button
              onClick={() => { setState('idle'); setPassword('') }}
              className="btn-ghost"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Back to login
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
              <h1
                className="font-display"
                style={{
                  fontSize: 'clamp(1.35rem, 3vw, 1.625rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  marginBottom: '0.5rem',
                }}
              >
                {mode === 'login' ? 'Welcome back' : 'Create an account'}
              </h1>
              <p style={{ color: 'var(--t2)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                {mode === 'login' ? 'Sign in to your account to continue.' : 'Sign up to start trying on clothes.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={state === 'loading'}
                className="btn-ghost"
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  border: '1px solid var(--b0)',
                  backgroundColor: 'var(--s1)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
                <div style={{ flex: 1, height: 1, backgroundColor: 'var(--b0)' }} />
                <span style={{ padding: '0 1rem', fontSize: '0.75rem', color: 'var(--t3)', textTransform: 'uppercase' }}>or email and password</span>
                <div style={{ flex: 1, height: 1, backgroundColor: 'var(--b0)' }} />
              </div>

              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                    autoComplete="email"
                    aria-describedby={state === 'error' ? 'login-error' : undefined}
                    aria-invalid={state === 'error' ? 'true' : undefined}
                  />
                </div>
                
                <div>
                  <label htmlFor="password-input" className="form-label">
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      aria-describedby={state === 'error' ? 'login-error' : undefined}
                      aria-invalid={state === 'error' ? 'true' : undefined}
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--t3)',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                  {mode === 'signup' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--t3)', marginTop: '0.375rem' }}>
                      Must be at least 6 characters.
                    </div>
                  )}
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
                  id="submit-btn"
                  type="submit"
                  className="btn-primary"
                  disabled={state === 'loading' || !email || !password}
                  style={{ width: '100%', padding: '0.875rem', marginTop: '0.25rem' }}
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
                      {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                    </>
                  ) : (
                    <>{mode === 'login' ? 'Sign In' : 'Sign Up'} <span aria-hidden="true">→</span></>
                  )}
                </button>
              </form>
              
              <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--t2)' }}>
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('signup'); setErrorMsg(''); setState('idle') }}
                      style={{ background: 'none', border: 'none', color: 'var(--brand-400)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setErrorMsg(''); setState('idle') }}
                      style={{ background: 'none', border: 'none', color: 'var(--brand-400)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
