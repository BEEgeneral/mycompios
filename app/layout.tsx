import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://mycompios2.vercel.app'),
  title: 'MyCompi - Tu equipo IA trabaja 24/7',
  description: 'Profesionales de IA especializados para tu negocio. Marketing, ventas, atención al cliente y más.',
  openGraph: {
    title: 'MyCompi — AI Agents that work for your business',
    description: 'Autonomous AI agents that learn, improve and work 24/7 for your company. Pelayo, Paco and BRAIN handle operations automatically.',
    url: 'https://mycompios2.vercel.app',
    siteName: 'MyCompi',
    locale: 'es_ES',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MyCompi AI Agents',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyCompi — AI Agents that work for your business',
    description: 'Autonomous AI agents that learn, improve and work 24/7 for your company.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Poppins', system-ui, sans-serif", background: '#FCF9F1' }}>
        {children}
      </body>
    </html>
  )
}
