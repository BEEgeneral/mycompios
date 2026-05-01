'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function FeedbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialScore = searchParams.get('score')
  
  const [score, setScore] = useState<number | null>(initialScore ? parseInt(initialScore) : null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!score) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment })
      })
      
      if (res.ok) {
        setSubmitted(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias!</h2>
          <p className="text-gray-600 mb-6">Tu feedback nos ayuda a mejorar MyCompi cada día.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-white font-semibold rounded-full"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¿Cómo vamos?</h1>
          <p className="text-gray-600">Tu opinión importa. Califica tu experiencia con MyCompi.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Score Buttons */}
          <div className="flex justify-center gap-4 mb-8">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setScore(s)}
                className={`w-14 h-14 rounded-full text-xl font-bold transition-all ${
                  score === s
                    ? s >= 4 
                      ? 'bg-green-500 text-white shadow-lg scale-110' 
                      : s === 3 
                        ? 'bg-yellow-500 text-white shadow-lg scale-110'
                        : 'bg-red-500 text-white shadow-lg scale-110'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Labels */}
          <div className="flex justify-between text-xs text-gray-400 mb-6 px-2">
            <span>Malo</span>
            <span>Ok</span>
            <span>Excelente</span>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentarios (opcional)
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Cuéntanos qué podemos mejorar..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!score || loading}
            className="w-full py-3 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors"
          >
            {loading ? 'Enviando...' : 'Enviar Feedback'}
          </button>
        </form>

        {/* Score Meanings */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500 text-center">
            <strong>1-2:</strong> Necesita mejorar • <strong>3:</strong> Ok • <strong>4-5:</strong> Excelente
          </p>
        </div>
      </div>
    </div>
  )
}