import withPWAInit from 'next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  swSrc: 'public/custom-sw.js',
  // runtimeCaching is handled inside custom-sw.js (InjectManifest mode)
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

const finalConfig = {
  ...nextConfig,
  eslint: { ignoreDuringBuilds: true },
}

export default withPWA(finalConfig)
