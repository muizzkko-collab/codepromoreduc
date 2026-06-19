import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import { HeaderServer } from '@/components/layout/HeaderServer'
import { Footer } from '@/components/layout/Footer'
import { getSiteUrl } from '@/lib/utils'

const inter     = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

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
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const pathname = hdrs.get('x-pathname') ?? ''
  const bare = pathname === '/fr/coupon-reveal'

  return (
    <html lang="fr" translate="no" className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="font-sans bg-navy text-white antialiased flex flex-col min-h-screen" suppressHydrationWarning>
        {!bare && (
          <>
            <div className="fixed pointer-events-none z-0" style={{top:'-320px',right:'-220px',width:'860px',height:'860px',borderRadius:'50%',background:'radial-gradient(circle, rgba(56,189,248,.14), transparent 62%)',animation:'orb-a 14s ease-in-out infinite'}} />
            <div className="fixed pointer-events-none z-0" style={{bottom:'-340px',left:'-240px',width:'960px',height:'960px',borderRadius:'50%',background:'radial-gradient(circle, rgba(168,85,247,.16), transparent 60%)',animation:'orb-b 18s ease-in-out infinite'}} />
            <div className="fixed pointer-events-none z-0" style={{top:'38%',left:'-260px',width:'660px',height:'660px',borderRadius:'50%',background:'radial-gradient(circle, rgba(139,92,246,.09), transparent 65%)',animation:'orb-c 22s ease-in-out infinite'}} />
            <div className="fixed pointer-events-none z-0" style={{top:'20%',right:'-200px',width:'520px',height:'520px',borderRadius:'50%',background:'radial-gradient(circle, rgba(192,132,252,.07), transparent 60%)',animation:'orb-a 20s ease-in-out 4s infinite'}} />
            <HeaderServer />
          </>
        )}
        <main className={bare ? '' : 'flex-1 relative z-[1]'}>{children}</main>
        {!bare && <Footer />}
      </body>
    </html>
  )
}
