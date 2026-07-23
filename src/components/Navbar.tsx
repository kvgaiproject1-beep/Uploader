'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import UserMenu from '@/components/UserMenu'

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

      {/* User Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <UserMenu userEmail={userEmail} />
      </div>
    </header>
  )
}
