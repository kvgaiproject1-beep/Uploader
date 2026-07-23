import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware handles this, but belt-and-suspenders check
  if (!user) {
    redirect('/login')
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div className="blob blob-2" style={{ opacity: 0.6 }} />
      <div className="blob blob-3" style={{ opacity: 0.5 }} />
      <Navbar userEmail={user.email ?? ''} />
      <main style={{ position: 'relative', zIndex: 10 }}>{children}</main>
    </div>
  )
}
