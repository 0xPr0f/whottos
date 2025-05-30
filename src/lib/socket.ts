import { useCallback, useEffect, useRef, useState } from 'react'
import { localWranglerHost, toWebSocketURL } from './utils'

export function useWebSocket(roomId: string, playerId: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setConnected] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const reconnectRef = useRef(0)
  const maxRetries = 5

  useEffect(() => {
    let retryTimeout: any

    const connect = () => {
      const host = process.env.NEXT_PUBLIC_WHOT_AGENT_HOST || localWranglerHost
      const wsUrl =
        toWebSocketURL(`${host}/room/${roomId}`) + `?playerId=${playerId}`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setConnected(true)
        reconnectRef.current = 0
        wsRef.current = ws
      }
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          setMessages((m) => [...m, data])
        } catch {}
      }
      ws.onclose = () => {
        setConnected(false)
        wsRef.current = null
        if (reconnectRef.current < maxRetries) {
          retryTimeout = setTimeout(() => {
            reconnectRef.current += 1
            connect()
          }, 1000)
        }
      }
      ws.onerror = () => {
        ws.close()
      }
    }

    connect()
    return () => {
      clearTimeout(retryTimeout)
      wsRef.current?.close()
      setMessages([])
    }
  }, [roomId])

  const send = useCallback((msg: any) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
  }, [])

  return { isConnected, messages, send }
}

export const joinRoom = (
  roomId: string,
  playerName: string,
  playerId: string,
  send: (m: any) => void
) => {
  send({ type: 'join-room', roomId, playerName, playerId })
}

export const clickButton = (
  roomId: string,
  playerId: string,
  send: (m: any) => void
) => {
  send({ type: 'click-button', roomId, playerId })
}
