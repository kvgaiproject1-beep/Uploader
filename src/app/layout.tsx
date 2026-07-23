import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '600', '700', '800'],
  style: ['normal', 'italic'],
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'FashionAI — Virtual Try-On',
  description:
    'Upload your photo, pick any garment, and see a photorealistic AI-generated preview — no fitting room, no returns.',
  keywords: ['virtual try-on', 'AI fashion', 'outfit preview', 'fashion AI', 'VITON'],
  openGraph: {
    title: 'FashionAI — Virtual Try-On',
    description: 'Try on any outfit instantly with AI. No fitting room needed.',
    type: 'website',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
