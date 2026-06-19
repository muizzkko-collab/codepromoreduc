export interface NetworkCoupon {
  network:            'awin' | 'tradedoubler' | 'kwanko' | 'effiliation'
  network_coupon_id:  string
  network_merchant_id: string
  title:              string
  description:        string | null
  code:               string | null
  type:               'code' | 'deal' | 'shipping'
  discount_value:     number | null
  discount_type:      'percent' | 'fixed' | null
  destination_url:    string
  expiry_date:        string | null  // ISO date string YYYY-MM-DD or null
  is_exclusive:       boolean
}

export interface NetworkMerchant {
  id:          string
  name:        string
  logo_url:    string | null
  website_url: string | null
  join_url:    string | null
}
