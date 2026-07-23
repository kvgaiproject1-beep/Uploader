import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import UserMenu from '@/components/UserMenu'

const steps = [
  {
    icon: '📸',
    num: '01',
    title: 'Upload Your Photo',
    desc: 'Take a clear, full-body photo. Our AI automatically detects your pose and body shape for the best result.',
  },
  {
    icon: '👗',
    num: '02',
    title: 'Pick a Garment',
    desc: 'Browse our curated catalog or upload any clothing item — tops, dresses, jackets — we handle them all.',
  },
  {
    icon: '✨',
    num: '03',
    title: 'See the Magic',
    desc: 'Get a photorealistic preview of yourself wearing the garment in seconds, powered by state-of-the-art diffusion AI.',
  },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main style={{ minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
      {/* Animated background orbs */}
      <div className="bg-orb bg-orb-1" aria-hidden="true" />
      <div className="bg-orb bg-orb-2" aria-hidden="true" />
      <div className="bg-orb bg-orb-3" aria-hidden="true" />

      {/* ── Header ──────────────────────────────────────── */}
      <header
        role="banner"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'clamp(0.75rem, 2vw, 1rem) clamp(1rem, 4vw, 2.5rem)',
          borderBottom: '1px solid var(--b0)',
          background: 'var(--s-overlay)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <Link
          href="/"
          className="font-display"
          aria-label="FashionAI home"
          style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            textDecoration: 'none',
          }}
        >
          <span className="gradient-text">Fashion</span>
          <span style={{ color: 'var(--t1)' }}>AI</span>
        </Link>

        <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user ? (
            <>
              <Link
                href="/try-on"
                className="btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
              >
                Go to Try-On
                <span aria-hidden="true">→</span>
              </Link>
              <UserMenu userEmail={user.email ?? ''} />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-ghost"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
              >
                Get Started
                <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-heading"
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 'clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 2rem) clamp(2rem, 6vw, 5rem)',
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        {/* Pill badge */}
        <div className="a-fade-up" style={{ marginBottom: '1.75rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--brand-dim)',
              border: '1px solid var(--b-brand)',
              borderRadius: 'var(--r-full)',
              padding: '0.375rem 1rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--brand-400)',
              letterSpacing: '0.02em',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--brand-400)',
                display: 'inline-block',
                boxShadow: '0 0 10px var(--brand-500)',
              }}
            />
            Powered by Diffusion AI
          </span>
        </div>

        <h1
          id="hero-heading"
          className="font-display a-fade-up-1"
          style={{
            fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
            fontWeight: 800,
            lineHeight: 1.06,
            letterSpacing: '-0.035em',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}
        >
          Try on any outfit.
          <br />
          <span
            className="gradient-text"
            style={{ fontStyle: 'italic' }}
          >
            Instantly.
          </span>
        </h1>

        <p
          className="a-fade-up-2"
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: 'var(--t2)',
            maxWidth: 520,
            lineHeight: 1.75,
            marginBottom: '2.5rem',
            textAlign: 'center',
          }}
        >
          Upload your photo, pick a garment, and see a photorealistic AI&#8209;generated
          preview — no fitting room, no returns.
        </p>

        <div
          className="a-fade-up-3"
          style={{
            display: 'flex',
            gap: '0.875rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: '3rem',
          }}
        >
          {user ? (
            <Link
              href="/try-on"
              className="btn-primary"
              style={{ padding: '0.9rem 2.25rem', fontSize: '1.0625rem' }}
            >
              Go to Try-On <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="btn-primary"
              style={{ padding: '0.9rem 2.25rem', fontSize: '1.0625rem' }}
            >
              Start Free <span aria-hidden="true">→</span>
            </Link>
          )}
          <a
            href="#how-it-works"
            className="btn-ghost"
            style={{ padding: '0.9rem 2.25rem', fontSize: '1.0625rem' }}
          >
            How It Works
          </a>
        </div>

        <p
          className="a-fade-up-4"
          style={{ fontSize: '0.8rem', color: 'var(--t3)', letterSpacing: '0.02em' }}
        >
          No credit card &nbsp;·&nbsp; Free tier available &nbsp;·&nbsp; Results in&nbsp;~30&thinsp;s
        </p>
      </section>

      {/* ── How It Works ────────────────────────────────── */}
      <section
        id="how-it-works"
        aria-labelledby="steps-heading"
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 1120,
          margin: '0 auto',
          padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 2rem) clamp(4rem, 8vw, 7rem)',
        }}
      >
        <h2
          id="steps-heading"
          className="font-display"
          style={{
            textAlign: 'center',
            fontSize: 'clamp(1.5rem, 4vw, 2.75rem)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            marginBottom: '0.5rem',
          }}
        >
          How it works
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--t2)', marginBottom: 'clamp(2rem, 4vw, 3.5rem)', fontSize: '1.05rem' }}>
          Three steps from photo to preview
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
            gap: 'clamp(1rem, 2vw, 1.5rem)',
          }}
        >
          {steps.map((s) => (
            <article
              key={s.num}
              className="card feature-card-hover"
              style={{ padding: 'clamp(1.5rem, 3vw, 2.25rem)', cursor: 'default' }}
            >
              <div
                aria-hidden="true"
                style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', marginBottom: '1.25rem' }}
              >
                {s.icon}
              </div>
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--brand-400)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: '0.375rem',
                }}
              >
                Step {s.num}
              </div>
              <h3
                className="font-display"
                style={{ fontSize: 'clamp(1.05rem, 2vw, 1.25rem)', fontWeight: 700, marginBottom: '0.625rem' }}
              >
                {s.title}
              </h3>
              <p style={{ color: 'var(--t2)', lineHeight: 1.75, fontSize: '0.9375rem' }}>
                {s.desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────── */}
      <section
        aria-label="Call to action"
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 860,
          margin: '0 auto clamp(3rem, 6vw, 6rem)',
          padding: '0 clamp(1rem, 4vw, 2rem)',
        }}
      >
        <div className="card-gb" style={{ padding: 'clamp(2rem, 5vw, 3.5rem) clamp(1.5rem, 4vw, 2.5rem)', textAlign: 'center' }}>
          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(1.25rem, 3vw, 2.25rem)',
              fontWeight: 700,
              marginBottom: '0.875rem',
              letterSpacing: '-0.02em',
            }}
          >
            Ready to try it on?
          </h2>
          <p style={{ color: 'var(--t2)', marginBottom: '2rem', fontSize: '1.05rem', maxWidth: 420, margin: '0 auto 2rem' }}>
            Sign up in seconds — no credit card, no downloads, just AI&nbsp;magic.
          </p>
          {user ? (
            <Link
              href="/try-on"
              className="btn-primary"
              style={{ padding: '1rem 2.75rem', fontSize: '1.0625rem' }}
            >
              Go to Try-On <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="btn-primary"
              style={{ padding: '1rem 2.75rem', fontSize: '1.0625rem' }}
            >
              Get Started Free <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer
        role="contentinfo"
        style={{
          position: 'relative',
          zIndex: 10,
          borderTop: '1px solid var(--b0)',
          padding: 'clamp(1.5rem, 3vw, 2rem) clamp(1rem, 4vw, 2rem)',
          textAlign: 'center',
        }}
      >
        <p style={{ color: 'var(--t3)', fontSize: '0.8125rem' }}>
          © {new Date().getFullYear()} FashionAI &nbsp;·&nbsp; Powered&nbsp;by Hugging&nbsp;Face ZeroGPU
        </p>
      </footer>
    </main>
  )
}
