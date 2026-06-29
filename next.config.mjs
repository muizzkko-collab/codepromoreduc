import withPWAInit from 'next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  swSrc: 'public/custom-sw.js',
  runtimeCaching: [
    // Cache pages for offline
    {
      urlPattern: /^https:\/\/codepromoreduc\.fr\/(store|all-stores|daily-deals|weekly-deals|coupon-category)/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages-cache',
        expiration: { maxEntries: 30, maxAgeSeconds: 86400 },
      },
    },
    // Cache images (store logos, banners)
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 604800 },
      },
    },
    // Cache Supabase storage assets
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-assets',
        expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
      },
    },
    // Cache static assets
    {
      urlPattern: /\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 2592000 },
      },
    },
    // Network-first for API calls
    {
      urlPattern: /^\/api\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 300 },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  async redirects() {
    return [
      { source: '/3bsolutions', destination: '/connexion/', permanent: true },
      { source: '/3bsolutions/', destination: '/connexion/', permanent: true },
      { source: '/user', destination: '/connexion/', permanent: true },
      { source: '/user/', destination: '/connexion/', permanent: true },
      { source: '/blog', destination: '/', permanent: true },
      { source: '/blog/', destination: '/', permanent: true },
      { source: '/nous-contacter', destination: '/', permanent: true },
      { source: '/nous-contacter/', destination: '/', permanent: true },
      { source: '/uber-uns', destination: '/', permanent: true },
      { source: '/uber-uns/', destination: '/', permanent: true },
      { source: '/datenschutz', destination: '/', permanent: true },
      { source: '/datenschutz/', destination: '/', permanent: true },
      { source: '/go-store/:id', destination: '/', permanent: false },
      { source: '/out/:id', destination: '/', permanent: false },
      { source: '/coupon-tag/:slug', destination: '/coupon-categories/', permanent: true },
      { source: '/coupon-tag/:slug/', destination: '/coupon-categories/', permanent: true },
      { source: '/store/code-promo-nausicaa', destination: '/all-stores/', permanent: false },
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

export default withPWA(nextConfig)
