import { Suspense } from 'react'
import FeedbackContent from './FeedbackContent'

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>}>
      <FeedbackContent />
    </Suspense>
  )
}