'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Tag, ChevronRight } from 'lucide-react'
import { StoreLogo } from './StoreLogo'

export interface DirectoryStore {
  id: string
  name: string
  slug: string
  logo_url: string | null
  coupon_count: number
}

export interface DirectoryTab {
  key: string
  label: string
  stores: DirectoryStore[]
}

export function StoreDirectory({ tabs, totalStores }: { tabs: DirectoryTab[]; totalStores: number }) {
  const [active, setActive] = useState(tabs[0]?.key ?? '')
  const current = tabs.find(t => t.key === active) ?? tabs[0]
  const maxCount = Math.max(1, ...(current?.stores.map(s => s.coupon_count) ?? [1]))

  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-[10px] font-bold tracking-widest uppercase mb-4">
              <span className="w-1.5 h-1.5 bg-primary rounded-sm" /> Annuaire des boutiques
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tighter">{totalStores.toLocaleString('fr-FR')}+ boutiques.</h2>
            <h3 className="text-xl md:text-2xl font-bold text-white/40 tracking-tighter">Chaque code vérifié.</h3>
          </div>
          <Link href="/all-stores/" className="text-sm font-bold text-primary flex items-center gap-1 group shrink-0">
            Voir toutes les boutiques <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto pb-6 mb-2 gap-3">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all border ${
                active === tab.key
                  ? 'bg-primary/20 text-primary border-primary/30'
                  : 'bg-white/[0.05] border-white/10 text-white/70 hover:bg-white/[0.08]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {(current?.stores ?? []).length === 0 ? (
            <p className="col-span-full text-center text-white/30 font-mono py-12">Aucune boutique pour cette catégorie.</p>
          ) : (
            current!.stores.map(store => {
              const activity = Math.max(10, Math.round((store.coupon_count / maxCount) * 100))
              return (
                <Link key={store.id} href={`/store/${store.slug}/`} className="glass-card rounded-2xl p-6 flex flex-col justify-between group h-full">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <StoreLogo src={store.logo_url} name={store.name} size="sm" />
                      <h3 className="text-base font-extrabold text-white group-hover:text-primary transition-colors leading-tight truncate">
                        {store.name}
                      </h3>
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-xs text-white/80 font-bold">
                        <Tag className="w-3.5 h-3.5 text-primary" /> {store.coupon_count} code{store.coupon_count !== 1 ? 's' : ''} actif{store.coupon_count !== 1 ? 's' : ''}
                      </div>
                      <div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-1.5">
                          <div className="bg-gradient-to-r from-primary-dark to-primary h-full rounded-full" style={{ width: `${activity}%` }} />
                        </div>
                        <div className="text-[9px] uppercase font-bold tracking-widest text-primary">Activité {activity}%</div>
                      </div>
                    </div>
                  </div>
                  <div className="hp-btn w-full text-center bg-white/5 border border-white/10 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider">
                    Voir les codes
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
