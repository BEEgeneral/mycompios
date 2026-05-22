import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/onboarding', '/autonomous'],
        disallow: ['/dashboard', '/api/', '/chat', '/clients', '/finance', '/login', '/registro', '/recuperar'],
      },
    ],
    sitemap: 'https://mycompios2.vercel.app/sitemap.xml',
  }
}