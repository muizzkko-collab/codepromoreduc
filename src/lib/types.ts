export type ContentStatus = 'not_generated' | 'draft' | 'approved' | 'needs_review'
export type ContentTier   = 'premium' | 'standard' | 'light'

export interface ContentH2Section { heading: string; content: string }
export interface ContentFaq       { question: string; answer: string }

export interface ContentBody {
  description:          string
  h2_sections:          ContentH2Section[]
  faqs:                 ContentFaq[]
  internal_link_mentions: string[]
}

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
  is_indexed: boolean
  click_count: number
  popup_banner_url: string | null
  created_at: string
  last_updated: string | null
  awin_merchant_id: number | null
  content_status:       ContentStatus | null
  content_body:         ContentBody | null
  content_generated_at: string | null
  content_approved_at:  string | null
  content_approved_by:  string | null
  content_tier:         ContentTier | null
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
  public_id: number
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
