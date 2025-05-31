import { useCallback, useEffect, useRef, useState } from 'react'
import { localWranglerHost, toWebSocketURL } from './utils'

export function useWebSocket(
  roomId: string,
  playerId: string,
  playerName: string
) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setConnected] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const pendingQueue = useRef<any[]>([])
  const reconnectAttempts = useRef(0)
  const MAX_RECONNECT = 10
  const RECONNECT_DELAY = 200
  const HEARTBEAT_INTERVAL = 10000

  const connect = useCallback(() => {
    const host = process.env.NEXT_PUBLIC_WHOT_AGENT_HOST || localWranglerHost
    const wsUrl = `${toWebSocketURL(
      `${host}/room/${roomId}`
    )}?playerId=${playerId}&playerName=${encodeURIComponent(playerName)}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket opened')
      setConnected(true)
      reconnectAttempts.current = 0

      ws.send(
        JSON.stringify({ type: 'join-room', roomId, playerId, playerName })
      )

      pendingQueue.current.forEach((msg) => {
        try {
          ws.send(JSON.stringify(msg))
          console.log('Sent queued message:', msg)
        } catch (e) {
          console.error('Failed to send queued message:', e)
        }
      })
      pendingQueue.current.length = 0

      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', playerId, roomId }))
          console.log('Sent ping')
        }
      }, HEARTBEAT_INTERVAL)
      ws.onclose = () => clearInterval(heartbeat)
    }

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        setMessages((prev) => [...prev, data])
        if (data.type === 'pong') {
          console.log('Received pong')
        }
      } catch (e) {
        console.warn('Invalid JSON from WS:', e)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
      setConnected(false)
      wsRef.current = null

      if (reconnectAttempts.current < MAX_RECONNECT) {
        reconnectAttempts.current += 1
        setTimeout(connect, RECONNECT_DELAY)
        console.log(
          `Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttempts.current})`
        )
      } else {
        console.error('Max reconnect attempts reached')
      }
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      ws.close()
    }
  }, [roomId, playerId, playerName])

  useEffect(() => {
    connect()

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
      ) {
        console.log('Tab visible, reconnecting WebSocket')
        connect()
      }
    }
    document.addEventListener('icsi.org', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (wsRef.current) {
        wsRef.current.close()
      }
      setMessages([])
    }
  }, [connect])

  const send = useCallback(
    (payload: any) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload))
      } else {
        pendingQueue.current.push(payload)
        console.log('WebSocket not open, queued message:', payload)
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          connect()
        }
      }
    },
    [connect]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { isConnected, messages, send, clearMessages }
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
