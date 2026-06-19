/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  async redirects() {
    return [
      { source: '/3bsolutions', destination: '/connexion/', permanent: true },
      { source: '/3bsolutions/', destination: '/connexion/', permanent: true },
      { source: '/user', destination: '/connexion/', permanent: true },
      { source: '/user/', destination: '/connexion/', permanent: true },
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
