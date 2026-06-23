'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from './LangContext'
import { usePermissions } from './PermissionsContext'
import {
  LayoutDashboard, Store, Tag, FolderOpen, Flag,
  RefreshCw, PlusCircle, LogOut, Globe, ChevronRight, Users, Image as ImageIcon, FileText,
} from 'lucide-react'
import { LogoIcon } from '@/components/Logo'
import type { Permission } from '@/lib/admin-auth'

const navItems = (tr: ReturnType<typeof useLang>['tr']): { href: string; icon: typeof Store; label: string; perm?: Permission }[] => [
  { href: '/admin/',                         icon: LayoutDashboard, label: tr.dashboard },
  { href: '/admin/boutiques/',               icon: Store,           label: tr.stores,      perm: 'stores' },
  { href: '/admin/coupons/',                 icon: Tag,             label: tr.coupons,     perm: 'coupons' },
  { href: '/admin/categories/',              icon: FolderOpen,      label: tr.categories,  perm: 'categories' },
  { href: '/admin/signalements/',            icon: Flag,            label: tr.flagged,     perm: 'flagged' },
  { href: '/admin/automatisation/',          icon: RefreshCw,       label: tr.automation,  perm: 'automation' },
  { href: '/admin/ajouter-automatiquement/', icon: PlusCircle,      label: tr.autoAdd,     perm: 'auto_add' },
  { href: '/admin/contenu-site/',            icon: ImageIcon,       label: tr.siteContent, perm: 'site_content' },
  { href: '/admin/contenu-seo/',             icon: FileText,        label: tr.seoContent,  perm: 'site_content' },
  { href: '/admin/utilisateurs/',            icon: Users,           label: tr.users,       perm: 'users' },
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
    <aside style={{ width:240, flexShrink:0, background:'rgba(255,255,255,.02)', borderRight:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column', minHeight:'100vh', backdropFilter:'blur(24px)' }}>

      {/* Logo */}
      <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <LogoIcon size={32} />
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:'#fff', letterSpacing:'-.01em', lineHeight:1 }}>
              <span style={{ color:'#fff' }}>Codepromo</span><span style={{ color:'#00d4ff' }}>reduc</span>
            </div>
            <div style={{ fontSize:9, fontWeight:700, color:'rgba(0,212,255,.7)', textTransform:'uppercase', letterSpacing:'.18em', marginTop:2 }}>Admin</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'10px 10px', overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
        {visibleItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/admin/'
            ? pathname === '/admin' || pathname === '/admin/'
            : pathname.startsWith(href.replace(/\/$/, ''))
          return (
            <Link
              key={href}
              href={href}
              style={{
                display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10,
                fontSize:13, fontWeight: isActive ? 700 : 500, textDecoration:'none',
                transition:'all 200ms ease',
                background: isActive ? 'rgba(56,189,248,.12)' : 'transparent',
                color: isActive ? '#38bdf8' : 'rgba(255,255,255,.55)',
                border: isActive ? '1px solid rgba(56,189,248,.2)' : '1px solid transparent',
              }}
            >
              <Icon style={{ width:15, height:15, flexShrink:0 }} />
              <span style={{ flex:1 }}>{label}</span>
              {isActive && <ChevronRight style={{ width:12, height:12, opacity:.6 }} />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column', gap:4 }}>
        {email && (
          <div style={{ padding:'6px 12px 10px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:999, background:'linear-gradient(135deg,#38bdf8,#0ea5e9)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:10, fontWeight:900, color:'#060810' }}>{email[0]?.toUpperCase()}</span>
            </div>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</span>
          </div>
        )}
        <button
          onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, fontSize:12, fontWeight:500, color:'rgba(255,255,255,.4)', background:'transparent', border:'none', cursor:'pointer', transition:'all 200ms ease', width:'100%', textAlign:'left' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.8)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.4)' }}
        >
          <Globe style={{ width:14, height:14 }} />
          {lang === 'fr' ? 'English' : 'Français'}
        </button>
        <button
          onClick={handleLogout}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, fontSize:12, fontWeight:500, color:'rgba(255,255,255,.4)', background:'transparent', border:'none', cursor:'pointer', transition:'all 200ms ease', width:'100%', textAlign:'left' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.4)' }}
        >
          <LogOut style={{ width:14, height:14 }} />
          {tr.logout}
        </button>
      </div>
    </aside>
  )
}
