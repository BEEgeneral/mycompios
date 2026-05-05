'use client'

import { useState, useRef, useEffect } from 'react'
import { AGENTS, Agent } from './types'

interface AgentSelectorProps {
  selectedAgentId: string
  onSelect: (agentId: string) => void
}

export default function AgentSelector({ selectedAgentId, onSelect }: AgentSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selectedAgent = AGENTS[selectedAgentId] || AGENTS.paco

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 border border-gray-700 hover:border-gray-600 rounded-xl transition-all text-sm"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs">
          {selectedAgent.emoji}
        </div>
        <span className="text-gray-200 font-medium">{selectedAgent.name}</span>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 px-2 py-1 uppercase tracking-wide">
              Seleccionar Agente
            </div>
            {Object.values(AGENTS).map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  onSelect(agent.id)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                  agent.id === selectedAgentId
                    ? 'bg-amber-500/20 border border-amber-500/30'
                    : 'hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm shadow">
                  {agent.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${agent.id === selectedAgentId ? 'text-amber-400' : 'text-gray-200'}`}>
                    {agent.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{agent.role}</div>
                </div>
                {agent.id === selectedAgentId && (
                  <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
