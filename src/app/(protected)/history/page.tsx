import { createClient } from '@/lib/supabase/server'
import type { TryOnJob } from '@/lib/types'
import Link from 'next/link'
import { HistoryJobCard } from '@/components/HistoryJobCard'

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
            <HistoryJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}

