import withPWA from '@ducanh2912/next-pwa'

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'X-XSS-Protection',        value: '1; mode=block' },
  { key: 'Referrer-Policy',         value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com data:",
      "img-src 'self' data: blob: *.supabase.co codepromoreduc.fr *.codepromoreduc.fr",
      "connect-src 'self' *.supabase.co wss://*.supabase.co api.awin.com fcm.googleapis.com",
      "frame-ancestors 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join('; '),
  },
]

// RSC Vary headers — prevent shared-cache poisoning via RSC/prefetch collisions
// (issues: x-nextjs-data cache poisoning, _rsc cache poisoning, RSC original URL)
const rscVaryHeaders = [
  {
    key: 'Vary',
    value: 'Accept, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url',
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  async headers() {
    return [
      // Security headers on all routes
      { source: '/(.*)', headers: securityHeaders },
      // RSC Vary headers on page routes + RSC data routes
      { source: '/((?!_next/static|_next/image|favicon|icons|manifest|sw\\.js).+)', headers: rscVaryHeaders },
    ]
  },
  async redirects() {
    return [
      { source: '/3bsolutions',       destination: '/connexion/',        permanent: true },
      { source: '/3bsolutions/',      destination: '/connexion/',        permanent: true },
      { source: '/user',              destination: '/connexion/',        permanent: true },
      { source: '/user/',             destination: '/connexion/',        permanent: true },
      { source: '/blog',              destination: '/',                  permanent: true },
      { source: '/blog/',             destination: '/',                  permanent: true },
      { source: '/nous-contacter',    destination: '/',                  permanent: true },
      { source: '/nous-contacter/',   destination: '/',                  permanent: true },
      { source: '/uber-uns',          destination: '/',                  permanent: true },
      { source: '/uber-uns/',         destination: '/',                  permanent: true },
      { source: '/datenschutz',       destination: '/',                  permanent: true },
      { source: '/datenschutz/',      destination: '/',                  permanent: true },
      { source: '/go-store/:id',      destination: '/',                  permanent: false },
      { source: '/out/:id',           destination: '/',                  permanent: false },
      { source: '/coupon-tag/:slug',  destination: '/coupon-categories/', permanent: true },
      { source: '/coupon-tag/:slug/', destination: '/coupon-categories/', permanent: true },
      { source: '/store/code-promo-nausicaa',  destination: '/all-stores/', permanent: false },
      { source: '/store/code-promo-nausicaa/', destination: '/all-stores/', permanent: false },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'dnxrkszwybcpidceurgz.supabase.co' },
      { protocol: 'https', hostname: 'codepromoreduc.fr' },
      { protocol: 'https', hostname: '*.codepromoreduc.fr' },
      { protocol: 'http',  hostname: 'codepromoreduc.fr' },
    ],
    unoptimized: true,
  },
}

const finalConfig = {
  ...nextConfig,
  eslint: { ignoreDuringBuilds: true },
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  swSrc: 'public/custom-sw.js',
})(finalConfig)
