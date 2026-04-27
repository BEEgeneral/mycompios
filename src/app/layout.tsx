import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MyCompi - Tu equipo IA trabaja 24/7',
  description: 'Profesionales de IA especializados para tu negocio. Marketing, ventas, atención al cliente y más.',
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
