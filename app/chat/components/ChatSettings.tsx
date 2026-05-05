'use client'

import { useState } from 'react'

interface ChatSettingsProps {
  open: boolean
  onClose: () => void
}

export default function ChatSettings({ open, onClose }: ChatSettingsProps) {
  const [activeTab, setActiveTab] = useState('general')

  if (!open) return null

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'interface', label: 'Interfaz' },
    { id: 'agents', label: 'Agentes' },
    { id: 'data', label: 'Datos' }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in slide-in-from-bottom-1">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-gray-100">Configuración</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-amber-400 border-amber-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 130px)' }}>
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Preferencias de chat</h3>
                
                <label className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-400">Enviar con Enter</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-amber-500/50"
                  />
                </label>
                
                <label className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-400">Tema oscuro</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    disabled
                    className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-amber-500/50"
                  />
                </label>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Notificaciones</h3>
                
                <label className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-400">Sonido de respuesta</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-amber-500/50"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'interface' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Tamaño de texto</h3>
                <input
                  type="range"
                  min="80"
                  max="120"
                  defaultValue="100"
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Pequeño</span>
                  <span>Normal</span>
                  <span>Grande</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Configura el comportamiento de cada agente.
              </p>
              {['paco', 'lucia', 'carlos'].map(agentId => (
                <div key={agentId} className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm">
                      {agentId === 'paco' ? '🎯' : agentId === 'lucia' ? '💼' : '💰'}
                    </div>
                    <span className="font-medium text-gray-200 capitalize">{agentId}</span>
                  </div>
                  <label className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-400">Respuestas detalladas</span>
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-amber-500/50"
                    />
                  </label>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Historial de chat</h3>
                <button className="w-full px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 rounded-xl text-sm text-red-400 transition-colors">
                  Borrar todo el historial
                </button>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Exportar datos</h3>
                <button className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition-colors">
                  Exportar conversaciones
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
