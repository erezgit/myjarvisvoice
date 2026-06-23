import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { supabase } from '../../atomic-crm/providers/supabase/supabase'

interface TerminalComponentProps {
  className?: string
}

const MAX_RETRIES = 8
const RETRY_INTERVAL = 3000

export function TerminalComponent({ className = '' }: TerminalComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const retryCountRef = useRef(0)
  const intentionalCloseRef = useRef(false)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  // Build WebSocket URL pointing to the MEMBER's Fly machine (not the OS machine)
  const getTerminalWsUrl = async (): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token || !session.user) {
        console.error('[Terminal] No Supabase session')
        return ''
      }

      // Look up the member's own Fly machine URL from member_instances
      const { data: member, error } = await supabase
        .from('member_instances')
        .select('fly_app_url')
        .eq('user_id', session.user.id)
        .single()

      if (error || !member?.fly_app_url) {
        console.error('[Terminal] Could not find member machine:', error?.message)
        return ''
      }

      const wsUrl = `wss://${member.fly_app_url}/terminal`
      console.log('[Terminal] Connecting to member machine:', wsUrl)
      return `${wsUrl}?token=${encodeURIComponent(session.access_token)}`
    } catch (error) {
      console.error('[Terminal] Failed to build WebSocket URL:', error)
      return ''
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    let resizeHandler: (() => void) | null = null
    intentionalCloseRef.current = false
    retryCountRef.current = 0

    const initTerminal = async () => {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#cccccc',
          cursor: '#ffffff',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5'
        }
      })

      const fitAddon = new FitAddon()
      const webLinksAddon = new WebLinksAddon()

      term.loadAddon(fitAddon)
      term.loadAddon(webLinksAddon)
      term.open(containerRef.current!)
      fitAddon.fit()

      terminalRef.current = term
      fitAddonRef.current = fitAddon

      const connectWs = async () => {
        const wsUrl = await getTerminalWsUrl()
        if (!wsUrl) {
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++
            setStatus('connecting')
            term.writeln(`\r\n\u23f3 Connecting... (${retryCountRef.current}/${MAX_RETRIES})`)
            setTimeout(connectWs, RETRY_INTERVAL)
          } else {
            setStatus('disconnected')
          }
          return
        }

        setStatus('connecting')

        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          retryCountRef.current = 0
          setStatus('connected')
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            switch (msg.type) {
              case 'connected':
                break
              case 'data':
                term.write(msg.data)
                break
              case 'exit':
                term.write('\r\n[Process completed]\r\n')
                break
              case 'error':
                console.error('[Terminal] Error:', msg.message)
                term.writeln('\r\n\u26a0\ufe0f  ' + msg.message)
                break
            }
          } catch (error) {
            console.error('[Terminal] Error parsing message:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('[Terminal] WebSocket error:', error)
        }

        ws.onclose = () => {
          if (intentionalCloseRef.current) return

          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++
            setStatus('connecting')
            term.writeln(`\r\n\u23f3 Reconnecting... (${retryCountRef.current}/${MAX_RETRIES})`)
            setTimeout(connectWs, RETRY_INTERVAL)
          } else {
            setStatus('disconnected')
            term.writeln('\r\n\u274c Disconnected \u2014 could not reconnect')
          }
        }

        term.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'data', data }))
          }
        })

        resizeHandler = () => {
          if (fitAddonRef.current && terminalRef.current) {
            try {
              fitAddonRef.current.fit()
              if (ws.readyState === WebSocket.OPEN && terminalRef.current.cols && terminalRef.current.rows) {
                ws.send(JSON.stringify({
                  type: 'resize',
                  cols: terminalRef.current.cols,
                  rows: terminalRef.current.rows
                }))
              }
            } catch {
              // Resize error — ignored
            }
          }
        }
        window.addEventListener('resize', resizeHandler)
      }

      connectWs()
    }

    initTerminal()

    return () => {
      intentionalCloseRef.current = true
      if (resizeHandler) window.removeEventListener('resize', resizeHandler)
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
      terminalRef.current?.dispose()
    }
  }, [])

  return (
    <div className="relative h-full w-full">
      {status !== 'connected' && (
        <div className="absolute top-2 right-2 z-10 px-3 py-1 bg-gray-800 text-white text-sm rounded">
          {status === 'connecting' ? '\u23f3 Connecting...' : '\u274c Disconnected'}
        </div>
      )}
      <div
        ref={containerRef}
        className={`h-full w-full ${className}`}
        style={{ backgroundColor: '#1e1e1e' }}
      />
    </div>
  )
}
