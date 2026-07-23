'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NavbarProps {
  userEmail: string
}

export default function Navbar({ userEmail }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header
      id="app-navbar"
      role="banner"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'clamp(0.6rem, 1.5vw, 0.875rem) clamp(1rem, 4vw, 2.5rem)',
        borderBottom: '1px solid var(--b0)',
        background: 'var(--s-overlay)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        gap: '0.75rem',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="font-display"
        aria-label="FashionAI home"
        style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <span className="gradient-text">Fashion</span>
        <span style={{ color: 'var(--t1)' }}>AI</span>
      </Link>

      {/* Nav */}
      <nav aria-label="Application" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 1.5vw, 1.25rem)' }}>
        <Link href="/try-on" className={`nav-link ${pathname === '/try-on' ? 'active' : ''}`} aria-current={pathname === '/try-on' ? 'page' : undefined}>
          <span aria-hidden="true">✨</span> Try&nbsp;On
        </Link>
        <Link href="/history" className={`nav-link ${pathname === '/history' ? 'active' : ''}`} aria-current={pathname === '/history' ? 'page' : undefined}>
          <span aria-hidden="true">🕘</span> History
        </Link>
      </nav>

      {/* User + Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
        <span
          aria-label={`Signed in as ${userEmail}`}
          style={{
            fontSize: '0.8125rem',
            color: 'var(--t3)',
            maxWidth: 'clamp(80px, 12vw, 160px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'none',
          }}
          className="user-email-lg"
        >
          {userEmail}
        </span>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="btn-danger"
          aria-label="Sign out"
        >
          Sign&nbsp;Out
        </button>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .user-email-lg { display: inline !important; }
        }
      `}</style>
    </header>
  )
}
