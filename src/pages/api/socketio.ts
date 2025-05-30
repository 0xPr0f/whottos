import { Server as SocketIOServer } from 'socket.io'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Socket } from 'socket.io'

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
  if ((res.socket as any).server.io) {
    console.log('Socket.io already running')
    res.end()
    return
  }

  console.log('Setting up Socket.io server')

  const io = new SocketIOServer((res.socket as any).server, {
    path: '/api/socketio',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  ;(res.socket as any).server.io = io

  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id)

    socket.on(
      'join-room',
      ({ roomId, playerName }: { roomId: string; playerName: string }) => {
        console.log(`${playerName} joining room ${roomId}`)

        if (!rooms[roomId]) {
          rooms[roomId] = { players: [] }
        }

        const player = {
          id: socket.id,
          name: playerName || `Player ${rooms[roomId].players.length + 1}`,
          score: 0,
        }

        rooms[roomId].players.push(player)

        socket.join(roomId)

        io.to(roomId).emit('room-update', {
          roomId,
          players: rooms[roomId].players,
        })
      }
    )

    socket.on('click-button', ({ roomId }: { roomId: string }) => {
      if (!rooms[roomId]) return
      console.log('button clicked')

      const playerIndex = rooms[roomId].players.findIndex(
        (p) => p.id === socket.id
      )

      if (playerIndex !== -1) {
        rooms[roomId].players[playerIndex].score += 1

        io.to(roomId).emit('score-update', {
          playerId: socket.id,
          players: rooms[roomId].players,
        })
      }
    })

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)

      Object.keys(rooms).forEach((roomId) => {
        const playerIndex = rooms[roomId].players.findIndex(
          (p) => p.id === socket.id
        )

        if (playerIndex !== -1) {
          const player = rooms[roomId].players[playerIndex]
          rooms[roomId].players.splice(playerIndex, 1)

          io.to(roomId).emit('player-left', {
            playerId: socket.id,
            playerName: player.name,
            players: rooms[roomId].players,
          })

          if (rooms[roomId].players.length === 0) {
            delete rooms[roomId]
          }
        }
      })
    })
  })

  res.end()
}
