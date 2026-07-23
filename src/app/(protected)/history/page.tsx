import { createClient } from '@/lib/supabase/server'
import type { TryOnJob, TryOnJobStatus } from '@/lib/types'
import Link from 'next/link'

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

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: jobs } = await supabase
    .from('tryon_jobs')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const typedJobs = (jobs ?? []) as TryOnJob[]

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem) clamp(0.75rem, 3vw, 1.5rem)' }}>

      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 'clamp(1.25rem, 3vw, 2rem)', flexWrap: 'wrap', gap: '1rem',
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{ fontSize: 'clamp(1.35rem, 3vw, 2rem)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.25rem' }}
          >
            Your Try-Ons
          </h1>
          <p style={{ color: 'var(--t2)', fontSize: '0.9375rem' }}>
            {typedJobs.length === 0
              ? 'No try-ons yet. Generate your first one!'
              : `${typedJobs.length} generation${typedJobs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/try-on"
          className="btn-primary"
          style={{ padding: '0.75rem 1.5rem', fontSize: '0.9375rem' }}
        >
          <span aria-hidden="true">✨</span> New Try-On
        </Link>
      </div>

      {/* Empty State */}
      {typedJobs.length === 0 && (
        <div
          className="card"
          style={{
            padding: 'clamp(2.5rem, 6vw, 4.5rem) clamp(1.5rem, 4vw, 2.5rem)',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
          }}
        >
          <div aria-hidden="true" style={{ fontSize: '4rem' }}>🪄</div>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            No generations yet
          </h2>
          <p style={{ color: 'var(--t2)', maxWidth: 360, lineHeight: 1.7 }}>
            Upload your photo and a garment on the Try-On page to generate your first photorealistic preview.
          </p>
          <Link
            href="/try-on"
            className="btn-primary"
            style={{ padding: '0.875rem 2rem', marginTop: '0.5rem' }}
          >
            Start Try-On <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      {/* Jobs Grid */}
      {typedJobs.length > 0 && (
        <div
          role="list"
          aria-label="Try-on results"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
            gap: 'clamp(0.75rem, 2vw, 1.25rem)',
          }}
        >
          {typedJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}

function JobCard({ job }: { job: TryOnJob }) {
  return (
    <article
      role="listitem"
      className="card feature-card-hover"
      style={{ overflow: 'hidden' }}
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

        {job.output_image_url && (
          <a
            href={job.output_image_url}
            download={`tryon-${job.id}.jpg`}
            className="btn-ghost"
            aria-label={`Download result: ${job.garment_description || job.id}`}
            style={{
              marginTop: '0.75rem', width: '100%',
              padding: '0.5rem', fontSize: '0.8125rem', justifyContent: 'center',
            }}
          >
            <span aria-hidden="true">⬇</span> Download
          </a>
        )}
      </div>
    </article>
  )
}
