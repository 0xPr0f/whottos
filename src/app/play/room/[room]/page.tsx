'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSocket, joinRoom, clickButton } from '@/lib/socket'

interface Player {
  id: string
  name: string
  score: number
}

export default function GameRoom() {
  const params = useParams() ?? { room: '' }
  const roomId = params.room as string
  const { socket, isConnected } = useSocket()
  const [players, setPlayers] = useState<Player[]>([])
  const [playerName, setPlayerName] = useState('')
  const [joined, setJoined] = useState(false)
  const [copied, setCopied] = useState(false)

  // Get player name from localStorage or set a default
  useEffect(() => {
    const storedName = localStorage.getItem('playerName')
    if (storedName) {
      setPlayerName(storedName)
    }
  }, [])

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return

    const handleRoomUpdate = (data: { players: Player[] }) => {
      console.log('Room update received:', data)
      setPlayers(data.players)
    }

    const handleScoreUpdate = (data: { players: Player[] }) => {
      console.log('Score update received:', data)
      setPlayers(data.players)
    }

    const handlePlayerLeft = (data: { players: Player[] }) => {
      console.log('Player left:', data)
      setPlayers(data.players)
    }

    socket.on('room-update', handleRoomUpdate)
    socket.on('score-update', handleScoreUpdate)
    socket.on('player-left', handlePlayerLeft)

    return () => {
      socket.off('room-update', handleRoomUpdate)
      socket.off('score-update', handleScoreUpdate)
      socket.off('player-left', handlePlayerLeft)
    }
  }, [socket])

  // Join room when connected
  useEffect(() => {
    if (isConnected && roomId && playerName && !joined && socket) {
      console.log(`Joining room ${roomId} as ${playerName}`)
      joinRoom(roomId, playerName)
      setJoined(true)
    }
  }, [isConnected, roomId, playerName, joined, socket])

  // Handle button click
  const handleClick = () => {
    if (roomId) {
      console.log('Clicking button in room:', roomId)
      clickButton(roomId)
    }
  }

  // Copy room link
  const copyRoomLink = () => {
    const link = `${window.location.origin}/play/room/${roomId}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // If no roomId yet
  if (!roomId) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <title>Click Battle - Room {roomId}</title>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-2 text-center">Click Battle</h1>

        <div className="mb-4 flex items-center justify-between bg-gray-100 p-2 rounded">
          <div className="text-sm truncate">Room: {roomId}</div>
          <button
            onClick={copyRoomLink}
            className={`px-2 py-1 text-xs rounded ${
              copied ? 'bg-green-500' : 'bg-blue-600'
            } text-white`}
          >
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center">Players</h2>
          <div className="bg-gray-100 rounded-lg p-4">
            {players.length === 0 ? (
              <p className="text-center text-gray-500">
                Waiting for players...
              </p>
            ) : (
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center"
                  >
                    <span className="font-medium">
                      {player.name}
                      {player.id === socket?.id ? ' (You)' : ''}
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">
                      {player.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleClick}
            className="bg-red-600 hover:bg-red-700 text-white text-2xl font-bold py-6 px-8 rounded-full shadow-lg transform transition hover:scale-105"
          >
            CLICK ME!
          </button>
        </div>
      </div>
    </div>
  )
}
