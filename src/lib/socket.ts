import { io, Socket } from 'socket.io-client'
import { useEffect, useState } from 'react'

let socket: Socket | null = null

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!socket) {
      // Initialize socket connection
      socket = io(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin, {
        path: '/api/socketio',
      })
    }

    socket.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })
    socket.on('join-room', () => {
      console.log('Joined game')
    })

    return () => {
      if (socket) {
        socket.off('connect')
        socket.off('disconnect')
      }
    }
  }, [])

  return { socket, isConnected }
}

// Join a room
export const joinRoom = (roomId: string, playerName: string) => {
  if (!socket) return
  socket.emit('join-room', { roomId, playerName })
}

// Click button
export const clickButton = (roomId: string) => {
  if (!socket) return
  socket.emit('click-button', { roomId })
  console.log('button clicked', roomId)
}
