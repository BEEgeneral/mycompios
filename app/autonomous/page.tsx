'use client'

import { useState, useEffect } from 'react'

interface Tier {
  id: string
  duration: number
  durationLabel: string
  price: number
  priceLabel: string
  hourlyRate: number
  hourlyRateLabel: string
  features: string[]
}

export default function AutonomousPage() {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(5)
  const [showAllTiers, setShowAllTiers] = useState(false)
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => {
    fetchTiers()
  }, [])

  async function fetchTiers() {
    try {
      const res = await fetch('/api/autonomous')
      const data = await res.json()
      if (data.success && data.tiers) {
        setTiers(data.tiers)
        const idx = data.tiers.findIndex((t: Tier) => t.id === '24h')
        if (idx !== -1) setSelectedIndex(idx)
      }
    } catch (e) {
      console.error('Failed to fetch tiers:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckout() {
    if (!tiers[selectedIndex]) return
    
    setPurchasing(true)
    try {
      const token = localStorage.getItem('mc_token')
      if (!token) {
        alert('Necesitas hacer login primero')
        return
      }

      const res = await fetch('/api/autonomous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tier_id: tiers[selectedIndex].id })
      })
      
      const data = await res.json()
      
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else if (data.success && data.mockCheckoutUrl) {
        alert(`Modo demo: ${tiers[selectedIndex].durationLabel} seleccionado`)
      } else {
        alert(data.error || 'Error al procesar')
      }
    } catch (e) {
      alert('Error de conexión')
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    )
  }

  const selected = tiers[selectedIndex]
  const displayedTiers = showAllTiers ? tiers : tiers.slice(0, 5)

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Section */}
      <div className="text-center px-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
          Modo Autónomo
        </h1>
        <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto">
          Tu equipo IA trabaja de forma continua mientras tú descansas. 
          Selecciona la duración y deja que MyCompi ejecute tus tareas 24/7.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 px-2">
        <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm">
          <div className="text-2xl mb-3">🎯</div>
          <h3 className="font-bold text-gray-900 mb-2">Toma de Decisiones</h3>
          <p className="text-sm text-gray-600">MyCompi analiza situaciones y toma decisiones automáticamente</p>
        </div>
        <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm">
          <div className="text-2xl mb-3">⚡</div>
          <h3 className="font-bold text-gray-900 mb-2">Ejecución Continua</h3>
          <p className="text-sm text-gray-600">Trabaja 24/7 sin pausas ni descansos</p>
        </div>
        <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm">
          <div className="text-2xl mb-3">💬</div>
          <h3 className="font-bold text-gray-900 mb-2">Feedback en Tiempo Real</h3>
          <p className="text-sm text-gray-600">Chatea cuando quieras para dar instrucciones</p>
        </div>
      </div>

      {/* Slider Card */}
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mx-2 max-w-2xl mx-auto">
        {/* Selected Badge */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full text-white">
            <span className="text-lg sm:text-2xl font-bold">{selected?.durationLabel}</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-sm sm:text-xl">{selected?.hourlyRateLabel}/hr</span>
          </div>
        </div>

        {/* Slider */}
        <div className="mb-4 sm:mb-6 px-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 text-nowrap">1H</span>
            <input
              type="range"
              min="0"
              max={tiers.length - 1}
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(parseInt(e.target.value))}
              className="flex-1 h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              style={{
                background: `linear-gradient(to right, #f97316 0%, #f97316 ${(selectedIndex / (tiers.length - 1)) * 100}%, #e5e7eb ${(selectedIndex / (tiers.length - 1)) * 100}%, #e5e7eb 100%)`
              }}
            />
            <span className="text-xs text-gray-400 text-nowrap">7D</span>
          </div>
          <div className="flex justify-between mt-2 text-xs sm:text-sm text-gray-500 overflow-x-auto pb-1">
            {displayedTiers.map((tier, i) => (
              <span 
                key={tier.id}
                className={`whitespace-nowrap px-1 ${i === selectedIndex ? 'text-orange-500 font-bold' : ''}`}
              >
                {tier.durationLabel}
              </span>
            ))}
          </div>
        </div>

        {/* Show All Button */}
        {!showAllTiers && tiers.length > 5 && (
          <button 
            onClick={() => setShowAllTiers(true)}
            className="w-full py-2 text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            Ver todos los planes ({tiers.length})
          </button>
        )}

        {/* Selected Card */}
        <div className="bg-gray-50 rounded-xl p-4 sm:p-5 mb-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{selected?.priceLabel}</h3>
              <p className="text-gray-500 text-sm">{selected?.durationLabel} de ejecución autónoma</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-gray-500">Por hora</p>
              <p className="text-lg font-semibold text-gray-700">{selected?.hourlyRateLabel}</p>
            </div>
          </div>

          <ul className="space-y-2">
            {selected?.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleCheckout}
          disabled={purchasing}
          className="w-full py-3 sm:py-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold text-base sm:text-lg rounded-full transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
        >
          {purchasing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 0h12a8 8 0 010 16h-12a8 8 0 010-16z" />
              </svg>
              Procesando...
            </span>
          ) : (
            `START · ${selected?.priceLabel}`
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4 hidden sm:block">
          MyCompi toma decisiones de forma autónoma. Puedes chatear en cualquier momento para dar feedback.
        </p>
      </div>

      {/* Pricing Table */}
      <div className="px-2">
        <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Todos los planes</h3>
        <div className="overflow-x-auto -mx-3 px-3">
          <table className="w-full bg-white rounded-xl shadow-md min-w-[500px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Duración</th>
                <th className="px-4 py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">Precio</th>
                <th className="px-4 py-3 text-right text-xs sm:text-sm font-semibold text-gray-700 hidden sm:table-cell">Por hora</th>
                <th className="px-4 py-3 text-right text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">Ahorro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tiers.map((tier, i) => (
                <tr 
                  key={tier.id}
                  onClick={() => setSelectedIndex(i)}
                  className={`cursor-pointer hover:bg-gray-50 ${i === selectedIndex ? 'bg-orange-50' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-sm">{tier.durationLabel}</td>
                  <td className="px-4 py-3 text-right font-semibold">{tier.priceLabel}</td>
                  <td className="px-4 py-3 text-right text-gray-500 text-sm hidden sm:table-cell">{tier.hourlyRateLabel}</td>
                  <td className="px-4 py-3 text-right text-green-600 text-xs hidden md:table-cell">
                    {tier.id === '1h' ? '-' : `${Math.round((1 - tier.hourlyRate / 19) * 100)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-2">
        <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Preguntas frecuentes</h3>
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2">¿Qué pasa durante el modo autónomo?</h4>
            <p className="text-sm text-gray-600">MyCompi analiza tus tareas, prospectos y datos continuamente. Toma decisiones, crea tareas y ejecuta acciones de forma automática.</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2">¿Puedo parar en cualquier momento?</h4>
            <p className="text-sm text-gray-600">Sí, puedes desactivar el modo autónomo desde tu dashboard en cualquier momento.</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2">¿Qué pasa si no estoy de acuerdo con una decisión?</h4>
            <p className="text-sm text-gray-600">Puedes chatear con MyCompi en cualquier momento para dar feedback o revertir decisiones.</p>
          </div>
        </div>
      </div>
    </div>
  )
}