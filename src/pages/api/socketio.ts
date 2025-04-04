import { Server as SocketIOServer } from 'socket.io'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Socket } from 'socket.io'

// Simple in-memory storage for rooms
const rooms: {
  [roomId: string]: {
    players: {
      id: string
      name: string
      score: number
    }[]
  }
} = {}

export default function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if Socket.io is already running
  if ((res.socket as any).server.io) {
    console.log('Socket.io already running')
    res.end()
    return
  }

  console.log('Setting up Socket.io server')

  // Initialize Socket.io
  const io = new SocketIOServer((res.socket as any).server, {
    path: '/api/socketio',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  // Store io instance
  ;(res.socket as any).server.io = io

  // Handle connections
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id)

    // Join room
    socket.on(
      'join-room',
      ({ roomId, playerName }: { roomId: string; playerName: string }) => {
        console.log(`${playerName} joining room ${roomId}`)

        // Initialize room if it doesn't exist
        if (!rooms[roomId]) {
          rooms[roomId] = { players: [] }
        }

        // Add player to room
        const player = {
          id: socket.id,
          name: playerName || `Player ${rooms[roomId].players.length + 1}`,
          score: 0,
        }

        rooms[roomId].players.push(player)

        // Join the socket.io room
        socket.join(roomId)

        // Broadcast updated player list
        io.to(roomId).emit('room-update', {
          roomId,
          players: rooms[roomId].players,
        })
      }
    )

    // Handle button click
    socket.on('click-button', ({ roomId }: { roomId: string }) => {
      if (!rooms[roomId]) return
      console.log('button clicked')
      // Find player and increment score
      const playerIndex = rooms[roomId].players.findIndex(
        (p) => p.id === socket.id
      )

      if (playerIndex !== -1) {
        rooms[roomId].players[playerIndex].score += 1

        // Broadcast updated scores
        io.to(roomId).emit('score-update', {
          playerId: socket.id,
          players: rooms[roomId].players,
        })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)

      // Remove player from all rooms they were in
      Object.keys(rooms).forEach((roomId) => {
        const playerIndex = rooms[roomId].players.findIndex(
          (p) => p.id === socket.id
        )

        if (playerIndex !== -1) {
          // Remove player
          const player = rooms[roomId].players[playerIndex]
          rooms[roomId].players.splice(playerIndex, 1)

          // Notify remaining players
          io.to(roomId).emit('player-left', {
            playerId: socket.id,
            playerName: player.name,
            players: rooms[roomId].players,
          })

          // Clean up empty rooms
          if (rooms[roomId].players.length === 0) {
            delete rooms[roomId]
          }
        }
      })
    })
  })

  res.end()
}
