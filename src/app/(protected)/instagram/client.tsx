'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Creds {
  ig_username: string | null
  ig_user_id: string | null
  ig_profile_pic: string | null
  token_expiry: string | null
}

const IG_GRADIENT = 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'

function IgIcon({ size = 24, white = false }: { size?: number; white?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={white ? 'white' : 'url(#ig-pg)'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      {!white && (
        <defs>
          <linearGradient id="ig-pg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="50%" stopColor="#dc2743" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
      )}
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const ms = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export default function InstagramPageClient({ initialCreds }: { initialCreds: Creds | null }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [creds, setCreds] = useState<Creds | null>(initialCreds)
  const [disconnecting, setDisconnecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Read URL params on mount
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected === 'true') {
      setBanner({ type: 'success', msg: '🎉 Instagram connected successfully!' })
      // Refresh creds from DB
      const fetchCreds = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('instagram_credentials')
          .select('ig_username, ig_user_id, ig_profile_pic, token_expiry')
          .eq('user_id', user.id)
          .single()
        setCreds(data ?? null)
      }
      fetchCreds()
      // Remove query params from URL
      router.replace('/instagram')
    } else if (error) {
      setBanner({ type: 'error', msg: decodeURIComponent(error) })
      router.replace('/instagram')
    }
  }, [searchParams, router])

  const handleConnect = () => {
    window.location.href = '/api/instagram/oauth'
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Instagram account? You will need to re-authorize to post.')) return
    setDisconnecting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('instagram_credentials').delete().eq('user_id', user.id)
    }
    setCreds(null)
    setDisconnecting(false)
    setBanner({ type: 'success', msg: 'Instagram account disconnected.' })
  }

  const handleRefreshToken = async () => {
    setRefreshing(true)
    setRefreshMsg('')
    try {
      const res = await fetch('/api/instagram/refresh', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRefreshMsg('✓ Token refreshed! Valid for another 60 days.')
      if (data.token_expiry) {
        setCreds(prev => prev ? { ...prev, token_expiry: data.token_expiry } : prev)
      }
    } catch (err: any) {
      setRefreshMsg(`⚠ ${err.message}`)
    }
    setRefreshing(false)
  }

  const daysLeft = daysUntil(creds?.token_expiry ?? null)

  return (
    <div style={{
      minHeight: '100vh',
      padding: 'clamp(1.5rem, 4vw, 3rem) clamp(1rem, 5vw, 2.5rem)',
      maxWidth: 640,
      margin: '0 auto',
    }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: IG_GRADIENT,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(220,39,67,0.4)',
        }}>
          <IgIcon size={24} white />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Instagram</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--t3)', margin: 0 }}>
            Connect your account to post try-ons directly from this site
          </p>
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '0.875rem 1rem',
          borderRadius: 'var(--r-md)',
          background: banner.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(252,165,165,0.1)',
          border: `1px solid ${banner.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(252,165,165,0.3)'}`,
          color: banner.type === 'success' ? '#4ade80' : '#fca5a5',
          fontSize: '0.9rem',
          lineHeight: 1.5,
        }}>
          {banner.msg}
        </div>
      )}

      {/* ── NOT CONNECTED ── */}
      {!creds?.ig_user_id && (
        <div style={{
          background: 'var(--s-card)', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-lg)', overflow: 'hidden',
        }}>
          {/* Gradient hero */}
          <div style={{
            background: IG_GRADIENT,
            padding: '2.5rem 2rem',
            textAlign: 'center',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
              backdropFilter: 'blur(8px)',
            }}>
              <IgIcon size={36} white />
            </div>
            <h2 style={{ color: 'white', fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Connect Your Instagram
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
              Authorize FashionAI to post your try-on results directly to your Instagram feed — one click, no manual downloading.
            </p>
          </div>

          <div style={{ padding: '1.75rem' }}>
            {/* Feature list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.75rem' }}>
              {[
                ['✨', 'One-click posting from History to your Instagram feed'],
                ['🔐', 'Secure OAuth login — we never store your password'],
                ['♻️', 'Token auto-renews every 60 days — set once, works forever'],
                ['📱', 'Works on mobile too via the native share sheet'],
              ].map(([icon, text]) => (
                <div key={text as string} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.125rem', flexShrink: 0, marginTop: 2 }}>{icon}</span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--t2)', lineHeight: 1.5, margin: 0 }}>{text as string}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleConnect}
              style={{
                width: '100%', padding: '0.9375rem', border: 'none',
                borderRadius: 'var(--r-md)', cursor: 'pointer',
                background: IG_GRADIENT, color: 'white',
                fontWeight: 700, fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
                boxShadow: '0 4px 14px rgba(220,39,67,0.35)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(220,39,67,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(220,39,67,0.35)' }}
            >
              <IgIcon size={20} white /> Log in with Instagram
            </button>

            <p style={{ fontSize: '0.75rem', color: 'var(--t3)', textAlign: 'center', marginTop: '0.875rem', lineHeight: 1.6 }}>
              Requires a Business or Creator Instagram account connected to a Facebook Page.{' '}
              <a href="https://help.instagram.com/502981923235522" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--brand-400)', textDecoration: 'none' }}>
                How to switch to Business?
              </a>
            </p>
          </div>
        </div>
      )}

      {/* ── CONNECTED ── */}
      {creds?.ig_user_id && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Profile card */}
          <div style={{
            background: 'var(--s-card)', border: '1px solid var(--b1)',
            borderRadius: 'var(--r-lg)', padding: '1.5rem',
            display: 'flex', gap: '1rem', alignItems: 'center',
          }}>
            {/* Profile pic */}
            {creds.ig_profile_pic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creds.ig_profile_pic}
                alt="Instagram profile"
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2.5px solid transparent`, backgroundImage: IG_GRADIENT }}
              />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: IG_GRADIENT,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <IgIcon size={28} white />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#4ade80', flexShrink: 0,
                  boxShadow: '0 0 6px #4ade80',
                }} />
                <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 600 }}>Connected</span>
              </div>
              <p style={{ fontWeight: 700, fontSize: '1.0625rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                @{creds.ig_username ?? 'Unknown'}
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--t3)', margin: '0.125rem 0 0' }}>
                Instagram Business Account
              </p>
            </div>
          </div>

          {/* Token status */}
          <div style={{
            background: 'var(--s-card)', border: '1px solid var(--b1)',
            borderRadius: 'var(--r-lg)', padding: '1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Access Token</p>
                {daysLeft !== null && (
                  <p style={{
                    fontSize: '0.8125rem',
                    color: daysLeft < 10 ? '#fca5a5' : daysLeft < 20 ? '#fcd34d' : '#4ade80',
                    margin: 0,
                  }}>
                    {daysLeft > 0
                      ? `Valid for ${daysLeft} more day${daysLeft !== 1 ? 's' : ''}`
                      : '⚠ Token expired — please reconnect'}
                  </p>
                )}
              </div>
              <button
                onClick={handleRefreshToken}
                disabled={refreshing}
                style={{
                  padding: '0.5rem 0.875rem',
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--s2)', border: '1px solid var(--b1)',
                  color: 'var(--t2)', fontSize: '0.8125rem',
                  cursor: refreshing ? 'wait' : 'pointer', fontWeight: 600,
                  opacity: refreshing ? 0.6 : 1,
                }}
              >
                {refreshing ? '⏳ Refreshing…' : '♻ Renew Token'}
              </button>
            </div>
            {refreshMsg && (
              <p style={{ fontSize: '0.8125rem', color: refreshMsg.startsWith('✓') ? '#4ade80' : '#fca5a5', margin: 0 }}>
                {refreshMsg}
              </p>
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--t3)', margin: '0.625rem 0 0', lineHeight: 1.6 }}>
              Token auto-renews whenever you post. You can also renew manually here. Once renewed, it&apos;s valid for another 60 days.
            </p>
          </div>

          {/* How to use */}
          <div style={{
            background: 'var(--s-card)', border: '1px solid var(--b1)',
            borderRadius: 'var(--r-lg)', padding: '1.25rem',
          }}>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.875rem' }}>How to post</p>
            <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                'Go to the History page',
                'Click the Instagram button on any completed try-on',
                'Edit the caption if you want, then click "Post to Instagram Automatically"',
                'Done! Check your Instagram feed 🎉',
              ].map((step, i) => (
                <li key={i} style={{ fontSize: '0.875rem', color: 'var(--t2)', lineHeight: 1.5 }}>{step}</li>
              ))}
            </ol>
          </div>

          {/* Reconnect / Disconnect */}
          <div style={{
            background: 'var(--s-card)', border: '1px solid var(--b1)',
            borderRadius: 'var(--r-lg)', padding: '1.25rem',
            display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
          }}>
            <button
              onClick={handleConnect}
              style={{
                flex: 1, minWidth: 160, padding: '0.625rem 1rem',
                borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
                background: IG_GRADIENT, color: 'white',
                fontWeight: 600, fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              <IgIcon size={14} white /> Re-authorize
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{
                flex: 1, minWidth: 160, padding: '0.625rem 1rem',
                borderRadius: 'var(--r-sm)', border: '1px solid rgba(252,165,165,0.3)',
                background: 'transparent', color: '#fca5a5',
                fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                opacity: disconnecting ? 0.6 : 1,
              }}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
