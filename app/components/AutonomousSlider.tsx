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

interface AutonomousSliderProps {
  onSelect?: (tier: Tier) => void
  onCheckout?: (tierId: string) => void
}

export default function AutonomousSlider({ onSelect, onCheckout }: AutonomousSliderProps) {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [selectedIndex, setSelectedIndex] = useState(5) // Default to 24H
  const [loading, setLoading] = useState(true)
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
        // Find 24H index
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
        alert(`Modo demo: ${tiers[selectedIndex].durationLabel} seleccionado (${tiers[selectedIndex].priceLabel})`)
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
      <div className="w-full max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const selected = tiers[selectedIndex]

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">AUTONOMOUS</h2>
        <p className="text-gray-600">
          Durante las próximas {selected?.durationLabel || 'X'}, tu equipo IA trabaja de forma continua
        </p>
      </div>

      {/* Selected Tier Badge */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full text-white">
          <span className="text-2xl font-bold">{selected?.durationLabel}</span>
          <span className="text-lg">•</span>
          <span className="text-xl">{selected?.hourlyRateLabel}/hr</span>
        </div>
      </div>

      {/* Slider */}
      <div className="mb-8">
        <input
          type="range"
          min="0"
          max={tiers.length - 1}
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
          style={{
            background: `linear-gradient(to right, #f97316 0%, #f97316 ${(selectedIndex / (tiers.length - 1)) * 100}%, #e5e7eb ${(selectedIndex / (tiers.length - 1)) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between mt-2 text-sm text-gray-500">
          {tiers.map((tier, i) => (
            <span 
              key={tier.id}
              className={`${i === selectedIndex ? 'text-orange-500 font-bold' : ''}`}
            >
              {tier.durationLabel}
            </span>
          ))}
        </div>
      </div>

      {/* Selected Tier Card */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{selected?.priceLabel}</h3>
            <p className="text-gray-500 text-sm">{selected?.durationLabel} de ejecución autónoma</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Por hora</p>
            <p className="text-lg font-semibold text-gray-700">{selected?.hourlyRateLabel}</p>
          </div>
        </div>

        <ul className="space-y-2">
          {selected?.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA Button */}
      <button
        onClick={handleCheckout}
        disabled={purchasing}
        className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold text-lg rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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

      {/* Footer Note */}
      <p className="text-center text-xs text-gray-400 mt-4">
        MyCompi toma decisiones de forma autónoma. Puedes chatear en cualquier momento para dar feedback.
      </p>
    </div>
  )
}
