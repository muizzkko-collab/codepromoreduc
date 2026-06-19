export interface Store {
  id: string
  wp_term_id: number
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  affiliate_url: string | null
  meta_title: string | null
  meta_description: string | null
  coupon_count: number
  is_featured: boolean
  is_active: boolean
  click_count: number
  popup_banner_url: string | null
  created_at: string
  last_updated: string | null
  awin_merchant_id: number | null
}

export interface Category {
  id: string
  wp_term_id: number
  name: string
  slug: string
  store_count: number
}

export interface Coupon {
  id: string
  wp_post_id: number
  store_id: string
  title: string
  slug: string | null
  code: string | null
  type: string | null
  discount_value: string | null
  destination_url: string | null
  expiry_date: string | null
  is_free_shipping: boolean
  is_active: boolean
  is_flagged: boolean
  click_count: number
  awin_promo_id: string | null
  scraper_source: string | null
  created_at: string
  store?: Store
}

export interface StoreWithCoupons extends Store {
  coupons: Coupon[]
}
