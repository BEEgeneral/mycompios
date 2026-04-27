/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/api/auth-register', destination: '/api/auth/register' },
      { source: '/api/auth-login', destination: '/api/auth/login' },
      { source: '/api/fin-autonomous', destination: '/api/fin/autonomous' },
      { source: '/api/business-core', destination: '/api/business/core' },
      { source: '/api/autonomous', destination: '/api/autonomous' },
      { source: '/api/chat', destination: '/api/chat' },
      { source: '/api/learn', destination: '/api/learn' },
      { source: '/api/knowledge', destination: '/api/knowledge' },
      { source: '/api/trial-status', destination: '/api/trial/status' },
    ]
  }
}
module.exports = nextConfig
