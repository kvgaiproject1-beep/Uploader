'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UserMenuProps {
  userEmail: string
}

function InstagramConnectModal({
  current,
  onSave,
  onClose,
}: {
  current: string
  onSave: (handle: string, password?: string) => void
  onClose: () => void
}) {
  const [handle, setHandle] = useState(current.replace('@', ''))
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const cleaned = handle.trim().replace(/^@/, '')
    if (!cleaned) return
    setSaving(true)
    await onSave(cleaned, password.trim() || undefined)
    setSaving(false)
  }

  const IG_GRADIENT = 'linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="a-fade-in"
        style={{
          background: '#0f172a', border: '1px solid var(--b1)',
          borderRadius: 'var(--r-lg)', padding: '1.5rem', width: '100%', maxWidth: '380px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: IG_GRADIENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--t1)' }}>Connect Instagram</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--t3)' }}>Enable one-click posting from the site</p>
          </div>
        </div>

        {/* Username input */}
        <div style={{ marginBottom: '0.875rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--t3)', display: 'block', marginBottom: '0.375rem' }}>USERNAME</label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--t3)', fontSize: '0.9375rem', pointerEvents: 'none',
            }}>@</span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/^@/, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="your_username"
              autoFocus
              style={{
                width: '100%', padding: '0.75rem 0.875rem 0.75rem 1.75rem',
                background: 'var(--s2)', border: '1px solid var(--b1)',
                borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: '0.9375rem',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-500)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--b1)')}
            />
          </div>
        </div>

        {/* Password input (optional) */}
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--t3)', display: 'block', marginBottom: '0.375rem' }}>
            PASSWORD <span style={{ fontWeight: 400, color: 'var(--t3)' }}>(optional — for desktop auto-posting)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Instagram password"
              style={{
                width: '100%', padding: '0.75rem 2.5rem 0.75rem 0.875rem',
                background: 'var(--s2)', border: '1px solid var(--b1)',
                borderRadius: 'var(--r-sm)', color: 'var(--t1)', fontSize: '0.9375rem',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand-500)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--b1)')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--t3)', fontSize: '0.875rem', padding: 0,
              }}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <p style={{ fontSize: '0.7rem', color: 'var(--t3)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          🔒 Password is encrypted with AES-256 and never stored in plain text.
          Only required if you want auto-posting on desktop. Mobile users can post via the share sheet without a password.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '0.625rem', borderRadius: 'var(--r-sm)',
              background: 'transparent', border: '1px solid var(--b1)',
              color: 'var(--t2)', fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !handle.trim()}
            style={{
              flex: 2, padding: '0.625rem', borderRadius: 'var(--r-sm)',
              background: IG_GRADIENT,
              border: 'none', color: 'white', fontSize: '0.875rem',
              fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
              opacity: saving || !handle.trim() ? 0.6 : 1,
            }}
          >
            {saving ? 'Connecting…' : 'Connect Instagram'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UserMenu({ userEmail }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [instagramHandle, setInstagramHandle] = useState<string>('')
  const [showInstagramModal, setShowInstagramModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : '?'

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userEmail) return
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('credits, instagram_handle')
          .eq('id', user.id)
          .single()
        setCredits(data?.credits ?? 10)
        setInstagramHandle(data?.instagram_handle ?? '')
      }
    }
    fetchProfile()

    const handleCreditsUpdated = () => fetchProfile()
    window.addEventListener('creditsUpdated', handleCreditsUpdated)
    return () => window.removeEventListener('creditsUpdated', handleCreditsUpdated)
  }, [userEmail])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setIsOpen(false)
    router.push('/')
    router.refresh()
  }

  const handleSaveInstagram = async (handle: string, password?: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Always save handle to profiles
    await supabase
      .from('profiles')
      .update({ instagram_handle: handle })
      .eq('id', user.id)

    // If password provided, save encrypted credentials via API
    if (password) {
      try {
        await fetch('/api/instagram/save-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: handle, password }),
        })
      } catch {
        // Non-fatal — handle still saved
      }
    }

    setInstagramHandle(handle)
    setShowInstagramModal(false)
  }

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <>
      {showInstagramModal && (
        <InstagramConnectModal
          current={instagramHandle}
          onSave={handleSaveInstagram}
          onClose={() => setShowInstagramModal(false)}
        />
      )}

      <div className="user-menu-container" ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {credits !== null && (
          <Link href="/plans" style={{ textDecoration: 'none' }}>
            <div
              title="Your Credits"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--brand-dim)', color: 'var(--brand-400)',
                padding: '0.375rem 0.875rem', borderRadius: '999px',
                fontSize: '0.875rem', fontWeight: 700, border: '1px solid var(--brand-500)',
                transition: 'transform 0.2s ease, background 0.2s', cursor: 'pointer',
                boxShadow: '0 0 10px rgba(var(--brand-500), 0.2)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'var(--s-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--brand-dim)' }}
            >
              <span aria-hidden="true">💎</span> {credits}
            </div>
          </Link>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="User menu"
          aria-expanded={isOpen}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--brand-500)',
            color: 'var(--t1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '1rem',
            border: '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isOpen ? '0 0 0 2px var(--brand-400)' : 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {initial}
        </button>

        {isOpen && (
          <div
            className="a-fade-in"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '240px',
              background: '#0f172a',
              border: '1px solid var(--b1)',
              borderRadius: 'var(--r-md)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
              zIndex: 100,
              overflow: 'hidden',
            }}
          >
            {/* Email Header */}
            <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--b0)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--t3)', marginBottom: '0.125rem' }}>Signed in as</p>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--t1)',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={userEmail}
              >
                {userEmail}
              </p>
            </div>

            {/* Links */}
            <div style={{ padding: '0.5rem' }}>
              <Link
                href="/plans"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.75rem',
                  fontSize: '0.875rem',
                  color: 'var(--t1)',
                  textDecoration: 'none',
                  borderRadius: 'var(--r-sm)',
                  transition: 'background 0.2s',
                  background: 'var(--brand-dim)',
                  marginBottom: '0.25rem',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--brand-dim)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span aria-hidden="true">💎</span> Plans & Credits
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-400)' }}>
                  {credits !== null ? credits : '...'}
                </span>
              </Link>
              <Link
                href="/try-on"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.75rem', fontSize: '0.875rem',
                  color: 'var(--t1)', textDecoration: 'none',
                  borderRadius: 'var(--r-sm)', transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span aria-hidden="true">✨</span> Try-On
              </Link>
              <Link
                href="/history"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.75rem', fontSize: '0.875rem',
                  color: 'var(--t1)', textDecoration: 'none',
                  borderRadius: 'var(--r-sm)', transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span aria-hidden="true">🕘</span> History
              </Link>
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.75rem', fontSize: '0.875rem',
                  color: 'var(--t1)', textDecoration: 'none',
                  borderRadius: 'var(--r-sm)', transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span aria-hidden="true">⚙️</span> Settings
              </Link>

              {/* Instagram Connect */}
              <button
                onClick={() => { setIsOpen(false); setShowInstagramModal(true) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.75rem', fontSize: '0.875rem',
                  color: 'var(--t1)', background: 'transparent',
                  border: 'none', borderRadius: 'var(--r-sm)',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="url(#ig-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <defs>
                      <linearGradient id="ig-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f09433"/>
                        <stop offset="50%" stopColor="#dc2743"/>
                        <stop offset="100%" stopColor="#bc1888"/>
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                  Instagram
                </div>
                {instagramHandle ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#4ade80' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}/>
                    @{instagramHandle}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--t3)' }}>Connect</span>
                )}
              </button>
            </div>

            {/* Logout Footer */}
            <div style={{ padding: '0.5rem', borderTop: '1px solid var(--b0)' }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.75rem', fontSize: '0.875rem',
                  color: '#fca5a5', background: 'transparent',
                  border: 'none', borderRadius: 'var(--r-sm)',
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span aria-hidden="true">🚪</span> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
