'use client'
import { useState } from 'react'
import { useLang } from './LangContext'
import { formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, KeyRound, Copy, Check } from 'lucide-react'
import type { Permission } from '@/lib/admin-auth'
import type { AdminUserRow } from '@/app/actions/admin-users'
import {
  createAdminUser, updateAdminUserPermissions, deleteAdminUser, resetAdminUserPassword,
} from '@/app/actions/admin-users'

const PERMS: { key: Permission; labelKey: 'permStores' | 'permCoupons' | 'permCategories' | 'permFlagged' | 'permAutomation' | 'permAutoAdd' | 'permUsers' | 'permSiteContent' }[] = [
  { key: 'stores',       labelKey: 'permStores' },
  { key: 'coupons',      labelKey: 'permCoupons' },
  { key: 'categories',   labelKey: 'permCategories' },
  { key: 'flagged',      labelKey: 'permFlagged' },
  { key: 'automation',   labelKey: 'permAutomation' },
  { key: 'auto_add',     labelKey: 'permAutoAdd' },
  { key: 'site_content', labelKey: 'permSiteContent' },
  { key: 'users',        labelKey: 'permUsers' },
]

const EMPTY_PERMS: Partial<Record<Permission, boolean>> = {}

export function AdminUsersAdmin({ initialUsers, currentUserId }: { initialUsers: AdminUserRow[]; currentUserId: string }) {
  const { tr } = useLang()

  const [users, setUsers]       = useState<AdminUserRow[]>(initialUsers)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing]   = useState<AdminUserRow | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [perms, setPerms]       = useState<Partial<Record<Permission, boolean>>>(EMPTY_PERMS)
  const [saving, setSaving]     = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied]     = useState(false)

  function openNew() {
    setEditing(null); setNewEmail(''); setPerms({ ...EMPTY_PERMS }); setErrorMsg(null); setPanelOpen(true)
  }
  function openEdit(u: AdminUserRow) {
    setEditing(u); setNewEmail(u.email); setPerms({ ...u.permissions }); setErrorMsg(null); setPanelOpen(true)
  }
  function closePanel() { setPanelOpen(false); setEditing(null); setErrorMsg(null) }

  function togglePerm(key: Permission) {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setSaving(true); setErrorMsg(null)
    try {
      if (editing) {
        const { error } = await updateAdminUserPermissions(editing.id, perms)
        if (error) { setErrorMsg(error); return }
        setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, permissions: perms } : u))
        closePanel()
      } else {
        if (!newEmail.trim()) return
        const { error, password } = await createAdminUser({ email: newEmail.trim(), permissions: perms })
        if (error) { setErrorMsg(error); return }
        if (password) setNewPassword({ email: newEmail.trim(), password })
        // Refresh by appending a placeholder row (page will show full data on reload)
        setUsers(prev => [...prev, {
          id: 'temp-' + Date.now(), email: newEmail.trim(),
          created_at: new Date().toISOString(), last_sign_in_at: null, permissions: perms,
        }])
        closePanel()
      }
    } finally { setSaving(false) }
  }

  async function handleDelete(u: AdminUserRow) {
    if (u.id === currentUserId) { alert(tr.cannotDeleteSelf); return }
    if (!confirm(tr.deleteConfirm)) return
    const { error } = await deleteAdminUser(u.id)
    if (error) { alert(error); return }
    setUsers(prev => prev.filter(x => x.id !== u.id))
  }

  async function handleResetPassword(u: AdminUserRow) {
    const { error, password } = await resetAdminUserPassword(u.id)
    if (error) { alert(error); return }
    if (password) setNewPassword({ email: u.email, password })
  }

  function copyPassword() {
    if (!newPassword) return
    navigator.clipboard.writeText(newPassword.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">{tr.users}</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90">
          <Plus className="h-4 w-4" /> {tr.addUser}
        </button>
      </div>

      {/* One-time password reveal */}
      {newPassword && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <p className="text-sm font-semibold text-green-800 mb-2">
            Mot de passe pour {newPassword.email} (copiez-le, il ne sera plus affiché) :
          </p>
          <div className="flex items-center gap-2">
            <code className="bg-white border border-green-300 rounded-lg px-3 py-2 text-sm font-mono flex-1">{newPassword.password}</code>
            <button onClick={copyPassword} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <button onClick={() => setNewPassword(null)} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-5 py-3 text-left">{tr.email}</th>
              <th className="px-5 py-3 text-left">{tr.permissions}</th>
              <th className="px-5 py-3 text-left hidden lg:table-cell">{tr.createdAt}</th>
              <th className="px-5 py-3 text-left hidden lg:table-cell">{tr.lastSignIn}</th>
              <th className="px-5 py-3 text-right">{tr.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-navy">
                  {u.email}
                  {u.id === currentUserId && <span className="ml-2 text-xs text-gray-400">(vous)</span>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {PERMS.filter(p => u.permissions[p.key]).map(p => (
                      <span key={p.key} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{tr[p.labelKey]}</span>
                    ))}
                    {PERMS.every(p => !u.permissions[p.key]) && <span className="text-xs text-gray-400">—</span>}
                  </div>
                </td>
                <td className="px-5 py-3 text-xs text-gray-400 hidden lg:table-cell">{formatDate(u.created_at)}</td>
                <td className="px-5 py-3 text-xs text-gray-400 hidden lg:table-cell">{u.last_sign_in_at ? formatDate(u.last_sign_in_at) : '—'}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100" title={tr.edit}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleResetPassword(u)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded hover:bg-gray-100" title={tr.resetPassword}>
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(u)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100" title={tr.delete}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-center text-gray-400 py-8">{tr.noData}</p>}
      </div>

      {/* Side panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-[100] flex" role="dialog" aria-modal="true">
          <div className="flex-1 bg-black/40" onClick={closePanel} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-navy">{editing ? tr.edit : tr.addUser}</h2>
              <button onClick={closePanel}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{errorMsg}</div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">{tr.email} {!editing && '*'}</label>
                <input
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  disabled={!!editing}
                  type="email"
                  className="input-base disabled:bg-gray-50 disabled:text-gray-400"
                  autoFocus
                />
                {!editing && (
                  <p className="text-xs text-gray-400">Un mot de passe sera généré automatiquement et affiché une seule fois.</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">{tr.permissions}</label>
                {PERMS.map(p => (
                  <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={!!perms[p.key]}
                      onChange={() => togglePerm(p.key)}
                      className="rounded"
                    />
                    {tr[p.labelKey]}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closePanel} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">{tr.cancel}</button>
              <button
                onClick={handleSave}
                disabled={saving || (!editing && !newEmail.trim())}
                className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? '...' : tr.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
