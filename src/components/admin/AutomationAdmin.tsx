'use client'
import { useState } from 'react'
import { useLang } from './LangContext'
import { formatDate } from '@/lib/utils'
import {
  RefreshCw, Clock,
  Zap, Globe, TrendingUp, TrendingDown,
} from 'lucide-react'

interface SyncLog {
  id: string; created_at: string; status: string | null; sync_type: string | null
  coupons_added: number | null; coupons_removed: number | null; coupons_updated: number | null
  stores_synced: number | null; stores_failed: number | null
  error_message: string | null; duration_ms: number | null
}

interface StoreSyncLog {
  store_name: string; status: string
  added: number; updated: number; deactivated: number
  error_msg: string | null; created_at: string
}

type Network = 'awin' | 'tradedoubler' | 'kwanko' | 'effiliation'

interface NetworkSyncResult {
  network:     Network
  added:       number
  updated:     number
  deactivated: number
  stores:      number
  errors:      number
  duration_s:  string
  error:       string | null
}

interface Props {
  syncLogs:  SyncLog[]
  storeLogs: StoreSyncLog[]
  stats: {
    awinStores: number; scraperStores: number
    addedToday: number; expiredToday: number
  }
}

const NETWORKS: { key: Network; label: string; color: string }[] = [
  { key: 'awin',         label: 'Awin',         color: 'bg-blue-100 text-blue-700'   },
  { key: 'tradedoubler', label: 'Tradedoubler',  color: 'bg-orange-100 text-orange-700' },
  { key: 'kwanko',       label: 'Kwanko',        color: 'bg-purple-100 text-purple-700' },
  { key: 'effiliation',  label: 'Effiliation',   color: 'bg-green-100 text-green-700'  },
]

export function AutomationAdmin({ syncLogs, storeLogs, stats }: Props) {
  const { tr } = useLang()
  const [syncing, setSyncing]               = useState(false)
  const [networkSyncing, setNetworkSyncing] = useState<Network | null>(null)
  const [message, setMessage]               = useState<string | null>(null)
  const [lastResults, setLastResults]       = useState<NetworkSyncResult[] | null>(null)
  const [activeTab, setActiveTab]           = useState<'overview' | 'stores' | 'logs'>('overview')

  const last        = syncLogs.find(l => l.sync_type === 'awin') ?? syncLogs[0]
  const lastScrape  = syncLogs.find(l => l.sync_type === 'scraper')
  const added24h    = syncLogs.filter(inLast24h).reduce((s, l) => s + (l.coupons_added ?? 0), 0)
  const failedStores  = storeLogs.filter(l => l.status === 'error')
  const successStores = storeLogs.filter(l => l.status === 'success')

  async function doSync(network?: Network) {
    const qs = network ? `?network=${network}` : ''
    if (network) setNetworkSyncing(network)
    else setSyncing(true)
    setMessage(null); setLastResults(null)

    try {
      const res  = await fetch(`/api/admin/sync${qs}`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))

      if (res.ok && json.results) {
        const results: NetworkSyncResult[] = json.results
        setLastResults(results)
        const totals = results.reduce((a, r) => ({ added: a.added + r.added, deactivated: a.deactivated + r.deactivated }), { added: 0, deactivated: 0 })
        setMessage(`✓ Sync terminée : ${totals.added} ajoutés, ${totals.deactivated} désactivés`)
      } else {
        setMessage(`Erreur : ${json.error ?? 'inconnue'}`)
      }
    } catch {
      setMessage('Erreur réseau lors du déclenchement.')
    } finally {
      setSyncing(false); setNetworkSyncing(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">{tr.automation}</h1>
        <button
          onClick={() => doSync()}
          disabled={syncing || !!networkSyncing}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sync en cours…' : 'Sync tous les réseaux'}
        </button>
      </div>

      {message && (
        <p className={`text-sm px-4 py-2.5 rounded-lg font-medium ${message.startsWith('Erreur') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {message}
        </p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Zap}         label="Boutiques Awin"      value={String(stats.awinStores)}    color="bg-blue-100 text-blue-600" />
        <StatCard icon={Globe}       label="Boutiques scraper"   value={String(stats.scraperStores)} color="bg-purple-100 text-purple-600" />
        <StatCard icon={TrendingUp}  label="Ajoutés aujourd'hui" value={`+${stats.addedToday}`}      color="bg-green-100 text-green-600" />
        <StatCard icon={TrendingDown} label="Expirés aujourd'hui" value={String(stats.expiredToday)} color="bg-orange-100 text-orange-600" />
      </div>

      {/* Per-network status cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Réseaux affiliés</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {NETWORKS.map(({ key, label, color }) => {
            const lastLog  = syncLogs.find(l => l.sync_type === key || l.sync_type?.includes(key))
            const liveResult = lastResults?.find(r => r.network === key)
            const isSyncing  = networkSyncing === key || (syncing)

            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                  {lastLog && <StatusBadge status={lastLog.status} />}
                </div>

                {liveResult ? (
                  <div className="text-xs space-y-0.5">
                    <p className="text-green-600 font-medium">+{liveResult.added} ajoutés</p>
                    <p className="text-blue-500">{liveResult.updated} mis à jour</p>
                    <p className="text-orange-500">-{liveResult.deactivated} désactivés</p>
                    <p className="text-gray-400">{liveResult.stores} boutiques · {liveResult.duration_s}s</p>
                    {liveResult.error && <p className="text-red-500 truncate">{liveResult.error}</p>}
                  </div>
                ) : lastLog ? (
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>{formatDate(lastLog.created_at)}</p>
                    <p>+{lastLog.coupons_added ?? 0} · -{lastLog.coupons_removed ?? 0}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Jamais synchronisé</p>
                )}

                {key === 'kwanko' ? (
                  <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    Endpoint API non configuré
                  </p>
                ) : (
                  <button
                    onClick={() => doSync(key)}
                    disabled={isSyncing}
                    className="w-full text-xs py-1.5 rounded-lg border border-gray-200 hover:border-primary hover:text-primary disabled:opacity-40 transition-colors font-medium"
                  >
                    {isSyncing ? '…' : `Sync ${label}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Last sync overview cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SyncCard
          title="Dernière sync Awin"
          icon={Clock}
          status={last?.status}
          time={last ? formatDate(last.created_at) : 'Jamais'}
          detail={last ? `${last.coupons_added ?? 0} ajoutés · ${last.coupons_removed ?? 0} désactivés · ${last.stores_synced ?? 0} boutiques` : '—'}
          duration={last?.duration_ms}
          schedule="Tous les jours à 3h (Paris)"
        />
        <SyncCard
          title="Dernier scraping"
          icon={Globe}
          status={lastScrape?.status}
          time={lastScrape ? formatDate(lastScrape.created_at) : 'Jamais'}
          detail={lastScrape ? `${lastScrape.coupons_added ?? 0} ajoutés · ${lastScrape.stores_synced ?? 0} boutiques` : '—'}
          duration={lastScrape?.duration_ms}
          schedule="Chaque dimanche à 4h"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(['overview', 'stores', 'logs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' ? "Vue d'ensemble" : tab === 'stores' ? `Boutiques (${storeLogs.length})` : 'Historique'}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="p-5 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{successStores.length}</p>
              <p className="text-xs text-gray-500 mt-1">Boutiques synchronisées</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{failedStores.length}</p>
              <p className="text-xs text-gray-500 mt-1">Boutiques échouées</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-navy">{added24h}</p>
              <p className="text-xs text-gray-500 mt-1">Codes ajoutés (24h)</p>
            </div>
          </div>
        )}

        {activeTab === 'stores' && (
          <div className="overflow-x-auto">
            {storeLogs.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">Aucun résultat par boutique disponible. Lancez une sync.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">Boutique</th>
                    <th className="px-5 py-3 text-left">Statut</th>
                    <th className="px-5 py-3 text-right">Ajoutés</th>
                    <th className="px-5 py-3 text-right">Mis à jour</th>
                    <th className="px-5 py-3 text-right">Désactivés</th>
                    <th className="px-5 py-3 text-left hidden lg:table-cell">Erreur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {storeLogs.map((log, i) => (
                    <tr key={i} className={`hover:bg-gray-50 ${log.status === 'error' ? 'bg-red-50/50' : ''}`}>
                      <td className="px-5 py-2.5 font-medium text-navy">{log.store_name}</td>
                      <td className="px-5 py-2.5"><StatusBadge status={log.status} /></td>
                      <td className="px-5 py-2.5 text-right text-green-600 font-medium">+{log.added}</td>
                      <td className="px-5 py-2.5 text-right text-blue-500">{log.updated}</td>
                      <td className="px-5 py-2.5 text-right text-orange-500">-{log.deactivated}</td>
                      <td className="px-5 py-2.5 text-xs text-red-400 hidden lg:table-cell max-w-[180px]">
                        <p className="truncate">{log.error_msg ?? '—'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="overflow-x-auto">
            {syncLogs.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">Aucun historique.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-left">Type</th>
                    <th className="px-5 py-3 text-left">Statut</th>
                    <th className="px-5 py-3 text-right">Ajoutés</th>
                    <th className="px-5 py-3 text-right">Désactivés</th>
                    <th className="px-5 py-3 text-right hidden lg:table-cell">Boutiques</th>
                    <th className="px-5 py-3 text-right hidden lg:table-cell">Durée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {syncLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="px-5 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          log.sync_type === 'awin'         ? 'bg-blue-100 text-blue-700'
                        : log.sync_type === 'tradedoubler' ? 'bg-orange-100 text-orange-700'
                        : log.sync_type === 'kwanko'       ? 'bg-purple-100 text-purple-700'
                        : log.sync_type === 'effiliation'  ? 'bg-green-100 text-green-700'
                        : log.sync_type === 'scraper'      ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-500'}`}>
                          {log.sync_type ?? 'manual'}
                        </span>
                      </td>
                      <td className="px-5 py-2.5"><StatusBadge status={log.status} /></td>
                      <td className="px-5 py-2.5 text-right text-green-600 font-medium">+{log.coupons_added ?? 0}</td>
                      <td className="px-5 py-2.5 text-right text-orange-500">-{log.coupons_removed ?? 0}</td>
                      <td className="px-5 py-2.5 text-right text-gray-400 hidden lg:table-cell">{log.stores_synced ?? '—'}</td>
                      <td className="px-5 py-2.5 text-right text-xs text-gray-400 hidden lg:table-cell">
                        {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function inLast24h(l: { created_at: string }) {
  return Date.now() - new Date(l.created_at).getTime() < 86400000
}

function SyncCard({ title, icon: Icon, status, time, detail, duration, schedule }: {
  title: string; icon: React.ElementType; status: string | null | undefined
  time: string; detail: string; duration: number | null | undefined; schedule: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-400" />
          <h3 className="font-semibold text-navy text-sm">{title}</h3>
        </div>
        {status && <StatusBadge status={status} />}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">{time}</p>
        <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
        {duration && <p className="text-xs text-gray-400 mt-0.5">Durée: {(duration / 1000).toFixed(1)}s</p>}
      </div>
      <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">{schedule}</p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-bold text-navy">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    error:   'bg-red-100 text-red-700',
    running: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
      {status ?? 'unknown'}
    </span>
  )
}
