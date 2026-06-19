import Link from 'next/link'
import { Store } from '@/lib/types'
import { StoreLogo } from './StoreLogo'
import { Tag } from 'lucide-react'

interface Props {
  store: Store
}

export function StoreCard({ store }: Props) {
  return (
    <Link
      href={`/store/${store.slug}/`}
      className="group glass-card rounded-2xl p-4 flex flex-col items-center gap-3"
    >
      <StoreLogo src={store.logo_url} name={store.name} size="md" />
      <div className="text-center">
        <p className="font-semibold text-white text-sm group-hover:text-primary transition-colors line-clamp-2">
          {store.name}
        </p>
        {store.coupon_count > 0 && (
          <p className="text-xs text-white/40 flex items-center justify-center gap-1 mt-1">
            <Tag className="h-3 w-3" />
            {store.coupon_count} code{store.coupon_count > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </Link>
  )
}
