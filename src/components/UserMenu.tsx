'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UserMenuProps {
  userEmail: string
}

export default function UserMenu({ userEmail }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : '?'

  useEffect(() => {
    const fetchCredits = async () => {
      if (!userEmail) return
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', user.id)
          .single()
        if (data) setCredits(data.credits)
      }
    }
    fetchCredits()
  }, [userEmail])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setIsOpen(false)
    router.push('/')
    router.refresh()
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
    <div className="user-menu-container" ref={menuRef} style={{ position: 'relative' }}>
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
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
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
            background: 'var(--s-card)',
            border: '1px solid var(--b1)',
            borderRadius: 'var(--r-md)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(16px)',
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.75rem',
                fontSize: '0.875rem',
                color: 'var(--t1)',
                textDecoration: 'none',
                borderRadius: 'var(--r-sm)',
                transition: 'background 0.2s',
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.75rem',
                fontSize: '0.875rem',
                color: 'var(--t1)',
                textDecoration: 'none',
                borderRadius: 'var(--r-sm)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--s-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span aria-hidden="true">🕘</span> History
            </Link>
          </div>

          {/* Logout Footer */}
          <div style={{ padding: '0.5rem', borderTop: '1px solid var(--b0)' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.75rem',
                fontSize: '0.875rem',
                color: '#fca5a5',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s',
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
  )
}
