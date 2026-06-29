'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Store, Tag } from 'lucide-react'

const TABS = [
  { href: '/',            label: 'Accueil',    Icon: Home  },
  { href: '/recherche',   label: 'Recherche',  Icon: Search },
  { href: '/all-stores/', label: 'Boutiques',  Icon: Store  },
  { href: '/coupon-categories/', label: 'Catégories', Icon: Tag },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      <style>{`
        .pwa-bottom-nav {
          display: none;
        }
        @media (max-width: 767px) {
          .pwa-bottom-nav {
            display: flex;
          }
        }
        @media (display-mode: standalone) {
          .pwa-bottom-nav {
            display: flex;
          }
        }
        .pwa-bottom-nav-spacer {
          display: none;
        }
        @media (max-width: 767px) {
          .pwa-bottom-nav-spacer {
            display: block;
            height: 72px;
          }
        }
        @media (display-mode: standalone) {
          .pwa-bottom-nav-spacer {
            display: block;
            height: calc(72px + env(safe-area-inset-bottom, 0px));
          }
          .pwa-bottom-nav {
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
        }
      `}</style>
      <div className="pwa-bottom-nav-spacer" />
      <nav
        className="pwa-bottom-nav fixed bottom-0 left-0 right-0 z-50 items-center justify-around"
        style={{
          background: 'rgba(4,6,18,.92)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid rgba(255,255,255,.1)',
          minHeight: 64,
        }}
      >
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
              style={{ color: active ? '#38bdf8' : 'rgba(255,255,255,.45)', flex: 1, textAlign: 'center' }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: '.02em' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
