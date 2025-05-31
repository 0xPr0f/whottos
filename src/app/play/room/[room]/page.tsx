'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useWebSocket, joinRoom, clickButton } from '@/lib/socket'

interface Player {
  id: string
  name: string
  score: number
  connected: boolean
}

export default function GameRoom() {
  const { room } = useParams() ?? { room: '' }
  const roomId = room as string

  const [players, setPlayers] = useState<Player[]>([])
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('playerName') || 'John'
  })
  const [playerId] = useState(() => {
    const stored = localStorage.getItem('playerId')
    if (stored) return stored
    const newId = `player-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem('playerId', newId)
    return newId
  })
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isConnected, messages, send } = useWebSocket(
    roomId,
    playerId,
    playerName
  )
  const lastProcessedIndex = useRef(-1)

  useEffect(() => {
    localStorage.setItem('playerName', playerName)
  }, [playerName])

  useEffect(() => {
    const newMessages = messages.slice(lastProcessedIndex.current + 1)
    newMessages.forEach((data) => {
      switch (data.type) {
        case 'room-update':
        case 'score-update':
        case 'player-left':
          setPlayers(data.players || [])
          setError(null)
          break
        case 'pong':
          break
        default:
          console.warn('Unknown message:', data)
      }
    })
    lastProcessedIndex.current = messages.length - 1
  }, [messages])

  useEffect(() => {
    if (isConnected && roomId && playerName) {
      console.log(`Joining room ${roomId} as ${playerName}`)
      joinRoom(roomId, playerName, playerId, send)
    }
  }, [isConnected, roomId, playerName, playerId, send])

  const handleClick = () => {
    if (roomId && isConnected) {
      clickButton(roomId, playerId, send)
    }
  }

  const copyRoomLink = () => {
    const link = `${window.location.origin}/play/room/${roomId}`
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => {
        console.error('Failed to copy link:', err)
        setError('Failed to copy link')
      })
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerName(e.target.value)
  }

  if (!roomId) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <title>Click Battle – Room {roomId}</title>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-2 text-center">Click Battle</h1>
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
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
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={handleNameChange}
            className="w-full p-2 border rounded"
            placeholder="Enter your name"
          />
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center">Players</h2>
          <div className="bg-gray-100 rounded-lg p-4">
            {players.length === 0 ? (
              <p className="text-center text-gray-500">
                {isConnected ? 'Waiting for players…' : 'Connecting…'}
              </p>
            ) : (
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center"
                  >
                    <span
                      className={`font-medium ${
                        !player.connected ? 'text-gray-400' : ''
                      }`}
                    >
                      {player.name}
                      {player.id === playerId ? ' (You)' : ''}
                      {!player.connected && ' (Offline)'}
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
            disabled={!isConnected}
            className={`text-2xl font-bold py-6 px-8 rounded-full shadow-lg transform transition hover:scale-105 ${
              isConnected
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            CLICK ME!
          </button>
        </div>
      </div>
    </div>
  )
}
