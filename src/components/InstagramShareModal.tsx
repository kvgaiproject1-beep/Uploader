'use client'

import { useState } from 'react'

interface InstagramShareModalProps {
  imageUrl: string
  onClose: () => void
}

export function InstagramShareModal({ imageUrl, onClose }: InstagramShareModalProps) {
  const [step, setStep] = useState<'preview' | 'instructions'>('preview')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const caption = "My AI Fashion Try-On 👕✨ #aifashion #virtualtryon #fashionai"

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const fetchUrl = imageUrl.startsWith('http')
        ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
        : imageUrl
      const res = await fetch(fetchUrl)
      const blob = await res.blob()
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
    setStep('instructions')
  }

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openInstagramWeb = () => {
    window.open('https://www.instagram.com/', '_blank')
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
        padding: '1rem',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="a-fade-in"
        style={{
          background: 'var(--s-card)',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--b1)',
          width: '100%',
          maxWidth: 480,
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--b0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>Share to Instagram</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', color: 'white', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
        </div>

        {step === 'preview' ? (
          <div style={{ padding: '1.5rem' }}>
            {/* Image preview */}
            <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: '1.25rem', background: '#111', maxHeight: 280, display: 'flex', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Try-on result" style={{ maxHeight: 280, objectFit: 'contain', display: 'block' }} />
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--t2)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Instagram doesn&apos;t allow direct browser uploads. Here&apos;s the fastest 2-step process:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ background: 'var(--s-overlay)', borderRadius: 'var(--r-md)', padding: '1rem', border: '1px solid var(--b1)', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #f09433, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>1</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Download your image</div>
                  <div style={{ color: 'var(--t3)', fontSize: '0.8125rem' }}>Save it to your device with one click</div>
                </div>
              </div>
              <div style={{ background: 'var(--s-overlay)', borderRadius: 'var(--r-md)', padding: '1rem', border: '1px solid var(--b1)', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #f09433, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>2</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Open Instagram &amp; post</div>
                  <div style={{ color: 'var(--t3)', fontSize: '0.8125rem' }}>We&apos;ll open Instagram for you and copy the caption</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                width: '100%', marginTop: '1.25rem', padding: '0.875rem', fontWeight: 700, fontSize: '0.9375rem',
                border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer',
                background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              {downloading ? '⏳ Downloading...' : '⬇ Download Image & Continue'}
            </button>
          </div>
        ) : (
          <div style={{ padding: '1.5rem' }}>
            <div style={{
              background: 'rgba(134, 239, 172, 0.1)', border: '1px solid rgba(134, 239, 172, 0.3)',
              borderRadius: 'var(--r-md)', padding: '0.875rem', marginBottom: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span style={{ fontSize: '1.25rem' }}>✅</span>
              <span style={{ color: '#86efac', fontWeight: 600, fontSize: '0.9rem' }}>Image downloaded! Now post to Instagram.</span>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: '0.5rem' }}>SUGGESTED CAPTION</label>
              <div style={{
                background: 'var(--s-overlay)', borderRadius: 'var(--r-md)', padding: '0.875rem',
                border: '1px solid var(--b1)', fontSize: '0.875rem', color: 'var(--t1)', lineHeight: 1.6,
                position: 'relative',
              }}>
                {caption}
                <button
                  onClick={handleCopyCaption}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: copied ? 'rgba(134,239,172,0.15)' : 'var(--s-card)',
                    border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
                    padding: '0.25rem 0.625rem', fontSize: '0.75rem', cursor: 'pointer',
                    color: copied ? '#86efac' : 'var(--t2)', fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={openInstagramWeb}
                style={{
                  width: '100%', padding: '0.875rem', fontWeight: 700, fontSize: '0.9375rem',
                  border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                Open Instagram to Post
              </button>

              <button
                onClick={onClose}
                className="btn-ghost"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Done
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--t3)', textAlign: 'center', marginTop: '1rem', lineHeight: 1.6 }}>
              On Instagram: tap the + button → Post → select the downloaded image → paste the caption → Share!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
