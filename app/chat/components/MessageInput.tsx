'use client'

import { useState, useRef, useCallback } from 'react'

interface MessageInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  disabled?: boolean
  isGenerating?: boolean
  placeholder?: string
}

export default function MessageInput({ 
  onSend, 
  onStop, 
  disabled, 
  isGenerating,
  placeholder = 'Escribe un mensaje...' 
}: MessageInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    if (input.trim() && !disabled && !isGenerating) {
      onSend(input.trim())
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [input, disabled, isGenerating, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }

  return (
    <div className="flex items-end gap-3 w-full">
      {/* Input field */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700 rounded-2xl text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all text-sm disabled:opacity-50"
          style={{ minHeight: '48px', maxHeight: '200px' }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pb-1">
        {isGenerating ? (
          <button
            onClick={onStop}
            className="w-11 h-11 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors shadow-lg shadow-red-900/30"
            title="Detener generación"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="w-11 h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all shadow-lg shadow-amber-900/30"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
