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
    <div className="min-h-full bg-background text-foreground px-4 py-10 flex items-start justify-center">
      <Head>
        <title>Whot Puzzles</title>
      </Head>

      <div className="w-full max-w-lg rounded-2xl bg-card/90 shadow-xl border border-border p-6">
        <h1 className="text-2xl sm:text-3xl font-black mb-6 text-center">
          Whot Puzzles
        </h1>

        <div className="mb-5">
          <label className="block mb-2 text-sm font-semibold">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
            placeholder="Enter your name"
          />
        </div>

        <div className="mb-8">
          <button
            onClick={handleCreateRoom}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create New Game
          </button>
        </div>

        <div className="border-t border-border/60 pt-6">
          <h2 className="text-lg font-bold mb-4">Join Existing Game</h2>
          <form onSubmit={handleJoinRoom}>
            <input
              type="text"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              placeholder="Enter room ID"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40 mb-4"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground transition-colors hover:bg-accent/80"
            >
              Join Game
            </button>
          </form>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
