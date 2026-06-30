import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import { HeaderServer } from '@/components/layout/HeaderServer'
import { Footer } from '@/components/layout/Footer'
import { BottomNav } from '@/components/pwa/BottomNav'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { getSiteUrl } from '@/lib/utils'

const inter     = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap', preload: false })

export const metadata: Metadata = {
  title: {
    default: 'Code Promo & Réductions — codepromoreduc.fr',
    template: '%s | codepromoreduc.fr',
  },
  description: 'Trouvez les meilleurs codes promo et réductions pour vos boutiques préférées. Économisez sur vos achats en ligne avec codepromoreduc.fr',
  metadataBase: new URL(getSiteUrl()),
  alternates: { canonical: '/' },
  openGraph: {
    siteName: 'codepromoreduc.fr',
    locale: 'fr_FR',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CodePromo',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
  themeColor: '#38bdf8',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const pathname = hdrs.get('x-pathname') ?? ''
  const bare = pathname === '/fr/coupon-reveal'
    || pathname.startsWith('/admin')
    || /^\/store\/[^/]+\/\d+/.test(pathname)

  return (
    <html lang="fr" translate="no" className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        <meta name="google" content="notranslate" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans bg-navy text-white antialiased flex flex-col min-h-screen" suppressHydrationWarning>
        {!bare && (
          <>
            <div className="orb-container">
              <div style={{position:'absolute',top:'-320px',right:'-220px',width:'860px',height:'860px',borderRadius:'50%',background:'radial-gradient(circle, rgba(56,189,248,.14), transparent 62%)',animation:'orb-a 14s ease-in-out infinite'}} />
              <div style={{position:'absolute',bottom:'-340px',left:'-240px',width:'960px',height:'960px',borderRadius:'50%',background:'radial-gradient(circle, rgba(168,85,247,.16), transparent 60%)',animation:'orb-b 18s ease-in-out infinite'}} />
              <div style={{position:'absolute',top:'38%',left:'-260px',width:'660px',height:'660px',borderRadius:'50%',background:'radial-gradient(circle, rgba(139,92,246,.09), transparent 65%)',animation:'orb-c 22s ease-in-out infinite'}} />
              <div style={{position:'absolute',top:'20%',right:'-200px',width:'520px',height:'520px',borderRadius:'50%',background:'radial-gradient(circle, rgba(192,132,252,.07), transparent 60%)',animation:'orb-a 20s ease-in-out 4s infinite'}} />
            </div>
            <HeaderServer />
          </>
        )}
        <main className={bare ? '' : 'flex-1 relative z-[1] pb-safe'}>{children}</main>
        {!bare && (
          <>
            <Footer />
            <BottomNav />
            <InstallPrompt />
          </>
        )}
      </body>
    </html>
  )
}
