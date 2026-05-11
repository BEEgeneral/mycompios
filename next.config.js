/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverExternalPackages: ['pg'],
  },
}

module.exports = nextConfig
