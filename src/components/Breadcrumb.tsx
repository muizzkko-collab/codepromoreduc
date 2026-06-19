import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface Crumb { label: string; href?: string }

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-sm text-gray-500 flex-wrap">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-primary transition-colors">{crumb.label}</Link>
          ) : (
            <span className="text-gray-800 font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function breadcrumbJsonLd(crumbs: Crumb[], siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: c.href ? `${siteUrl}${c.href}` : undefined,
    })),
  }
}
