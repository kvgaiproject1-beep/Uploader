'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface InstagramShareModalProps {
  imageUrl: string
  onClose: () => void
}

// ─── Instagram SVG icon ───────────────────────────────────────────────────────
function IgIcon({ size = 20, white = false }: { size?: number; white?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={white ? 'white' : 'url(#ig-g)'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      {!white && (
        <defs>
          <linearGradient id="ig-g" x1="0%" y1="0%" x2="100%" y2="100%">
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

// ─── Gradient button ──────────────────────────────────────────────────────────
const IG_GRADIENT = 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'

export function InstagramShareModal({ imageUrl, onClose }: InstagramShareModalProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<'preview' | 'success' | 'manual'>('preview')
  const [caption, setCaption] = useState("My AI Fashion Try-On ✨ #aifashion #virtualtryon #fashionai")
  const [editingCaption, setEditingCaption] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [autoPosting, setAutoPosting] = useState(false)
  const [autoPostError, setAutoPostError] = useState('')
  const [postUrl, setPostUrl] = useState('')
  const [downloading, setDownloading] = useState(false)

  // ── Boot: detect capabilities & fetch profile ─────────────────────────────
  useEffect(() => {
    // Check Web Share API with file support (iOS Safari / Android Chrome)
    if (typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator) {
      const probe = new File([], 'x.jpg', { type: 'image/jpeg' })
      setCanNativeShare((navigator as any).canShare({ files: [probe] }))
    }

    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profile }, { data: creds }] = await Promise.all([
        supabase.from('profiles').select('instagram_handle').eq('id', user.id).single(),
        supabase.from('instagram_credentials').select('id').eq('user_id', user.id).single(),
      ])

      if (profile?.instagram_handle) {
        setCaption(prev => prev) // keep default; handle visible in UI
      }
      setHasCredentials(!!creds)
    }
    fetchProfile()
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fetchBlob = async (): Promise<Blob> => {
    const url = imageUrl.startsWith('http')
      ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
      : imageUrl
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch image')
    return res.blob()
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Mobile: hand off to native share sheet → Instagram */
  const handleNativeShare = async () => {
    try {
      const blob = await fetchBlob()
      const file = new File([blob], 'fashionai-tryon.jpg', { type: blob.type || 'image/jpeg' })
      await (navigator as any).share({ files: [file], title: 'My AI Fashion Try-On', text: caption })
    } catch (err: any) {
      if (err?.name !== 'AbortError') handleDownloadThenManual()
    }
  }

  /** Desktop auto-post via instagrapi backend */
  const handleAutoPost = async () => {
    setAutoPosting(true)
    setAutoPostError('')
    try {
      const res = await fetch('/api/instagram/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, caption }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unknown error')
      setPostUrl(data.post_url || '')
      setStep('success')
    } catch (err: any) {
      setAutoPostError(err.message)
    }
    setAutoPosting(false)
  }

  /** Desktop fallback: download → manual instructions */
  const handleDownloadThenManual = async () => {
    setDownloading(true)
    try {
      const blob = await fetchBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'fashionai-tryon.jpg'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      window.open(imageUrl, '_blank')
    }
    setDownloading(false)
    setStep('manual')
  }

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Layout helpers ────────────────────────────────────────────────────────
  const Header = () => (
    <div style={{
      padding: '1rem 1.25rem',
      background: IG_GRADIENT,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <IgIcon white />
        <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>Share to Instagram</span>
      </div>
      <button onClick={onClose} style={{
        background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
        width: 30, height: 30, cursor: 'pointer', color: 'white', fontSize: '1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>✕</button>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)',
        padding: '1rem',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="a-fade-in"
        style={{
          background: 'var(--s-card)', borderRadius: 'var(--r-lg)',
          border: '1px solid var(--b1)', width: '100%', maxWidth: 480,
          overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
        }}
      >
        <Header />

        {/* ── PREVIEW STEP ── */}
        {step === 'preview' && (
          <div style={{ padding: '1.5rem' }}>
            {/* Image */}
            <div style={{
              borderRadius: 'var(--r-md)', overflow: 'hidden',
              marginBottom: '1.25rem', background: '#0a0a0a',
              maxHeight: 260, display: 'flex', justifyContent: 'center',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Try-on" style={{ maxHeight: 260, objectFit: 'contain', display: 'block' }} />
            </div>

            {/* Caption editor */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.05em' }}>
                  CAPTION
                </label>
                <button
                  onClick={() => setEditingCaption(!editingCaption)}
                  style={{ fontSize: '0.75rem', color: 'var(--brand-400)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {editingCaption ? 'Done' : 'Edit'}
                </button>
              </div>
              {editingCaption ? (
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', padding: '0.75rem', boxSizing: 'border-box',
                    background: 'var(--s2)', border: '1px solid var(--brand-500)',
                    borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: '0.875rem',
                    resize: 'vertical', outline: 'none', lineHeight: 1.6,
                  }}
                />
              ) : (
                <div style={{
                  padding: '0.75rem', background: 'var(--s-overlay)', borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--b1)', fontSize: '0.875rem', color: 'var(--t2)', lineHeight: 1.6,
                }}>
                  {caption}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* PRIMARY: Native share (mobile) */}
              {canNativeShare && (
                <button
                  onClick={handleNativeShare}
                  style={{
                    width: '100%', padding: '0.875rem', border: 'none', borderRadius: 'var(--r-md)',
                    cursor: 'pointer', background: IG_GRADIENT, color: 'white',
                    fontWeight: 700, fontSize: '0.9375rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}
                >
                  <IgIcon size={18} white /> Share via Instagram App
                </button>
              )}

              {/* PRIMARY: Auto-post (desktop, credentials connected) */}
              {!canNativeShare && hasCredentials && (
                <div>
                  <button
                    onClick={handleAutoPost}
                    disabled={autoPosting}
                    style={{
                      width: '100%', padding: '0.875rem', border: 'none', borderRadius: 'var(--r-md)',
                      cursor: autoPosting ? 'wait' : 'pointer',
                      background: autoPosting ? 'var(--s-hover)' : IG_GRADIENT,
                      color: 'white', fontWeight: 700, fontSize: '0.9375rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      opacity: autoPosting ? 0.7 : 1, transition: 'opacity 0.2s',
                    }}
                  >
                    {autoPosting ? (
                      <>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◎</span>
                        Posting to Instagram…
                      </>
                    ) : (
                      <><IgIcon size={18} white /> Post to Instagram Automatically</>
                    )}
                  </button>
                  {autoPostError && (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#fca5a5', lineHeight: 1.5 }}>
                      ⚠ {autoPostError}
                    </p>
                  )}
                </div>
              )}

              {/* SECONDARY / FALLBACK: Download & post manually */}
              <button
                onClick={handleDownloadThenManual}
                disabled={downloading}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: 'var(--r-md)',
                  background: 'transparent', border: '1px solid var(--b1)',
                  color: 'var(--t2)', fontWeight: 600, fontSize: '0.875rem',
                  cursor: downloading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                {downloading ? '⏳ Downloading…' : '⬇ Download & Post Manually'}
              </button>

              {/* Desktop with no credentials: nudge to connect */}
              {!canNativeShare && !hasCredentials && (
                <p style={{ fontSize: '0.75rem', color: 'var(--t3)', textAlign: 'center', lineHeight: 1.5 }}>
                  💡 Connect your Instagram account in the profile menu to enable one-click auto-posting on desktop.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── SUCCESS STEP ── */}
        {step === 'success' && (
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: IG_GRADIENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <span style={{ fontSize: '1.75rem' }}>✓</span>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Posted to Instagram!
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--t3)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Your try-on has been shared to your Instagram feed.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {postUrl && (
                <a
                  href={postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.75rem', borderRadius: 'var(--r-md)',
                    background: IG_GRADIENT, color: 'white', fontWeight: 700,
                    fontSize: '0.9rem', textDecoration: 'none',
                  }}
                >
                  <IgIcon size={16} white /> View Post on Instagram
                </a>
              )}
              <button onClick={onClose} style={{
                padding: '0.75rem', borderRadius: 'var(--r-md)',
                background: 'transparent', border: '1px solid var(--b1)',
                color: 'var(--t2)', fontSize: '0.875rem', cursor: 'pointer',
              }}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* ── MANUAL INSTRUCTIONS STEP ── */}
        {step === 'manual' && (
          <div style={{ padding: '1.5rem' }}>
            <div style={{
              background: 'rgba(134,239,172,0.1)', border: '1px solid rgba(134,239,172,0.3)',
              borderRadius: 'var(--r-md)', padding: '0.875rem', marginBottom: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span style={{ fontSize: '1.25rem' }}>✅</span>
              <span style={{ color: '#86efac', fontWeight: 600, fontSize: '0.9rem' }}>
                Image downloaded! Now post it to Instagram.
              </span>
            </div>

            {/* Suggested caption */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--t3)', display: 'block', marginBottom: '0.5rem' }}>
                SUGGESTED CAPTION — tap to copy
              </label>
              <div style={{
                background: 'var(--s-overlay)', borderRadius: 'var(--r-md)', padding: '0.875rem',
                border: '1px solid var(--b1)', fontSize: '0.875rem', color: 'var(--t1)', lineHeight: 1.6,
                position: 'relative',
              }}>
                {caption}
                <button onClick={handleCopyCaption} style={{
                  position: 'absolute', top: 8, right: 8,
                  background: copied ? 'rgba(134,239,172,0.15)' : 'var(--s-card)',
                  border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
                  padding: '0.25rem 0.625rem', fontSize: '0.75rem', cursor: 'pointer',
                  color: copied ? '#86efac' : 'var(--t2)', fontWeight: 600, transition: 'all 0.2s',
                }}>
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.875rem', borderRadius: 'var(--r-md)',
                  background: IG_GRADIENT, color: 'white', fontWeight: 700,
                  fontSize: '0.9375rem', textDecoration: 'none',
                }}
              >
                <IgIcon size={18} white /> Open Instagram
              </a>
              <button onClick={onClose} style={{
                padding: '0.75rem', borderRadius: 'var(--r-md)',
                background: 'transparent', border: '1px solid var(--b1)',
                color: 'var(--t2)', fontSize: '0.875rem', cursor: 'pointer',
              }}>
                Done
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--t3)', textAlign: 'center', marginTop: '1rem', lineHeight: 1.6 }}>
              On Instagram: tap + → Post → select downloaded image → paste caption → Share
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
