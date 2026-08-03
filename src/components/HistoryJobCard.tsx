'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TryOnJob, TryOnJobStatus } from '@/lib/types'
import { useRouter } from 'next/navigation'

function StatusBadge({ status }: { status: TryOnJobStatus }) {
  const labels: Record<TryOnJobStatus, string> = {
    queued: 'Queued',
    processing: 'Generating',
    done: 'Done',
    error: 'Failed',
  }
  return <span className={`status-badge s-${status}`}>{labels[status]}</span>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function HistoryJobCard({ job }: { job: TryOnJob }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showIgModal, setShowIgModal] = useState(false)
  const [caption, setCaption] = useState('My AI Fashion Try-On ✨ #aifashion #virtualtryon #fashionai')
  const [isPosting, setIsPosting] = useState(false)
  const [postResult, setPostResult] = useState<{ type: 'success' | 'error', msg: string, link?: string } | null>(null)
  const router = useRouter()

  const handlePostToInstagram = async () => {
    setIsPosting(true)
    setPostResult(null)
    try {
      const res = await fetch('/api/instagram/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: job.output_image_url, caption })
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'token_expired' || (res.status === 400 && data.error.includes('connected'))) {
           setPostResult({ type: 'error', msg: data.message || data.error, link: '/instagram' })
        } else {
           throw new Error(data.error || 'Failed to post')
        }
        setIsPosting(false)
        return
      }

      setPostResult({ type: 'success', msg: 'Successfully posted!', link: data.post_url })
    } catch (err: any) {
      setPostResult({ type: 'error', msg: err.message })
    }
    setIsPosting(false)
  }

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this image?")) return
    setIsDeleting(true)
    
    try {
      const supabase = createClient()
      
      if (job.output_image_url) {
        const match = job.output_image_url.match(/\/outputs\/(.+)$/)
        if (match && match[1]) {
          const filePath = match[1]
          await supabase.storage.from('outputs').remove([filePath])
        }
      }

      const { error } = await supabase.from('tryon_jobs').delete().eq('id', job.id)
      if (error) throw error

      router.refresh()
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`)
      setIsDeleting(false)
    }
  }

  return (
    <>
      <article
        role="listitem"
        className="card feature-card-hover"
        style={{ overflow: 'hidden', opacity: isDeleting ? 0.5 : 1, transition: 'opacity 0.2s' }}
      >
        {/* Image area */}
        <div style={{ aspectRatio: '3/4', background: 'var(--s2)', position: 'relative', overflow: 'hidden' }}>
          {job.output_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.output_image_url}
              alt={job.garment_description ? `Try-on: ${job.garment_description}` : 'Try-on result'}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '0.5rem', color: 'var(--t3)',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '2.5rem' }}>
                {job.status === 'processing' ? '◎' : job.status === 'error' ? '✕' : '⏳'}
              </span>
              <span style={{ fontSize: '0.8125rem' }}>
                {job.status === 'error' ? 'Generation failed' : 'In progress…'}
              </span>
            </div>
          )}
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <StatusBadge status={job.status} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: 'clamp(0.75rem, 2vw, 1rem)' }}>
          {job.garment_description && (
            <p style={{
              fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {job.garment_description}
            </p>
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--t3)' }}>
            <time dateTime={job.created_at}>{formatDate(job.created_at)}</time>
          </p>

          {job.error_message && (
            <p style={{
              marginTop: '0.5rem', fontSize: '0.75rem', color: '#fca5a5',
              lineHeight: 1.5, overflow: 'hidden',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {job.error_message}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            {job.output_image_url && (
              <a
                href={job.output_image_url}
                download={`tryon-${job.id}.jpg`}
                className="btn-ghost"
                aria-label={`Download result: ${job.garment_description || job.id}`}
                style={{
                  flex: 1,
                  padding: '0.5rem', fontSize: '0.8125rem', justifyContent: 'center', textAlign: 'center'
                }}
              >
                <span aria-hidden="true">⬇</span> Download
              </a>
            )}
            {job.output_image_url && (
              <button
                onClick={() => setShowIgModal(!showIgModal)}
                style={{
                  flex: 1,
                  padding: '0.5rem', fontSize: '0.8125rem', justifyContent: 'center', textAlign: 'center',
                  border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)',
                  color: 'white', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                }}
                aria-label="Post to Instagram"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                Instagram
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn-ghost"
              style={{
                padding: '0.5rem', fontSize: '0.8125rem', justifyContent: 'center', textAlign: 'center', color: '#fca5a5'
              }}
              aria-label="Delete result"
              title="Delete this try-on completely"
            >
               <span aria-hidden="true">🗑️</span> Delete
            </button>
          </div>

          {/* Instagram Post Inline Modal */}
          {showIgModal && job.output_image_url && (
            <div style={{
              marginTop: '1rem', padding: '1rem',
              background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--r-sm)',
              border: '1px solid var(--b1)'
            }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Instagram Caption</p>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={isPosting || postResult?.type === 'success'}
                style={{
                  width: '100%', minHeight: '60px', padding: '0.5rem',
                  fontSize: '0.8125rem', borderRadius: '4px', border: '1px solid var(--b2)',
                  background: 'var(--s1)', color: 'var(--t1)', resize: 'vertical',
                  marginBottom: '0.75rem'
                }}
              />
              
              {postResult && (
                <div style={{
                  padding: '0.5rem', marginBottom: '0.75rem', borderRadius: '4px',
                  fontSize: '0.75rem',
                  background: postResult.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(252,165,165,0.1)',
                  color: postResult.type === 'success' ? '#4ade80' : '#fca5a5',
                  border: `1px solid ${postResult.type === 'success' ? 'rgba(74,222,128,0.2)' : 'rgba(252,165,165,0.2)'}`
                }}>
                  {postResult.msg}
                  {postResult.link && postResult.type === 'success' && (
                    <a href={postResult.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '4px', color: '#4ade80', textDecoration: 'underline' }}>
                      View on Instagram ↗
                    </a>
                  )}
                  {postResult.link && postResult.type === 'error' && (
                    <button onClick={() => router.push(postResult.link!)} style={{ display: 'block', marginTop: '6px', background: 'transparent', border: 'none', color: '#fca5a5', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                      Go to Instagram Settings →
                    </button>
                  )}
                </div>
              )}

              {!postResult || postResult.type === 'error' ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setShowIgModal(false)}
                    disabled={isPosting}
                    style={{
                      flex: 1, padding: '0.5rem', fontSize: '0.8125rem', borderRadius: '4px',
                      background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePostToInstagram}
                    disabled={isPosting}
                    style={{
                      flex: 2, padding: '0.5rem', fontSize: '0.8125rem', borderRadius: '4px',
                      background: 'linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)',
                      border: 'none', color: 'white', fontWeight: 600, cursor: isPosting ? 'wait' : 'pointer',
                      opacity: isPosting ? 0.7 : 1
                    }}
                  >
                    {isPosting ? 'Posting...' : 'Post to Instagram'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowIgModal(false)}
                  style={{
                    width: '100%', padding: '0.5rem', fontSize: '0.8125rem', borderRadius: '4px',
                    background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t1)', cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              )}
            </div>
          )}
        </div>
      </article>
    </>
  )
}
