import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useSettings } from '../../atomic-crm/chat/hooks/useSettings'
import { TerminalComponent } from './TerminalComponent'

export function TerminalOverlay() {
  const { isTerminalOpen, toggleTerminal } = useSettings()

  // Handle ESC key to close terminal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isTerminalOpen) {
        toggleTerminal?.()
      }
    }

    if (isTerminalOpen) {
      document.addEventListener('keydown', handleEscKey)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
      document.body.style.overflow = 'unset'
    }
  }, [isTerminalOpen, toggleTerminal])

  // Handle Ctrl+` shortcut to toggle terminal
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === '`') {
        event.preventDefault()
        toggleTerminal?.()
      }
    }

    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [toggleTerminal])

  if (!isTerminalOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm">
      {/* Header with close button */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-white">Terminal</div>
          <div className="text-sm text-slate-400">Press ESC or Ctrl+` to close</div>
        </div>
        <button
          onClick={toggleTerminal}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close terminal"
        >
          <X className="w-6 h-6 text-slate-400 hover:text-white" />
        </button>
      </div>

      {/* Terminal component - full height minus header */}
      <div className="pt-16 h-full">
        <TerminalComponent />
      </div>
    </div>
  )
}
