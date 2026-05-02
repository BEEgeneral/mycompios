'use client'

import { useState } from 'react'
import Link from 'next/link'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', highlight: true },
  { href: '/autonomous', label: 'Autonomous', highlight: false },
  { href: '/missions', label: 'Missions', highlight: false },
  { href: '/chat', label: 'Chat', highlight: false },
  { href: '/dashboard/revenue', label: 'Revenue', highlight: false },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="text-xl sm:text-2xl font-bold text-gray-900">
              <span className="text-amber-500">My</span>Compi
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    link.highlight
                      ? 'text-orange-500 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop User */}
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-gray-500">Alberto Gala</span>
              <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 min-w-11 min-h-11 flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {menuOpen && (
            <nav className="md:hidden py-4 border-t border-gray-100 mt-3 -mx-3 px-3 bg-white rounded-b-lg shadow-lg">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors mb-1 ${
                    link.highlight
                      ? 'bg-orange-50 text-orange-500 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-100 mt-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold">
                  A
                </div>
                <span className="text-sm text-gray-600">Alberto Gala</span>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {children}
      </main>
    </div>
  )
}