'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [hasCredentials, setHasCredentials] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function loadCredentials() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('instagram_credentials')
          .select('ig_username')
          .eq('user_id', user.id)
          .single()
        
        if (data) {
          setUsername(data.ig_username)
          setHasCredentials(true)
        }
      }
      setLoading(false)
    }
    loadCredentials()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error } = await supabase
        .from('instagram_credentials')
        .upsert({
          user_id: user.id,
          ig_username: username,
          ig_password: password
        }, { onConflict: 'user_id' })

      if (error) throw error
      setMessage('Credentials saved successfully!')
      setHasCredentials(true)
    } catch (err: any) {
      setMessage('Error saving credentials: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    setMessage('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('instagram_credentials').delete().eq('user_id', user.id)
      setUsername('')
      setPassword('')
      setHasCredentials(false)
      setMessage('Credentials removed.')
    } catch (err: any) {
      setMessage('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Loading settings...</div>

  return (
    <div className="settings-page" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--t1)' }}>Settings</h1>
      
      <div className="integration-card" style={{
        background: 'var(--s-card)',
        padding: '1.5rem',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--b1)'
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📸</span> Instagram Auto-Post
        </h2>
        <p style={{ color: 'var(--t2)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Connect your Instagram account to automatically post your generated try-ons directly to your feed. 
          <br/><strong style={{color: '#fca5a5'}}>Warning:</strong> Passwords are used directly to authenticate via an automated cloud process. This may trigger a "Suspicious Login" warning on your phone.
        </p>

        {message && (
          <div style={{ padding: '0.75rem', background: 'var(--brand-dim)', color: 'var(--brand-500)', borderRadius: 'var(--r-sm)', marginBottom: '1rem' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--t2)' }}>Instagram Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. fashion_ai_user"
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--r-md)', border: '1px solid var(--b1)', background: 'var(--b0)', color: 'var(--t1)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--t2)' }}>Instagram Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={hasCredentials ? "•••••••• (Leave blank to keep existing)" : "Enter password"}
              required={!hasCredentials}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--r-md)', border: '1px solid var(--b1)', background: 'var(--b0)', color: 'var(--t1)' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'var(--brand-500)',
                color: 'var(--t1)',
                border: 'none',
                borderRadius: 'var(--r-md)',
                fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : (hasCredentials ? 'Update Credentials' : 'Connect Instagram')}
            </button>
            
            {hasCredentials && (
              <button 
                type="button"
                onClick={handleDelete}
                disabled={saving}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  color: '#fca5a5',
                  border: '1px solid #fca5a5',
                  borderRadius: 'var(--r-md)',
                  fontWeight: 600,
                  cursor: saving ? 'wait' : 'pointer'
                }}
              >
                Disconnect
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
