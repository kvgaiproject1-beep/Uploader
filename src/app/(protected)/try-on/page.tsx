'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Garment } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

type Status = 'idle' | 'uploading' | 'queued' | 'processing' | 'done' | 'error'

interface GradioImageOutput {
  url?: string
  path?: string
}

const STATUS_UI: Record<Status, { label: string; color: string; icon: string; cssClass: string }> = {
  idle:       { label: 'Ready',      color: 'var(--t3)',    icon: '○', cssClass: '' },
  uploading:  { label: 'Uploading…', color: 'var(--c-info)',icon: '⬆', cssClass: 'queued' },
  queued:     { label: 'Queued',     color: 'var(--c-info)',icon: '○', cssClass: 'queued' },
  processing: { label: 'Generating', color: 'var(--c-warn)',icon: '◎', cssClass: 'processing' },
  done:       { label: 'Done',       color: 'var(--c-success)', icon: '✓', cssClass: 'done' },
  error:      { label: 'Error',      color: 'var(--c-error)',   icon: '✕', cssClass: 'error' },
}

export default function TryOnPage() {
  const [user, setUser] = useState<User | null>(null)
  const [garments, setGarments] = useState<Garment[]>([])

  // Inputs
  const [humanFile, setHumanFile] = useState<File | null>(null)
  const [humanPreview, setHumanPreview] = useState<string | null>(null)
  const [garmentFile, setGarmentFile] = useState<File | null>(null)
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null)
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null)
  const [description, setDescription] = useState('')
  const [garmentTab, setGarmentTab] = useState<'catalog' | 'upload'>('catalog')

  // Generation state
  const [status, setStatus] = useState<Status>('idle')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Drag states
  const [humanDragging, setHumanDragging] = useState(false)
  const [garmentDragging, setGarmentDragging] = useState(false)

  // File input refs — fixes the "rigged upload button" bug
  const humanInputRef = useRef<HTMLInputElement>(null)
  const garmentInputRef = useRef<HTMLInputElement>(null)

  // Abort controller for cancelling generation
  const abortRef = useRef<AbortController | null>(null)

  // ── Load user + catalog ─────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    supabase
      .from('garments')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setGarments(data) })
  }, [])

  // ── File handlers ───────────────────────────────────────
  const loadHuman = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setHumanFile(file)
    const url = URL.createObjectURL(file)
    setHumanPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
  }, [])

  const loadGarment = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setGarmentFile(file)
    setGarmentPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file) })
    setSelectedGarment(null)
  }, [])

  const selectCatalog = useCallback((g: Garment) => {
    setSelectedGarment(g)
    setGarmentPreview(g.image_url)
    setGarmentFile(null)
    setDescription(g.description)
  }, [])

  const clearHuman = useCallback(() => {
    if (humanPreview) URL.revokeObjectURL(humanPreview)
    setHumanFile(null)
    setHumanPreview(null)
    if (humanInputRef.current) humanInputRef.current.value = ''
  }, [humanPreview])

  const clearGarment = useCallback(() => {
    if (garmentPreview && !selectedGarment) URL.revokeObjectURL(garmentPreview)
    setGarmentFile(null)
    setGarmentPreview(null)
    setSelectedGarment(null)
    if (garmentInputRef.current) garmentInputRef.current.value = ''
  }, [garmentPreview, selectedGarment])

  // ── Drop helpers ────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent, loader: (f: File) => void, setDrag: (v: boolean) => void) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) loader(file)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault() }, [])

  // ── Generate ────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!humanFile || (!garmentFile && !selectedGarment) || !user) return
    if (isGenerating) return

    const abort = new AbortController()
    abortRef.current = abort

    setIsGenerating(true)
    setStatus('uploading')
    setErrorMsg(null)
    setResultUrl(null)
    setJobId(null)

    const supabase = createClient()
    const ts = Date.now()
    let currentJobId: string | null = null

    try {
      // 1. Upload human photo
      const humanPath = `${user.id}/human-${ts}.jpg`
      const { error: humanUpErr } = await supabase.storage
        .from('uploads')
        .upload(humanPath, humanFile, { contentType: humanFile.type })
      if (humanUpErr) throw new Error(`Human photo upload failed: ${humanUpErr.message}`)

      // 2. Upload custom garment if needed
      let garmentStoragePath: string | null = null
      let garmentPublicUrl = selectedGarment?.image_url ?? null

      if (garmentFile && !selectedGarment) {
        garmentStoragePath = `${user.id}/garment-${ts}.jpg`
        const { error: garmUpErr } = await supabase.storage
          .from('uploads')
          .upload(garmentStoragePath, garmentFile, { contentType: garmentFile.type })
        if (garmUpErr) throw new Error(`Garment upload failed: ${garmUpErr.message}`)
        garmentPublicUrl = garmentStoragePath
      }

      // 3. Create job row
      setStatus('queued')
      const { data: job, error: jobErr } = await supabase
        .from('tryon_jobs')
        .insert({
          user_id: user.id,
          human_image_url: humanPath,
          garment_image_url: garmentPublicUrl ?? garmentStoragePath,
          garment_description: description || null,
          status: 'queued',
        })
        .select()
        .single()
      if (jobErr) throw new Error(`Failed to create job: ${jobErr.message}`)
      currentJobId = job.id
      setJobId(job.id)

      // 4. Processing
      if (abort.signal.aborted) throw new DOMException('Cancelled', 'AbortError')
      setStatus('processing')
      await supabase.from('tryon_jobs').update({ status: 'processing' }).eq('id', job.id)

      // 5. Call HF Space via Gradio (browser-side — no Vercel timeout)
      if (abort.signal.aborted) throw new DOMException('Cancelled', 'AbortError')
      const { Client } = await import('@gradio/client')
      const client = await Client.connect(process.env.NEXT_PUBLIC_HF_SPACE_ID!)

      const garmentInput = garmentFile ?? (await fetchBlob(selectedGarment!.image_url))

      const result = await client.predict('/tryon', [
        { background: humanFile, layers: [], composite: null },
        garmentInput,
        description || 'a garment',
        true,   // auto-mask
        false,  // crop
        30,     // denoise_steps
        42,     // seed
        false,  // auto_post_instagram
        '',     // caption
      ])
      if (abort.signal.aborted) throw new DOMException('Cancelled', 'AbortError')

      // 6. Extract result
      const raw = (result.data as unknown[])[0] as GradioImageOutput | string | null
      if (!raw) throw new Error('No output image returned from AI model')
      const outputUrl = typeof raw === 'string' ? raw : raw.url ?? raw.path ?? null
      if (!outputUrl) throw new Error('Could not extract output image URL')

      // 7. Re-upload to Supabase public outputs
      const outputResponse = await fetch(outputUrl)
      if (!outputResponse.ok) throw new Error('Failed to download result image')
      const outputBlob = await outputResponse.blob()

      const outputPath = `${user.id}/result-${job.id}.jpg`
      const { error: outUpErr } = await supabase.storage
        .from('outputs')
        .upload(outputPath, outputBlob, { contentType: 'image/jpeg', upsert: true })
      if (outUpErr) throw new Error(`Failed to save result: ${outUpErr.message}`)

      const { data: { publicUrl } } = supabase.storage.from('outputs').getPublicUrl(outputPath)

      // 8. Mark done
      await supabase.from('tryon_jobs').update({
        status: 'done',
        output_image_url: publicUrl,
        completed_at: new Date().toISOString(),
      }).eq('id', job.id)

      setResultUrl(publicUrl)
      setStatus('done')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setErrorMsg('Generation cancelled.')
        setStatus('idle')
        if (currentJobId) {
          await supabase.from('tryon_jobs').update({ status: 'error', error_message: 'Cancelled by user' }).eq('id', currentJobId)
        }
      } else {
        const msg = err instanceof Error ? err.message : 'Generation failed. Please try again.'
        setErrorMsg(msg)
        setStatus('error')
        if (currentJobId) {
          await supabase.from('tryon_jobs').update({ status: 'error', error_message: msg }).eq('id', currentJobId)
        }
      }
    } finally {
      abortRef.current = null
      setIsGenerating(false)
    }
  }

  const canGenerate = !!humanFile && (!!garmentFile || !!selectedGarment) && !isGenerating
  const ui = STATUS_UI[status]

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem) clamp(0.75rem, 3vw, 1.5rem)' }}>
      {/* Hidden file inputs — triggered via ref */}
      <input
        ref={humanInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => { if (e.target.files?.[0]) loadHuman(e.target.files[0]) }}
      />
      <input
        ref={garmentInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => { if (e.target.files?.[0]) loadGarment(e.target.files[0]) }}
      />

      {/* Page header */}
      <div style={{ marginBottom: 'clamp(1.25rem, 3vw, 2rem)' }}>
        <h1
          className="font-display"
          style={{ fontSize: 'clamp(1.35rem, 3vw, 2rem)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.25rem' }}
        >
          Virtual Try-On
        </h1>
        <p style={{ color: 'var(--t2)', fontSize: '0.9375rem' }}>
          Upload your photo and a garment to see a photorealistic AI preview.
        </p>
      </div>

      {/* ── 2-col Layout ──────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
          gap: 'clamp(1rem, 2vw, 1.5rem)',
          alignItems: 'start',
        }}
      >
        {/* ═══ LEFT: Inputs ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.875rem, 2vw, 1.25rem)' }}>

          {/* ── Human Photo ──────────────────────────── */}
          <section className="card" style={{ padding: 'clamp(1rem, 2.5vw, 1.5rem)' }} aria-labelledby="human-label">
            <div id="human-label" className="section-label">
              <span aria-hidden="true">📸</span> Your Photo
            </div>
            {humanPreview ? (
              <div style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden' }} className="a-fade-in">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={humanPreview}
                  alt="Your uploaded photo"
                  style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
                />
                <button
                  onClick={clearHuman}
                  aria-label="Remove photo"
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                    border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
                    color: 'var(--t1)', padding: '0.3rem 0.7rem',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    minHeight: 32,
                    transition: 'background 150ms var(--ease-out)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget.style.background = 'rgba(239,68,68,0.5)') }}
                  onMouseLeave={(e) => { (e.currentTarget.style.background = 'rgba(0,0,0,0.7)') }}
                >
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                className={`upload-zone ${humanDragging ? 'dragging' : ''}`}
                aria-label="Upload your photo — drag and drop or click to browse"
                onClick={() => humanInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); humanInputRef.current?.click() } }}
                onDragOver={handleDragOver}
                onDragEnter={() => setHumanDragging(true)}
                onDragLeave={() => setHumanDragging(false)}
                onDrop={(e) => handleDrop(e, loadHuman, setHumanDragging)}
              >
                <span className="upload-zone-icon" aria-hidden="true">🧍</span>
                <span className="upload-title">Upload your photo</span>
                <span className="upload-hint">Full-body photo works best</span>
                <span className="upload-browse" aria-hidden="true">Browse files</span>
              </div>
            )}
          </section>

          {/* ── Garment ──────────────────────────────── */}
          <section className="card" style={{ padding: 'clamp(1rem, 2.5vw, 1.5rem)' }} aria-labelledby="garment-label">
            <div id="garment-label" className="section-label">
              <span aria-hidden="true">👗</span> Garment
            </div>

            {/* Tab switcher */}
            <div className="tab-group" role="tablist" aria-label="Garment source" style={{ marginBottom: '1rem' }}>
              <button
                role="tab"
                id="tab-catalog"
                aria-selected={garmentTab === 'catalog'}
                aria-controls="panel-catalog"
                className={`tab-btn ${garmentTab === 'catalog' ? 'active' : ''}`}
                onClick={() => setGarmentTab('catalog')}
              >
                Catalog
              </button>
              <button
                role="tab"
                id="tab-upload"
                aria-selected={garmentTab === 'upload'}
                aria-controls="panel-upload"
                className={`tab-btn ${garmentTab === 'upload' ? 'active' : ''}`}
                onClick={() => setGarmentTab('upload')}
              >
                Upload
              </button>
            </div>

            {/* Catalog panel */}
            <div
              role="tabpanel"
              id="panel-catalog"
              aria-labelledby="tab-catalog"
              hidden={garmentTab !== 'catalog'}
            >
              {garments.length === 0 ? (
                <div
                  style={{
                    border: '1px dashed var(--b1)', borderRadius: 'var(--r-md)',
                    padding: 'clamp(1.5rem, 3vw, 2.5rem)', textAlign: 'center',
                    color: 'var(--t3)', fontSize: '0.875rem',
                  }}
                >
                  <div aria-hidden="true" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📭</div>
                  <p>No garments in catalog yet.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Add rows to the <code style={{ color: 'var(--brand-400)', fontSize: '0.75rem' }}>garments</code> table in Supabase.
                  </p>
                </div>
              ) : (
                <div className="garment-grid">
                  {garments.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={`garment-thumb ${selectedGarment?.id === g.id ? 'selected' : ''}`}
                      onClick={() => selectCatalog(g)}
                      aria-label={g.description}
                      aria-pressed={selectedGarment?.id === g.id}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.image_url} alt="" />
                      {selectedGarment?.id === g.id && (
                        <span className="garment-selected-mark" aria-hidden="true">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Upload panel */}
            <div
              role="tabpanel"
              id="panel-upload"
              aria-labelledby="tab-upload"
              hidden={garmentTab !== 'upload'}
            >
              {garmentPreview && !selectedGarment ? (
                <div style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden' }} className="a-fade-in">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={garmentPreview}
                    alt="Uploaded garment"
                    style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    onClick={clearGarment}
                    aria-label="Remove garment"
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                      border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
                      color: 'var(--t1)', padding: '0.3rem 0.7rem',
                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      minHeight: 32,
                      transition: 'background 150ms var(--ease-out)',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget.style.background = 'rgba(239,68,68,0.5)') }}
                    onMouseLeave={(e) => { (e.currentTarget.style.background = 'rgba(0,0,0,0.7)') }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  className={`upload-zone ${garmentDragging ? 'dragging' : ''}`}
                  aria-label="Upload garment image — drag and drop or click to browse"
                  onClick={() => garmentInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); garmentInputRef.current?.click() } }}
                  onDragOver={handleDragOver}
                  onDragEnter={() => setGarmentDragging(true)}
                  onDragLeave={() => setGarmentDragging(false)}
                  onDrop={(e) => handleDrop(e, loadGarment, setGarmentDragging)}
                >
                  <span className="upload-zone-icon" aria-hidden="true">👗</span>
                  <span className="upload-title">Upload garment</span>
                  <span className="upload-hint">Flat-lay or model shot</span>
                  <span className="upload-browse" aria-hidden="true">Browse files</span>
                </div>
              )}
            </div>

            {/* Description */}
            {(garmentFile || selectedGarment) && (
              <div style={{ marginTop: '1rem' }} className="a-fade-in">
                <label htmlFor="garment-desc" className="form-label">
                  Description <span style={{ fontWeight: 400, color: 'var(--t3)' }}>(optional)</span>
                </label>
                <textarea
                  id="garment-desc"
                  className="input-field"
                  placeholder="e.g. blue denim jacket with white stitching"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </section>

          {/* Generate / Cancel buttons */}
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button
              id="generate-tryon-btn"
              className="btn-primary"
              onClick={handleGenerate}
              disabled={!canGenerate}
              aria-busy={isGenerating}
              aria-label={isGenerating ? 'Generating try-on preview' : 'Generate try-on preview'}
              style={{ flex: 1, padding: '1rem', fontSize: '1rem', justifyContent: 'center' }}
            >
              {isGenerating ? (
                <>
                  <span className="a-spin" aria-hidden="true" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block' }} />
                  {status === 'uploading' ? 'Uploading…' : status === 'queued' ? 'Queued…' : 'Generating…'}
                </>
              ) : (
                <>
                  <span aria-hidden="true">✨</span> Generate Try-On
                </>
              )}
            </button>
            {isGenerating && (
              <button
                id="cancel-tryon-btn"
                className="btn-danger"
                onClick={() => { abortRef.current?.abort() }}
                aria-label="Cancel generation"
                style={{ padding: '1rem 1.25rem', fontSize: '0.9375rem', justifyContent: 'center', minWidth: 100 }}
              >
                ✕ Cancel
              </button>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Result ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.875rem, 2vw, 1.25rem)' }}>

          {/* Status indicator */}
          {status !== 'idle' && (
            <div
              className="card-sm a-fade-in"
              role="status"
              aria-live="polite"
              style={{ padding: '0.875rem 1.125rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <span className={`status-dot ${ui.cssClass}`} aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: ui.color }}>{ui.label}</div>
                {status === 'processing' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--t3)', marginTop: '2px' }}>
                    This may take 20–90&thinsp;s. The model warms up on first use.
                  </div>
                )}
                {status === 'error' && errorMsg && (
                  <div style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '2px', wordBreak: 'break-word' }}>
                    {errorMsg}
                  </div>
                )}
                {status === 'done' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--t3)', marginTop: '2px' }}>
                    Saved ·{' '}
                    <a href="/history" style={{ color: 'var(--brand-400)', textDecoration: 'none' }}>View history</a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Result panel */}
          <section className="card" style={{ padding: 'clamp(1rem, 2.5vw, 1.5rem)', flex: 1 }} aria-labelledby="result-label">
            <div id="result-label" className="section-label">
              <span aria-hidden="true">🖼</span> Result
            </div>

            {resultUrl ? (
              <div className="a-result">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultUrl}
                  alt="AI-generated try-on result"
                  style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 'var(--r-md)', display: 'block' }}
                />
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn-primary"
                    aria-label="Download result image"
                    style={{ flex: 1, padding: '0.75rem', justifyContent: 'center', fontSize: '0.9375rem' }}
                    onClick={async () => {
                      try {
                        const res = await fetch(resultUrl!)
                        const blob = await res.blob()
                        const blobUrl = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = blobUrl
                        a.download = 'tryon-result.jpg'
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(blobUrl)
                      } catch { /* fallback: open in new tab */ window.open(resultUrl!, '_blank') }
                    }}
                  >
                    <span aria-hidden="true">⬇</span> Download
                  </button>
                  <button
                    onClick={() => { setStatus('idle'); setResultUrl(null); setJobId(null); setErrorMsg(null) }}
                    className="btn-ghost"
                    style={{ flex: 1, padding: '0.75rem', justifyContent: 'center', fontSize: '0.9375rem' }}
                  >
                    Try Another
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="result-placeholder"
                role="img"
                aria-label={isGenerating ? 'Generating result…' : 'Result placeholder'}
              >
                <span aria-hidden="true" style={{ fontSize: '3rem', opacity: isGenerating ? 1 : 0.6 }}>
                  {isGenerating ? '◎' : '🪄'}
                </span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                  {isGenerating ? 'AI is working its magic…' : 'Your result will appear here'}
                </span>
                <span style={{ fontSize: '0.8125rem' }}>
                  {isGenerating ? 'Results in ~30–90 seconds' : 'Fill in the left panel and click Generate'}
                </span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not fetch garment image: ${url}`)
  return res.blob()
}
