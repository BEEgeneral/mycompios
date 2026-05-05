'use client'

import { useMemo } from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Simple markdown parser (no external dependencies)
export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return ''
    
    let text = content
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Code blocks (```code```)
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="bg-gray-900 rounded-lg p-3 my-2 overflow-x-auto text-sm"><code class="text-gray-100">${code.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
    })
    
    // Inline code (`code`)
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-800 text-amber-400 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    
    // Bold (**text**)
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    
    // Italic (*text*)
    text = text.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
    
    // Task completion: TAREA:xxx COMPLETADA
    text = text.replace(/TAREA:([a-f0-9-]+) COMPLETADA/g, '<span class="inline-flex items-center gap-1 bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full text-xs font-medium my-1">✓ Tarea completada</span>')
    
    // New task: NUEVA TAREA:xxx
    text = text.replace(/NUEVA TAREA:([^\n]+)/g, '<span class="inline-flex items-center gap-1 bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded-full text-xs font-medium my-1">+ Nueva tarea: $1</span>')
    
    // Headers
    text = text.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    text = text.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-3 mb-1">$1</h2>')
    text = text.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-2">$1</h1>')
    
    // Lists
    text = text.replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc list-inside">$1</li>')
    text = text.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal list-inside">$2</li>')
    
    // Line breaks (double newline = paragraph)
    text = text.replace(/\n\n/g, '</p><p class="my-2">')
    text = text.replace(/\n/g, '<br/>')
    
    // Wrap in paragraph
    text = `<p>${text}</p>`
    
    // Clean up empty paragraphs
    text = text.replace(/<p><\/p>/g, '')
    text = text.replace(/<p>(<pre)/g, '$1')
    text = text.replace(/(<\/pre>)<\/p>/g, '$1')
    
    return text
  }, [content])

  return (
    <div 
      className={`text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
