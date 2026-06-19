'use client'
import { createContext, useContext, ReactNode } from 'react'
import type { Permission } from '@/lib/admin-auth'

interface PermissionsValue {
  email: string
  permissions: Partial<Record<Permission, boolean>>
}

const PermissionsCtx = createContext<PermissionsValue>({ email: '', permissions: {} })

export function PermissionsProvider({ value, children }: { value: PermissionsValue; children: ReactNode }) {
  return <PermissionsCtx.Provider value={value}>{children}</PermissionsCtx.Provider>
}

export function usePermissions() {
  const ctx = useContext(PermissionsCtx)
  return {
    email: ctx.email,
    can: (perm: Permission) => !!ctx.permissions[perm],
  }
}
