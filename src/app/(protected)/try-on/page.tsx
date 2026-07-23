'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

type Status = 'idle' | 'uploading' | 'queued' | 'processing' | 'done' | 'error'

interface GradioImageOutput {
  url?: string
  path?: string
}

const LOCAL_GARMENTS = [
  '/catalog/garments/04469_00.jpg',
  '/catalog/garments/04743_00.jpg',
  '/catalog/garments/09133_00.jpg',
  '/catalog/garments/09163_00.jpg',
  '/catalog/garments/09164_00.jpg',
  '/catalog/garments/09166_00.jpg',
  '/catalog/garments/09176_00.jpg',
  '/catalog/garments/09236_00.jpg',
]

const LOCAL_MODELS = [
  '/catalog/models/download.png',
  '/catalog/models/download (1).png',
  '/catalog/models/download (2).png',
  '/catalog/models/download (3).png',
  '/catalog/models/download (4).png',
  '/catalog/models/download (5).png',
  '/catalog/models/download (6).png',
  '/catalog/models/download (7).png',
  '/catalog/models/download (8).png',
]

const STATUS_UI: Record<Status, { label: string; color: string; icon: string; cssClass: string }> = {
  idle: { label: 'Ready', color: 'var(--t3)', icon: '○', cssClass: '' },
  uploading: { label: 'Uploading…', color: 'var(--c-info)', icon: '⬆', cssClass: 'queued' },
  queued: { label: 'Queued', color: 'var(--c-info)', icon: '○', cssClass: 'queued' },
  processing: { label: 'Generating', color: 'var(--c-warn)', icon: '◎', cssClass: 'processing' },
  done: { label: 'Done', color: 'var(--c-success)', icon: '✓', cssClass: 'done' },
  error: { label: 'Error', color: 'var(--c-error)', icon: '✕', cssClass: 'error' },
}

export default function TryOnPage() {
  const [user, setUser] = useState<User | null>(null)

  // ── Inputs ──────────────────────────────────────────────
  // Human Model
  const [humanTab, setHumanTab] = useState<'catalog' | 'upload'>('catalog')
  const [humanFile, setHumanFile] = useState<File | null>(null)
  const [humanPreview, setHumanPreview] = useState<string | null>(null)
  const [selectedHumanUrl, setSelectedHumanUrl] = useState<string | null>(null)

  // Garment
  const [garmentTab, setGarmentTab] = useState<'catalog' | 'upload'>('catalog')
  const [garmentFile, setGarmentFile] = useState<File | null>(null)
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null)
  const [selectedGarmentUrl, setSelectedGarmentUrl] = useState<string | null>(null)

  const [description, setDescription] = useState('')

  // ── Generation state ────────────────────────────────────
  const [status, setStatus] = useState<Status>('idle')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // ── Drag states ─────────────────────────────────────────
  const [humanDragging, setHumanDragging] = useState(false)
  const [garmentDragging, setGarmentDragging] = useState(false)

  // File input refs
  const humanInputRef = useRef<HTMLInputElement>(null)
  const garmentInputRef = useRef<HTMLInputElement>(null)

  // Abort controller for cancelling generation
  const abortRef = useRef<AbortController | null>(null)

  // ── Load user ───────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  // ── Handlers ────────────────────────────────────────────
  const loadHuman = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setHumanFile(file)
    const url = URL.createObjectURL(file)
    setHumanPreview((prev) => { if (prev && !selectedHumanUrl) URL.revokeObjectURL(prev); return url })
    setSelectedHumanUrl(null)
  }, [selectedHumanUrl])

  const selectHumanCatalog = useCallback((url: string) => {
    setSelectedHumanUrl(url)
    setHumanPreview(url)
    setHumanFile(null)
  }, [])

  const loadGarment = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setGarmentFile(file)
    setGarmentPreview((prev) => { if (prev && !selectedGarmentUrl) URL.revokeObjectURL(prev); return URL.createObjectURL(file) })
    setSelectedGarmentUrl(null)
  }, [selectedGarmentUrl])

  const selectGarmentCatalog = useCallback((url: string) => {
    setSelectedGarmentUrl(url)
    setGarmentPreview(url)
    setGarmentFile(null)
    setDescription('a stylish garment') // Default description for local templates
  }, [])

  const clearHuman = useCallback(() => {
    if (humanPreview && !selectedHumanUrl) URL.revokeObjectURL(humanPreview)
    setHumanFile(null)
    setHumanPreview(null)
    setSelectedHumanUrl(null)
    if (humanInputRef.current) humanInputRef.current.value = ''
  }, [humanPreview, selectedHumanUrl])

  const clearGarment = useCallback(() => {
    if (garmentPreview && !selectedGarmentUrl) URL.revokeObjectURL(garmentPreview)
    setGarmentFile(null)
    setGarmentPreview(null)
    setSelectedGarmentUrl(null)
    if (garmentInputRef.current) garmentInputRef.current.value = ''
  }, [garmentPreview, selectedGarmentUrl])

  // Drop helpers
  const handleDrop = useCallback((e: React.DragEvent, loader: (f: File) => void, setDrag: (v: boolean) => void) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) loader(file)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault() }, [])

  // ── Generate ────────────────────────────────────────────
  const handleGenerate = async () => {
    if ((!humanFile && !selectedHumanUrl) || (!garmentFile && !selectedGarmentUrl) || !user) return
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
      // 1. Upload human photo if it's a file
      let humanPublicUrl = selectedHumanUrl ?? null
      let humanStoragePath: string | null = null

      if (humanFile && !selectedHumanUrl) {
        humanStoragePath = `${user.id}/human-${ts}.jpg`
        const { error: humanUpErr } = await supabase.storage
          .from('uploads')
          .upload(humanStoragePath, humanFile, { contentType: humanFile.type })
        if (humanUpErr) throw new Error(`Human photo upload failed: ${humanUpErr.message}`)
        humanPublicUrl = humanStoragePath
      }

      // 2. Upload custom garment if it's a file
      let garmentStoragePath: string | null = null
      let garmentPublicUrl = selectedGarmentUrl ?? null

      if (garmentFile && !selectedGarmentUrl) {
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
          human_image_url: humanPublicUrl ?? humanStoragePath,
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

      // 5. Call HF Space via Gradio
      if (abort.signal.aborted) throw new DOMException('Cancelled', 'AbortError')
      const { Client } = await import('@gradio/client')
      const client = await Client.connect(process.env.NEXT_PUBLIC_HF_SPACE_ID!)

      // fetchBlob grabs the static /catalog/... files as blobs, or the user uploads
      const humanInput = humanFile ?? (await fetchBlob(selectedHumanUrl!))
      const garmentInput = garmentFile ?? (await fetchBlob(selectedGarmentUrl!))

      const result = await client.predict('/tryon', [
        { background: humanInput, layers: [], composite: null },
        garmentInput,
        description || 'a stylish garment',
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

  const canGenerate = (!!humanFile || !!selectedHumanUrl) && (!!garmentFile || !!selectedGarmentUrl) && !isGenerating
  const ui = STATUS_UI[status]

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem) clamp(0.75rem, 3vw, 1.5rem)' }}>
      {/* Hidden file inputs */}
      <input
        ref={humanInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) loadHuman(e.target.files[0]) }}
      />
      <input
        ref={garmentInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) loadGarment(e.target.files[0]) }}
      />

      {/* Header */}
      <div style={{ marginBottom: 'clamp(1.25rem, 3vw, 2rem)' }}>
        <h1
          className="font-display"
          style={{ fontSize: 'clamp(1.35rem, 3vw, 2rem)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.25rem' }}
        >
          Virtual Try-On
        </h1>
        <p style={{ color: 'var(--t2)', fontSize: '0.9375rem' }}>
          Select or upload your photo and a garment to see a photorealistic AI preview.
        </p>
      </div>

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

            <div className="tab-group" role="tablist" style={{ marginBottom: '1rem' }}>
              <button
                role="tab"
                className={`tab-btn ${humanTab === 'catalog' ? 'active' : ''}`}
                onClick={() => setHumanTab('catalog')}
              >
                Choose Model
              </button>
              <button
                role="tab"
                className={`tab-btn ${humanTab === 'upload' ? 'active' : ''}`}
                onClick={() => setHumanTab('upload')}
              >
                Upload Photo
              </button>
            </div>

            <div hidden={humanTab !== 'catalog'}>
              <div className="garment-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
                {LOCAL_MODELS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`garment-thumb ${selectedHumanUrl === url ? 'selected' : ''}`}
                    onClick={() => selectHumanCatalog(url)}
                    aria-label={`Model template ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" />
                    {selectedHumanUrl === url && (
                      <span className="garment-selected-mark" aria-hidden="true">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div hidden={humanTab !== 'upload'}>
              {humanPreview && !selectedHumanUrl ? (
                <div style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden' }} className="a-fade-in">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={humanPreview}
                    alt="Your uploaded photo"
                    style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    onClick={clearHuman}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                      border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
                      color: 'var(--t1)', padding: '0.3rem 0.7rem',
                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  className={`upload-zone ${humanDragging ? 'dragging' : ''}`}
                  onClick={() => humanInputRef.current?.click()}
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
            </div>
          </section>

          {/* ── Garment ──────────────────────────────── */}
          <section className="card" style={{ padding: 'clamp(1rem, 2.5vw, 1.5rem)' }} aria-labelledby="garment-label">
            <div id="garment-label" className="section-label">
              <span aria-hidden="true">👗</span> Garment
            </div>

            <div className="tab-group" role="tablist" style={{ marginBottom: '1rem' }}>
              <button
                role="tab"
                className={`tab-btn ${garmentTab === 'catalog' ? 'active' : ''}`}
                onClick={() => setGarmentTab('catalog')}
              >
                Catalog
              </button>
              <button
                role="tab"
                className={`tab-btn ${garmentTab === 'upload' ? 'active' : ''}`}
                onClick={() => setGarmentTab('upload')}
              >
                Upload Garment
              </button>
            </div>

            <div hidden={garmentTab !== 'catalog'}>
              <div className="garment-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
                {LOCAL_GARMENTS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`garment-thumb ${selectedGarmentUrl === url ? 'selected' : ''}`}
                    onClick={() => selectGarmentCatalog(url)}
                    aria-label={`Garment template ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" />
                    {selectedGarmentUrl === url && (
                      <span className="garment-selected-mark" aria-hidden="true">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div hidden={garmentTab !== 'upload'}>
              {garmentPreview && !selectedGarmentUrl ? (
                <div style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden' }} className="a-fade-in">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={garmentPreview}
                    alt="Uploaded garment"
                    style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    onClick={clearGarment}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                      border: '1px solid var(--b1)', borderRadius: 'var(--r-sm)',
                      color: 'var(--t1)', padding: '0.3rem 0.7rem',
                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  className={`upload-zone ${garmentDragging ? 'dragging' : ''}`}
                  onClick={() => garmentInputRef.current?.click()}
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

            {(garmentFile || selectedGarmentUrl) && (
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
              className="btn-primary"
              onClick={handleGenerate}
              disabled={!canGenerate}
              aria-busy={isGenerating}
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
                className="btn-danger"
                onClick={() => { abortRef.current?.abort() }}
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
                      } catch { window.open(resultUrl!, '_blank') }
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
  if (!res.ok) throw new Error(`Could not fetch template image: ${url}`)
  return res.blob()
}
