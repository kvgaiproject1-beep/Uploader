import { createClient } from '@/lib/supabase/server'
import InstagramPageClient from './client'

export const metadata = { title: 'Instagram — FashionAI' }

export default async function InstagramPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch from instagram_connections (new table — user can SELECT their own row via RLS)
  const { data: connection } = await supabase
    .from('instagram_connections')
    .select('ig_username, ig_user_id, token_expires_at')
    .eq('user_id', user!.id)
    .single()

  return (
    <InstagramPageClient
      initialConnection={connection ?? null}
    />
  )
}
