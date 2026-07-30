'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TryOnJob, TryOnJobStatus } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { InstagramShareModal } from './InstagramShareModal'

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
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const router = useRouter()

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
      {shareUrl && (
        <InstagramShareModal
          imageUrl={shareUrl}
          onClose={() => setShareUrl(null)}
        />
      )}

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
                onClick={() => setShareUrl(job.output_image_url!)}
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
        </div>
      </article>
    </>
  )
}
