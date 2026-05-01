export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-2xl font-bold text-gray-900">
              <span className="text-amber-500">My</span>Compi
            </a>
            <nav className="flex items-center gap-6">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/autonomous" className="text-orange-500 font-semibold">Autonomous</a>
              <a href="/missions" className="text-gray-600 hover:text-gray-900">Missions</a>
              <a href="/chat" className="text-gray-600 hover:text-gray-900">Chat</a>
            </nav>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Alberto Gala</span>
              <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
