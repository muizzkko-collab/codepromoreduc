'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from './LangContext'
import { usePermissions } from './PermissionsContext'
import {
  LayoutDashboard, Store, Tag, FolderOpen, Flag,
  RefreshCw, PlusCircle, LogOut, Globe, ChevronRight, Users, Image as ImageIcon,
} from 'lucide-react'
import type { Permission } from '@/lib/admin-auth'

const navItems = (tr: ReturnType<typeof useLang>['tr']): { href: string; icon: typeof Store; label: string; perm?: Permission }[] => [
  { href: '/admin/',                         icon: LayoutDashboard, label: tr.dashboard },
  { href: '/admin/boutiques/',               icon: Store,           label: tr.stores,    perm: 'stores' },
  { href: '/admin/coupons/',                 icon: Tag,             label: tr.coupons,   perm: 'coupons' },
  { href: '/admin/categories/',              icon: FolderOpen,      label: tr.categories, perm: 'categories' },
  { href: '/admin/signalements/',            icon: Flag,            label: tr.flagged,   perm: 'flagged' },
  { href: '/admin/automatisation/',          icon: RefreshCw,       label: tr.automation, perm: 'automation' },
  { href: '/admin/ajouter-automatiquement/', icon: PlusCircle,      label: tr.autoAdd,   perm: 'auto_add' },
  { href: '/admin/contenu-site/',            icon: ImageIcon,       label: tr.siteContent, perm: 'site_content' },
  { href: '/admin/utilisateurs/',            icon: Users,           label: tr.users,     perm: 'users' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { tr, lang, setLang } = useLang()
  const { can, email } = usePermissions()
  const visibleItems = navItems(tr).filter(item => !item.perm || can(item.perm))

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/connexion/')
  }

  return (
    <aside className="w-64 shrink-0 bg-[#0f172a] text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <span className="text-lg font-bold tracking-tight">
          <span className="text-primary">Code</span>Promo<span className="text-primary">Admin</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {visibleItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/admin/' ? pathname === '/admin' || pathname === '/admin/' : pathname.startsWith(href.replace(/\/$/, ''))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-white/10 text-white font-semibold border-r-2 border-primary'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: lang + logout */}
      <div className="p-4 border-t border-white/10 space-y-2">
        {email && <p className="px-3 text-xs text-white/40 truncate mb-1">{email}</p>}
        <button
          onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Globe className="h-4 w-4" />
          {lang === 'fr' ? 'English' : 'Français'}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/60 hover:text-red-400 hover:bg-white/5 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {tr.logout}
        </button>
      </div>
    </aside>
  )
}
