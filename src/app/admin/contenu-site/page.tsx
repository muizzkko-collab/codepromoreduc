import { listHeroSlides, listSiteStats, getSidebarBanner } from '@/app/actions/site-content'
import { getCurrentAdminProfile, hasPermission } from '@/lib/admin-auth'
import { AccessDenied } from '@/components/admin/AccessDenied'
import { SiteContentAdmin } from '@/components/admin/SiteContentAdmin'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Contenu du site' }

export default async function AdminSiteContentPage() {
  const profile = await getCurrentAdminProfile()
  if (!hasPermission(profile, 'site_content')) {
    return <AccessDenied title="Accès refusé" desc="Vous n'avez pas la permission d'accéder à cette page. Contactez un administrateur." />
  }

  const [{ data: slides }, { data: stats }, { data: banner }] = await Promise.all([
    listHeroSlides(),
    listSiteStats(),
    getSidebarBanner(),
  ])

  return <SiteContentAdmin initialSlides={slides} initialStats={stats} initialBanner={banner} />
}
