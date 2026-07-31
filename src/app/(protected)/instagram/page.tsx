import { createClient } from '@/lib/supabase/server'
import InstagramPageClient from './client'

export const metadata = { title: 'Instagram — FashionAI' }

export default async function InstagramPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch stored credentials server-side
  const { data: creds } = await supabase
    .from('instagram_credentials')
    .select('ig_username, ig_user_id, ig_profile_pic, token_expiry')
    .eq('user_id', user!.id)
    .single()

  return (
    <InstagramPageClient
      initialCreds={creds ?? null}
    />
  )
}
