'use client'
import { useState } from 'react'
import { useLang } from './LangContext'
import { formatDate } from '@/lib/utils'
import { ShieldOff, Eye } from 'lucide-react'
import { disableFlaggedCoupon, ignoreFlag } from '@/app/actions/flagged'

interface FlagRow {
  id: string; reason: string; created_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coupon: any
}

export function FlaggedAdmin({ initialFlags }: { initialFlags: FlagRow[] }) {
  const { tr } = useLang()
  const [flags, setFlags] = useState<FlagRow[]>(initialFlags)
  const [loading, setLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleDisable(flag: FlagRow) {
    if (!flag.coupon) return
    setLoading(flag.id); setErrorMsg(null)
    const { error } = await disableFlaggedCoupon(flag.coupon.id, flag.id)
    if (error) { setErrorMsg(error); setLoading(null); return }
    setFlags(prev => prev.filter(f => f.id !== flag.id))
    setLoading(null)
  }

  async function handleIgnore(id: string) {
    setLoading(id); setErrorMsg(null)
    const { error } = await ignoreFlag(id)
    if (error) { setErrorMsg(error); setLoading(null); return }
    setFlags(prev => prev.filter(f => f.id !== id))
    setLoading(null)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-navy mb-6">{tr.flagged}</h1>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
          {errorMsg}
        </div>
      )}

      {flags.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <ShieldOff className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucun signalement en attente</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Coupon</th>
                <th className="px-5 py-3 text-left">{tr.store}</th>
                <th className="px-5 py-3 text-left">{tr.reason}</th>
                <th className="px-5 py-3 text-left">{tr.dateFlagged}</th>
                <th className="px-5 py-3 text-right">{tr.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {flags.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-navy line-clamp-1">{f.coupon?.title ?? '—'}</p>
                    {f.coupon && !f.coupon.is_active && (
                      <span className="text-xs text-red-500">Déjà désactivé</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{f.coupon?.store?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600 max-w-[200px]">
                    <p className="line-clamp-2">{f.reason}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(f.created_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDisable(f)}
                        disabled={loading === f.id || !f.coupon?.is_active}
                        className="flex items-center gap-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                      >
                        <ShieldOff className="h-3 w-3" /> {tr.disable}
                      </button>
                      <button
                        onClick={() => handleIgnore(f.id)}
                        disabled={loading === f.id}
                        className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                      >
                        <Eye className="h-3 w-3" /> {tr.ignore}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
