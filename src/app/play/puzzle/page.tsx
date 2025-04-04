'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Head from 'next/head'

export default function Home() {
  const [roomIdInput, setRoomIdInput] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Create new room
  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name')
      return
    }

    try {
      const response = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error('Failed to create room')

      const { roomId } = (await response.json()) as any
      localStorage.setItem('playerName', playerName)
      router.push(`/play/room/${roomId}`)
    } catch (error) {
      setError('Failed to create room. Please try again.')
    }
  }

  // Join existing room
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault()

    if (!playerName.trim()) {
      setError('Please enter your name')
      return
    }

    if (!roomIdInput.trim()) {
      setError('Please enter a room ID')
      return
    }

    localStorage.setItem('playerName', playerName)
    router.push(`/play/room/${roomIdInput}`)
  }

  return (
    <div className="container mx-auto p-4 max-w-md mt-20">
      <Head>
        <title>Click Battle - Multiplayer Game</title>
      </Head>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Click Battle</h1>

        <div className="mb-4">
          <label className="block mb-2">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter your name"
          />
        </div>

        <div className="mb-6">
          <button
            onClick={handleCreateRoom}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create New Game
          </button>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Join Existing Game</h2>
          <form onSubmit={handleJoinRoom}>
            <input
              type="text"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              placeholder="Enter room ID"
              className="w-full p-2 mb-4 border rounded"
            />
            <button
              type="submit"
              className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Join Game
            </button>
          </form>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
