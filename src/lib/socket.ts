import { useCallback, useEffect, useRef, useState } from 'react'
import { localWranglerHost, toWebSocketURL } from './utils'

type WebSocketMessage = Record<string, unknown>
type OutboundMessage = Record<string, unknown>

interface ConnectionOptions {
  mode?: 'ranked' | 'casual'
  matchId?: string | null
}

export function useWebSocket(
  roomId: string,
  playerId: string,
  playerName: string,
  options?: ConnectionOptions
) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setConnected] = useState(false)
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const pendingQueue = useRef<OutboundMessage[]>([]) // Queue for messages before connection
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef<number | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)
  const heartbeatTimeoutRef = useRef<number | null>(null)
  const closingRef = useRef(false)
  const MAX_RECONNECT = 10
  const BASE_RECONNECT_DELAY = 400
  const HEARTBEAT_INTERVAL = 10000
  const HEARTBEAT_TIMEOUT = 15000

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current !== null) {
      window.clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    if (heartbeatTimeoutRef.current !== null) {
      window.clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
  }, [])

  const acknowledgeHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current !== null) {
      window.clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
  }, [])

  const startHeartbeat = useCallback(
    (socket: WebSocket) => {
      clearHeartbeat()
      heartbeatIntervalRef.current = window.setInterval(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          return
        }
        try {
          socket.send(JSON.stringify({ type: 'ping', playerId, roomId }))
        } catch (error) {
          console.error('Failed to send heartbeat ping:', error)
          return
        }

        if (heartbeatTimeoutRef.current !== null) {
          window.clearTimeout(heartbeatTimeoutRef.current)
        }
        heartbeatTimeoutRef.current = window.setTimeout(() => {
          console.warn('Heartbeat timeout detected, closing socket to trigger reconnect')
          socket.close()
        }, HEARTBEAT_TIMEOUT)
      }, HEARTBEAT_INTERVAL)
    },
    [playerId, roomId, clearHeartbeat]
  )

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimer.current !== null) {
      window.clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (closingRef.current) {
      return
    }
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    const host = process.env.NEXT_PUBLIC_WHOT_AGENT_HOST || localWranglerHost
    const wsUrl = `${toWebSocketURL(
      `${host}/room/${roomId}`
    )}?playerId=${playerId}&playerName=${encodeURIComponent(playerName)}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    closingRef.current = false

    ws.onopen = () => {
      console.log('WebSocket opened')
      setConnected(true)
      reconnectAttempts.current = 0
      clearReconnectTimer()
      startHeartbeat(ws)
      ws.send(
        JSON.stringify({
          type: 'join-room',
          roomId,
          playerId,
          playerName,
          mode: options?.mode,
          matchId: options?.matchId,
        })
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
    }

    ws.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data)
        if (parsed && typeof parsed === 'object') {
          const data = parsed as WebSocketMessage
          setMessages((prev) => [...prev, data])
          acknowledgeHeartbeat()
          if ((data as { type?: unknown }).type === 'pong') {
            console.log('Received pong')
          }
        } else {
          console.warn('Received non-object message from WS:', parsed)
        }
      } catch (e) {
        console.warn('Invalid JSON from WS:', e)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
      setConnected(false)
      wsRef.current = null
      clearHeartbeat()
      acknowledgeHeartbeat()

      if (!closingRef.current && reconnectAttempts.current < MAX_RECONNECT) {
        const delay = Math.min(
          BASE_RECONNECT_DELAY * 2 ** reconnectAttempts.current,
          8000
        )
        reconnectAttempts.current += 1
        clearReconnectTimer()
        reconnectTimer.current = window.setTimeout(() => {
          reconnectTimer.current = null
          connect()
        }, delay)
        console.log(
          `Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`
        )
      } else if (reconnectAttempts.current >= MAX_RECONNECT) {
        console.error('Max reconnect attempts reached')
      }
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      ws.close()
    }
  }, [
    BASE_RECONNECT_DELAY,
    MAX_RECONNECT,
    acknowledgeHeartbeat,
    clearHeartbeat,
    clearReconnectTimer,
    options?.matchId,
    options?.mode,
    playerId,
    playerName,
    roomId,
    startHeartbeat,
  ])

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
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      closingRef.current = true
      if (wsRef.current) {
        wsRef.current.close()
      }
      clearHeartbeat()
      clearReconnectTimer()
      setMessages([])
    }
  }, [clearHeartbeat, clearReconnectTimer, connect])

  const send = useCallback(
    (payload: OutboundMessage) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload))
      } else {
        pendingQueue.current.push(payload)
        console.log('WebSocket not open, queued message:', payload)

        if (
          !wsRef.current ||
          wsRef.current.readyState === WebSocket.CLOSED ||
          wsRef.current.readyState === WebSocket.CLOSING
        ) {
          connect()
        }
      }
    },
    [connect]
  )

  return { isConnected, messages, send }
}

interface JoinContext {
  mode?: 'ranked' | 'casual'
  matchId?: string | null
}

export const joinRoom = (
  roomId: string,
  playerName: string,
  playerId: string,
  send: (message: OutboundMessage) => void,
  context?: JoinContext
) => {
  send({
    type: 'join-room',
    roomId,
    playerName,
    playerId,
    mode: context?.mode,
    matchId: context?.matchId,
  })
}

export const clickButton = (
  roomId: string,
  playerId: string,
  send: (message: OutboundMessage) => void
) => {
  send({ type: 'click-button', roomId, playerId })
}
