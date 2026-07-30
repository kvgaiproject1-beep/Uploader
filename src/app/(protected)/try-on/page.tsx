'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { InstagramShareModal } from '@/components/InstagramShareModal'

type Status = 'idle' | 'uploading' | 'queued' | 'processing' | 'done' | 'error'

interface PoseConfig {
  id: 'front' | 'back' | 'left' | 'right' | 'custom'
  label: string
  modelUrl: string
  maskUrl: string
}

interface ModelProfile {
  id: 'male' | 'female'
  name: string
  gender: string
  preview: string
  poses: PoseConfig[]
}

const MODEL_PROFILES: ModelProfile[] = [
  {
    id: 'male',
    name: 'Male Model A (Athletic)',
    gender: 'Male',
    preview: '/catalog/models_v2/male_front.png',
    poses: [
      { id: 'front', label: 'Front View', modelUrl: '/catalog/models_v2/male_front.png', maskUrl: '/catalog/models_v2/male_front_mask.png' },
      { id: 'back', label: 'Back View', modelUrl: '/catalog/models_v2/male_back.png', maskUrl: '/catalog/models_v2/male_back_mask.png' },
      { id: 'left', label: 'Left Profile', modelUrl: '/catalog/models_v2/male_side_left.png', maskUrl: '/catalog/models_v2/male_side_left_mask.png' },
      { id: 'right', label: 'Right Profile', modelUrl: '/catalog/models_v2/male_side_right.png', maskUrl: '/catalog/models_v2/male_side_right_mask.png' },
    ],
  },
  {
    id: 'female',
    name: 'Female Model A (Studio)',
    gender: 'Female',
    preview: '/catalog/models_v2/female_front.png',
    poses: [
      { id: 'front', label: 'Front View', modelUrl: '/catalog/models_v2/female_front.png', maskUrl: '/catalog/models_v2/female_front_mask.png' },
      { id: 'back', label: 'Back View', modelUrl: '/catalog/models_v2/female_back.png', maskUrl: '/catalog/models_v2/female_back_mask.png' },
      { id: 'left', label: 'Left Profile', modelUrl: '/catalog/models_v2/female_side_left.png', maskUrl: '/catalog/models_v2/female_side_left_mask.png' },
      { id: 'right', label: 'Right Profile', modelUrl: '/catalog/models_v2/female_side_right.png', maskUrl: '/catalog/models_v2/female_side_right_mask.png' },
    ],
  },
]

const LOCAL_GARMENTS = [
  '/catalog/garments/04469_00.jpg',
  '/catalog/garments/04743_00.jpg',
  '/catalog/garments/09133_00.jpg',
  '/catalog/garments/09163_00.jpg',
  '/catalog/garments/09164_00.jpg',
  '/catalog/garments/09166_00.jpg',
  '/catalog/garments/09176_00.jpg',
  '/catalog/garments/09236_00.jpg',
  '/catalog/garments/images (1).jfif',
  '/catalog/garments/images (2).jfif',
  '/catalog/garments/images (3).jfif',
  '/catalog/garments/images (4).jfif',
  '/catalog/garments/images (5).jfif',
  '/catalog/garments/images (6).jfif',
  '/catalog/garments/images.jfif',
]

const LOCAL_MODELS = [
  '/catalog/models/download (1).png',
  '/catalog/models/download (2).png',
  '/catalog/models/download (3).png',
  '/catalog/models/download (4).png',
  '/catalog/models/download (5).png',
  '/catalog/models/download (6).png',
  '/catalog/models/download (7).png',
  '/catalog/models/download (8).png',
  '/catalog/models/download.png',
]

interface PoseResult {
  id: string
  label: string
  status: Status
  resultUrl: string | null
  error: string | null
}

export default function TryOnPage() {
  const [user, setUser] = useState<User | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [showCreditAlarm, setShowCreditAlarm] = useState(false)
  const [igShareUrl, setIgShareUrl] = useState<string | null>(null)
  // ── Selections ──────────────────────────────────────────
  const [modelSelectionTab, setModelSelectionTab] = useState<'profiles' | 'catalog'>('profiles')
  const [selectedCatalogModel, setSelectedCatalogModel] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<'male' | 'female'>('male')
  const [selectedPoses, setSelectedPoses] = useState<string[]>([])

  // Garment Front
  const [garmentFrontTab, setGarmentFrontTab] = useState<'catalog' | 'upload'>('upload')
  const [garmentFrontFile, setGarmentFrontFile] = useState<File | null>(null)
  const [garmentFrontPreview, setGarmentFrontPreview] = useState<string | null>(null)
  const [selectedGarmentFrontUrl, setSelectedGarmentFrontUrl] = useState<string | null>(null)

  // Garment Back (Optional)
  const [garmentBackFile, setGarmentBackFile] = useState<File | null>(null)
  const [garmentBackPreview, setGarmentBackPreview] = useState<string | null>(null)

  // Garment Description (Required)
  const [garmentDescription, setGarmentDescription] = useState('')

  // Drag states
  const [frontDragging, setFrontDragging] = useState(false)
  const [backDragging, setBackDragging] = useState(false)

  const frontInputRef = useRef<HTMLInputElement>(null)
  const backInputRef = useRef<HTMLInputElement>(null)

  // Generation state per pose
  const [poseResults, setPoseResults] = useState<Record<string, PoseResult>>({
    front: { id: 'front', label: 'Front View', status: 'idle', resultUrl: null, error: null },
    back: { id: 'back', label: 'Back View', status: 'idle', resultUrl: null, error: null },
    left: { id: 'left', label: 'Left Profile', status: 'idle', resultUrl: null, error: null },
    right: { id: 'right', label: 'Right Profile', status: 'idle', resultUrl: null, error: null },
    custom: { id: 'custom', label: 'Catalog Model', status: 'idle', resultUrl: null, error: null },
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Load user and credits
  useEffect(() => {
    const fetchUserAndCredits = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase.from('profiles').select('credits').eq('id', user.id).single()
        setCredits(data?.credits ?? 10)
      }
    }
    fetchUserAndCredits()
  }, [])

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const savedDesc = localStorage.getItem('tryon_garmentDescription')
      if (savedDesc) setGarmentDescription(savedDesc)

      const savedModel = localStorage.getItem('tryon_selectedModelId')
      if (savedModel === 'male' || savedModel === 'female') setSelectedModelId(savedModel)

      const savedModelTab = localStorage.getItem('tryon_modelSelectionTab')
      if (savedModelTab === 'profiles' || savedModelTab === 'catalog') setModelSelectionTab(savedModelTab)
      
      const savedCatalogModel = localStorage.getItem('tryon_selectedCatalogModel')
      if (savedCatalogModel) setSelectedCatalogModel(savedCatalogModel)

      const savedPoses = localStorage.getItem('tryon_selectedPoses')
      if (savedPoses) setSelectedPoses(JSON.parse(savedPoses))

      const savedFrontTab = localStorage.getItem('tryon_garmentFrontTab')
      if (savedFrontTab === 'catalog' || savedFrontTab === 'upload') setGarmentFrontTab(savedFrontTab)

      const savedGarmentUrl = localStorage.getItem('tryon_selectedGarmentFrontUrl')
      if (savedGarmentUrl) {
        setSelectedGarmentFrontUrl(savedGarmentUrl)
        setGarmentFrontPreview(savedGarmentUrl)
      }
    } catch (e) {
      console.warn("Failed to load state from localStorage", e)
    }
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('tryon_garmentDescription', garmentDescription)
      localStorage.setItem('tryon_modelSelectionTab', modelSelectionTab)
      if (selectedCatalogModel) {
        localStorage.setItem('tryon_selectedCatalogModel', selectedCatalogModel)
      } else {
        localStorage.removeItem('tryon_selectedCatalogModel')
      }
      localStorage.setItem('tryon_selectedModelId', selectedModelId)
      localStorage.setItem('tryon_selectedPoses', JSON.stringify(selectedPoses))
      localStorage.setItem('tryon_garmentFrontTab', garmentFrontTab)
      if (selectedGarmentFrontUrl) {
        localStorage.setItem('tryon_selectedGarmentFrontUrl', selectedGarmentFrontUrl)
      } else {
        localStorage.removeItem('tryon_selectedGarmentFrontUrl')
      }
    } catch (e) {
      console.warn("Failed to save state to localStorage", e)
    }
  }, [garmentDescription, modelSelectionTab, selectedCatalogModel, selectedModelId, selectedPoses, garmentFrontTab, selectedGarmentFrontUrl])

  const currentModel = MODEL_PROFILES.find((m) => m.id === selectedModelId)!

  // Handlers for front garment
  const loadFrontGarment = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setGarmentFrontFile(file)
    const url = URL.createObjectURL(file)
    setGarmentFrontPreview((prev) => { if (prev && !selectedGarmentFrontUrl) URL.revokeObjectURL(prev); return url })
    setSelectedGarmentFrontUrl(null)
  }, [selectedGarmentFrontUrl])

  const selectFrontCatalog = useCallback((url: string) => {
    setSelectedGarmentFrontUrl(url)
    setGarmentFrontPreview(url)
    setGarmentFrontFile(null)
  }, [])

  // Handlers for back garment
  const loadBackGarment = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    setGarmentBackFile(file)
    const url = URL.createObjectURL(file)
    setGarmentBackPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
  }, [])

  const clearBackGarment = useCallback(() => {
    if (garmentBackPreview) URL.revokeObjectURL(garmentBackPreview)
    setGarmentBackFile(null)
    setGarmentBackPreview(null)
  }, [garmentBackPreview])

  // Helper to fetch blob from a File or URL
  const getBlobFromSource = async (file: File | null, url: string | null, sourceName: string): Promise<Blob> => {
    try {
      if (file) return file
      if (url) {
        const fetchUrl = url.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(url)}` : url
        const res = await fetch(fetchUrl)
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`)
        return res.blob()
      }
      throw new Error('No source provided for blob')
    } catch (error: any) {
      throw new Error(`[${sourceName} Fetch Error] ${error.message || error}`)
    }
  }

  // ── Download Logic ──────────────────────────────────────
  const handleDownload = async (url: string, filename: string) => {
    try {
      const fetchUrl = url.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(url)}` : url;
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Failed to fetch image for download');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback
      window.open(url, '_blank');
    }
  };

  // Instagram share: open the in-site modal
  const handleInstagramShare = (url: string) => {
    setIgShareUrl(url)
  };

  // ── Generation Logic ────────────────────────────────────
  const handleGeneratePhotoshoot = async () => {
    if (!selectedGarmentFrontUrl && !garmentFrontFile) {
      alert('Please upload or select a front garment.')
      return
    }

    if (!garmentDescription.trim()) {
      alert('Please enter a description for the garment.')
      return
    }

    const posesToGenerate = modelSelectionTab === 'catalog' ? [] : currentModel.poses.filter(p => selectedPoses.includes(p.id))
    
    if (modelSelectionTab === 'profiles' && posesToGenerate.length === 0) {
      alert('Please select at least one pose to generate.')
      return
    }

    const cost = modelSelectionTab === 'catalog' ? 10 : posesToGenerate.length * 10

    if (credits !== null && credits < cost) {
      setShowCreditAlarm(true)
      return
    }

    setIsGenerating(true)
    abortRef.current = new AbortController()

    // Reset status for all poses
    setPoseResults({
      front: { id: 'front', label: 'Front View', status: 'queued', resultUrl: null, error: null },
      back: { id: 'back', label: 'Back View', status: 'queued', resultUrl: null, error: null },
      left: { id: 'left', label: 'Left Profile', status: 'queued', resultUrl: null, error: null },
      right: { id: 'right', label: 'Right Profile', status: 'queued', resultUrl: null, error: null },
      custom: { id: 'custom', label: 'Catalog Model', status: 'queued', resultUrl: null, error: null },
    })

    try {

    let frontGarmentFile: File;
    let backGarmentFile: File;
    try {
      // Fetch front garment blob and convert to File with name
      const frontGarmentBlob = await getBlobFromSource(garmentFrontFile, selectedGarmentFrontUrl, 'FrontGarment')
      frontGarmentFile = new File([frontGarmentBlob], "front_garment.jpg", { type: "image/jpeg" })
      
      // Fetch back garment blob if available, else fallback to front
      if (garmentBackFile || garmentBackPreview) {
        const backBlob = await getBlobFromSource(garmentBackFile, garmentBackPreview, 'BackGarment')
        backGarmentFile = new File([backBlob], "back_garment.jpg", { type: "image/jpeg" })
      } else {
        backGarmentFile = frontGarmentFile
      }
    } catch (error: any) {
      setIsGenerating(false)
      alert(`[Garment Prep Error] ${error.message || error}`)
      return
    }

    let successfulGenerations = 0;

    // Function to generate a single pose
    const generatePose = async (pose: PoseConfig) => {
      setPoseResults((prev) => ({
        ...prev,
        [pose.id]: { ...prev[pose.id], status: 'processing' },
      }))

      try {
        let modelFile: File;
        try {
          // Load base model as Blob and convert to File with name
          const modelBlob = await getBlobFromSource(null, pose.modelUrl, `ModelPose_${pose.id}`)
          modelFile = new File([modelBlob], "model.jpg", { type: "image/jpeg" })
        } catch (error: any) {
          throw new Error(`[Model Prep Error] ${error.message || error}`)
        }
        
        const activeGarmentFile = pose.id === 'back' ? backGarmentFile : frontGarmentFile

        let outBlob: Blob;
        let outUrl: string | null = null;
        try {
          const form = new FormData();
          form.append('human_image', modelFile);
          form.append('garment_image', activeGarmentFile);
          form.append('garment_desc', garmentDescription.trim());

          const res = await fetch('/api/generate-tryon', {
            method: 'POST',
            body: form,
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`[Modal Predict Error] ${errText}`);
          }
          outBlob = await res.blob();
        } catch (error: any) {
          throw new Error(`[Modal Predict Error] ${error.message || error}`);
        }

        // Save to Supabase History
        if (user) {
          try {
            const supabase = createClient()
            
            // 2. Upload to Supabase Storage
            const filename = `${user.id}/${Date.now()}-${pose.id}.jpg`
            const { error: uploadErr } = await supabase.storage
              .from('outputs')
              .upload(filename, outBlob, { contentType: 'image/jpeg' })
              
            if (!uploadErr) {
              const { data: { publicUrl } } = supabase.storage.from('outputs').getPublicUrl(filename)
              
              // 3. Insert into tryon_jobs
              await supabase.from('tryon_jobs').insert({
                user_id: user.id,
                human_image_url: pose.modelUrl,
                garment_image_url: selectedGarmentFrontUrl || '',
                garment_description: `${garmentDescription.trim()} (${pose.label})`,
                status: 'done',
                output_image_url: publicUrl,
                completed_at: new Date().toISOString()
              })
              
              successfulGenerations++;

              // Use the permanent Supabase URL for the UI result
              outUrl = publicUrl
            }
          } catch (saveErr) {
            console.error(`Failed to save ${pose.label} to history:`, saveErr)
          }
        }

        setPoseResults((prev) => ({
            ...prev,
            [pose.id]: { ...prev[pose.id], status: 'done', resultUrl: outUrl },
          }))
        } catch (error) {
          console.error(`Error generating ${pose.id}:`, error)
          setPoseResults((prev) => ({
            ...prev,
            [pose.id]: {
              ...prev[pose.id],
              status: 'error',
              error: error instanceof Error ? (error.stack || error.message) : 'Generation failed',
            },
          }))
        }
      }

      // Execute all poses in parallel!
      if (modelSelectionTab === 'catalog') {
        await generatePose({ id: 'custom', label: 'Catalog Model', modelUrl: selectedCatalogModel!, maskUrl: '' })
      } else {
        await Promise.all(currentModel.poses.filter(p => selectedPoses.includes(p.id)).map(generatePose))
      }

      if (successfulGenerations > 0 && user) {
        const totalDeduction = successfulGenerations * 10;
        const supabase = createClient()
        // Fetch fresh credits to prevent race conditions
        const { data } = await supabase.from('profiles').select('credits').eq('id', user.id).single()
        if (data) {
           const newCredits = data.credits - totalDeduction;
           await supabase.from('profiles').update({ credits: newCredits }).eq('id', user.id)
           setCredits(newCredits)
           window.dispatchEvent(new Event('creditsUpdated'))
        }
      }

    } catch (err: any) {
      console.error('Photoshoot generation failure:', err)
      
      // Update UI with the global error so it's not stuck on "Queued"
      const failedResults = { ...poseResults }
      if (modelSelectionTab === 'catalog') {
        failedResults['custom'] = { ...failedResults['custom'], status: 'error', error: err.message || 'Initialization failed' }
      } else {
        currentModel.poses.filter(p => selectedPoses.includes(p.id)).forEach(p => {
          failedResults[p.id] = { ...failedResults[p.id], status: 'error', error: err.message || 'Initialization failed' }
        })
      }
      setPoseResults(failedResults)

    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(1rem, 3vw, 2.5rem)' }}>
      {igShareUrl && (
        <InstagramShareModal
          imageUrl={igShareUrl}
          onClose={() => setIgShareUrl(null)}
        />
      )}
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="font-display" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 800 }}>
          AI Multi-Pose Photoshoot
        </h1>
        <p style={{ color: 'var(--t2)', fontSize: '1rem', marginTop: '0.25rem' }}>
          Select an AI model profile, upload your clothing item, and generate a complete 4-angle studio photoshoot for your catalog.
        </p>
      </div>

      {/* Main Studio Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '2rem' }}>

        {/* Left Column: Config Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Step 1: Garment Upload */}
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
              1. Upload Garment
            </h2>

            {/* Front Garment (Required) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--t1)', marginBottom: '0.5rem' }}>
                Front View (Required)
              </label>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setGarmentFrontTab('upload')}
                  className={garmentFrontTab === 'upload' ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setGarmentFrontTab('catalog')}
                  className={garmentFrontTab === 'catalog' ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                >
                  Preset Catalog
                </button>
              </div>

              {garmentFrontTab === 'upload' ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setFrontDragging(true) }}
                  onDragLeave={() => setFrontDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setFrontDragging(false); if (e.dataTransfer.files?.[0]) loadFrontGarment(e.dataTransfer.files[0]) }}
                  onClick={() => frontInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${frontDragging ? 'var(--brand-400)' : 'var(--b1)'}`,
                    borderRadius: 'var(--r-md)',
                    padding: '1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--s-overlay)',
                  }}
                >
                  <input ref={frontInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && loadFrontGarment(e.target.files[0])} />
                  {garmentFrontPreview ? (
                    <div style={{ maxHeight: 120, display: 'flex', justifyContent: 'center' }}>
                      <img src={garmentFrontPreview} alt="Front Garment" style={{ maxHeight: 120, objectFit: 'contain', borderRadius: 'var(--r-sm)' }} />
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '1.25rem' }}>👕</span>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--t2)', marginTop: '0.25rem' }}>Drop front shirt image here or click to browse</p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', maxHeight: 160, overflowY: 'auto' }}>
                  {LOCAL_GARMENTS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => selectFrontCatalog(g)}
                      style={{
                        border: selectedGarmentFrontUrl === g ? '2px solid var(--brand-400)' : '1px solid var(--b1)',
                        borderRadius: 'var(--r-sm)',
                        padding: 0,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        aspectRatio: '1/1',
                      }}
                    >
                      <img src={g} alt="Preset Garment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Back Garment (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--t1)', marginBottom: '0.25rem' }}>
                Back View (Optional)
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--t3)', marginBottom: '0.5rem' }}>
                Required if you want to generate the back view pose.
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setBackDragging(true) }}
                onDragLeave={() => setBackDragging(false)}
                onDrop={(e) => { e.preventDefault(); setBackDragging(false); if (e.dataTransfer.files?.[0]) loadBackGarment(e.dataTransfer.files[0]) }}
                onClick={() => backInputRef.current?.click()}
                style={{
                  border: `2px dashed ${backDragging ? 'var(--brand-400)' : 'var(--b1)'}`,
                  borderRadius: 'var(--r-md)',
                  padding: '0.75rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--s-overlay)',
                  position: 'relative',
                }}
              >
                <input ref={backInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && loadBackGarment(e.target.files[0])} />
                {garmentBackPreview ? (
                  <div style={{ maxHeight: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                    <img src={garmentBackPreview} alt="Back Garment" style={{ maxHeight: 100, objectFit: 'contain', borderRadius: 'var(--r-sm)' }} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearBackGarment();
                        setSelectedPoses(prev => prev.filter(p => p !== 'back'));
                      }}
                      className="btn-danger"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--t3)' }}>+ Add Back View Shirt Image</p>
                )}
              </div>
            </div>

            {/* Garment Description (Required) */}
            <div style={{ marginTop: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--t1)', marginBottom: '0.375rem' }}>
                Garment Description <span style={{ color: '#fca5a5' }}>*</span>
              </label>
              <input
                type="text"
                value={garmentDescription}
                onChange={(e) => setGarmentDescription(e.target.value)}
                placeholder="e.g. Red plaid short-sleeve button-down shirt"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--b1)',
                  background: 'var(--s-overlay)',
                  color: 'var(--t1)',
                  outline: 'none',
                }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--t3)', marginTop: '0.375rem' }}>
                Describing the pattern, color, and fit provides text conditioning that stops the AI from hallucinating.
              </p>
            </div>
          </div>

          {/* Step 2: Model Selection */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>2. Select Model Profile</span>
            </h2>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--b1)', paddingBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setModelSelectionTab('profiles')}
                className={modelSelectionTab === 'profiles' ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
              >
                Multi-Pose Profiles
              </button>
              <button
                type="button"
                onClick={() => setModelSelectionTab('catalog')}
                className={modelSelectionTab === 'catalog' ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
              >
                Preset Catalog
              </button>
            </div>

            {modelSelectionTab === 'profiles' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                
                {/* Left Column: Selection */}
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {MODEL_PROFILES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedModelId(m.id)}
                  style={{
                    border: selectedModelId === m.id ? '2px solid var(--brand-400)' : '1px solid var(--b1)',
                    borderRadius: 'var(--r-md)',
                    padding: '0.75rem',
                    background: selectedModelId === m.id ? 'var(--brand-dim)' : 'var(--s-card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ aspectRatio: '3/4', borderRadius: 'var(--r-sm)', overflow: 'hidden', marginBottom: '0.5rem', background: '#111' }}>
                    <img src={m.preview} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--t1)' }}>{m.gender} Model</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--t3)' }}>4 Studio Poses</div>
                </button>
              ))}
            </div>

            {/* Pose Selection Checkboxes */}
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--t1)', marginBottom: '0.75rem' }}>Select Views to Generate:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {currentModel.poses.map(pose => {
                const isSelected = selectedPoses.includes(pose.id);
                return (
                  <label key={pose.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', padding: '0.5rem', borderRadius: 'var(--r-sm)', background: isSelected ? 'var(--brand-dim)' : 'var(--s-overlay)', border: `1px solid ${isSelected ? 'var(--brand-400)' : 'var(--b1)'}`, transition: 'all 0.2s' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (pose.id === 'back' && !isSelected) {
                          if (!garmentBackFile && !garmentBackPreview) {
                            alert("You cannot generate the Back View without uploading a Back Garment image first.");
                            return;
                          }
                        }
                        setSelectedPoses(prev =>
                          prev.includes(pose.id) ? prev.filter(p => p !== pose.id) : [...prev, pose.id]
                        );
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--brand-500)' }}
                    />
                    {pose.label}
                  </label>
                )
              })}
              </div>
            </div>

              {/* Selected Views Preview (Right Side) */}
              {selectedPoses.length > 0 && (
                <div style={{ flex: '1 1 200px', background: 'var(--s-overlay)', padding: '1rem', borderRadius: 'var(--r-md)', border: '1px solid var(--b1)', height: 'fit-content' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--t1)', marginBottom: '0.75rem' }}>Selected Views:</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '0.5rem' }}>
                    {currentModel.poses.filter(p => selectedPoses.includes(p.id)).map(pose => (
                      <div key={pose.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', textAlign: 'center' }}>
                        <div style={{ aspectRatio: '3/4', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--b1)' }}>
                          <img src={pose.modelUrl} alt={pose.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--t2)' }}>{pose.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--t2)', marginBottom: '1rem' }}>
                  Multi-view is not supported for preset catalog models. A single front-view image will be generated.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', maxHeight: 300, overflowY: 'auto' }}>
                  {LOCAL_MODELS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedCatalogModel(m)}
                      style={{
                        border: selectedCatalogModel === m ? '2px solid var(--brand-400)' : '1px solid var(--b1)',
                        borderRadius: 'var(--r-sm)',
                        padding: 0,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        aspectRatio: '3/4',
                      }}
                    >
                      <img src={m} alt="Catalog Model" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Generate Button */}
          <button
            type="button"
            onClick={handleGeneratePhotoshoot}
            disabled={isGenerating || (modelSelectionTab === 'profiles' && selectedPoses.length === 0) || (modelSelectionTab === 'catalog' && !selectedCatalogModel) || (!garmentFrontFile && !selectedGarmentFrontUrl) || !garmentDescription.trim()}
            className="btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1.0625rem', fontWeight: 700 }}
          >
            {isGenerating ? 'Generating 4-Angle Photoshoot…' : '✨ Generate Studio Photoshoot'}
          </button>
        </div>

        {/* Right Column: 4-Angle Output Grid */}
        <div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Generated Photoshoot Gallery</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: 'var(--t3)' }}>
                {modelSelectionTab === 'catalog' ? 'Catalog Model' : currentModel.name}
              </span>
            </h2>

            {/* Cards Grid */}
            {(() => {
              const activePoses = modelSelectionTab === 'catalog' 
                ? (poseResults['custom']?.status !== 'idle' ? [{ id: 'custom', label: 'Catalog Model', modelUrl: selectedCatalogModel! }] : []) 
                : currentModel.poses.filter(p => selectedPoses.includes(p.id) && poseResults[p.id]?.status !== 'idle');
              
              if (activePoses.length === 0) {
                return (
                  <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--t3)', border: '2px dashed var(--b1)', borderRadius: 'var(--r-md)' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem', filter: 'grayscale(1)', opacity: 0.5 }}>🖼️</span>
                    <p style={{ fontSize: '1rem' }}>You can see your generated images here!</p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {activePoses.map((pose) => {
                const res = poseResults[pose.id]
                return (
                  <div
                    key={pose.id}
                    style={{
                      border: '1px solid var(--b1)',
                      borderRadius: 'var(--r-md)',
                      background: 'var(--s-overlay)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ padding: '0.5rem 0.75rem', background: 'var(--s-card)', borderBottom: '1px solid var(--b0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{pose.label}</span>
                      <span style={{ fontSize: '0.75rem', color: res.status === 'done' ? 'var(--c-success)' : res.status === 'processing' ? 'var(--c-warn)' : 'var(--t3)' }}>
                        {res.status === 'done' ? '✓ Ready' : res.status === 'processing' ? '◎ Generating' : res.status === 'queued' ? '○ Queued' : '○ Standby'}
                      </span>
                    </div>

                    <div style={{ aspectRatio: '3/4', background: '#0a0a0a', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {res.status === 'done' && res.resultUrl ? (
                        <img src={res.resultUrl} alt={pose.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : res.status === 'processing' ? (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                          <span style={{ fontSize: '2rem', display: 'inline-block', animation: 'spin 2s linear infinite' }}>⚙</span>
                          <p style={{ fontSize: '0.75rem', color: 'var(--t2)', marginTop: '0.5rem' }}>Rendering high-res {pose.label}…</p>
                        </div>
                      ) : res.error ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#fca5a5', fontSize: '0.75rem' }}>
                          ✕ {res.error}
                        </div>
                      ) : (
                        null
                      )}
                    </div>

                    {res.status === 'done' && res.resultUrl && (
                      <div style={{ padding: '0.5rem', background: 'var(--s-card)', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <button
                          type="button"
                          onClick={() => res.resultUrl && handleInstagramShare(res.resultUrl)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #f09433 0%, #dc2743 50%, #bc1888 100%)', color: 'white', borderRadius: 'var(--r-sm)' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                          Share to Instagram
                        </button>
                        <button
                          type="button"
                          onClick={() => res.resultUrl && handleDownload(res.resultUrl, `fashionai-${pose.id}.jpg`)}
                          className="btn-ghost"
                          style={{ width: '100%', display: 'block', textAlign: 'center', padding: '0.375rem', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}
                        >
                          ⬇ Download High-Res
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            );
          })()}
          </div>
        </div>

      </div>

      {/* Credit Alarm Modal */}
      {showCreditAlarm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="a-fade-in" style={{ background: 'var(--s-card)', padding: '2.5rem', borderRadius: 'var(--r-lg)', maxWidth: '400px', width: '90%', textAlign: 'center', border: '1px solid var(--b1)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Out of Credits</h2>
            <p style={{ color: 'var(--t2)', fontSize: '0.875rem', marginBottom: '2rem' }}>
              You don't have enough credits to generate these poses. Please recharge your account to continue using the AI.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setShowCreditAlarm(false)} className="btn-ghost" style={{ padding: '0.75rem 1.5rem' }}>
                Cancel
              </button>
              <a href="/plans" className="btn-primary" style={{ padding: '0.75rem 1.5rem', textDecoration: 'none' }}>
                View Plans
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
