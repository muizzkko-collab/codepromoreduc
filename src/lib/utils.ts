import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

export function getCouponTypeLabel(type: string | null, isFreeShipping: boolean): string {
  if (isFreeShipping) return 'Livraison gratuite'
  if (!type) return 'Offre'
  const t = type.toLowerCase()
  if (t.includes('code') || t.includes('voucher')) return 'Code promo'
  if (t.includes('free') || t.includes('gratuit')) return 'Gratuit'
  return 'Offre'
}

export function hasCode(coupon: { code: string | null }): boolean {
  return !!(coupon.code && coupon.code.trim() && coupon.code !== '0')
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://codepromoreduc.fr'
}

export function getCurrentMonthYear(): string {
  const s = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
