/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  async redirects() {
    return [
      // Auth pages
      { source: '/3bsolutions', destination: '/connexion/', permanent: true },
      { source: '/3bsolutions/', destination: '/connexion/', permanent: true },
      { source: '/user', destination: '/connexion/', permanent: true },
      { source: '/user/', destination: '/connexion/', permanent: true },

      // Old WordPress pages → new equivalents
      { source: '/blog', destination: '/', permanent: true },
      { source: '/blog/', destination: '/', permanent: true },
      { source: '/nous-contacter', destination: '/', permanent: true },
      { source: '/nous-contacter/', destination: '/', permanent: true },
      { source: '/uber-uns', destination: '/', permanent: true },
      { source: '/uber-uns/', destination: '/', permanent: true },
      { source: '/datenschutz', destination: '/', permanent: true },
      { source: '/datenschutz/', destination: '/', permanent: true },

      // Old affiliate redirect links → homepage
      { source: '/go-store/:id', destination: '/', permanent: false },
      { source: '/out/:id', destination: '/', permanent: false },

      // Old coupon-tag pages → category listing
      { source: '/coupon-tag/:slug', destination: '/coupon-categories/', permanent: true },
      { source: '/coupon-tag/:slug/', destination: '/coupon-categories/', permanent: true },

      // Old WordPress individual coupon URLs under /store/slug/ID/
      // (already handled by the [id] sub-page route)

      // Missing store: nausicaa → closest match redirect
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

export default nextConfig
