'use client'

import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface CreateRoomResponse {
  roomId: string
}

export default function RoomHome() {
  const [roomIdInput, setRoomIdInput] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRouting, setIsRouting] = useState(false)
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const errorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const player_name = localStorage.getItem('playerName')
    if (player_name) setPlayerName(player_name)
  }, [])

  const symbols = useMemo(
    () =>
      Array.from({ length: 10 }).map(() => ({
        char: ['●', '▲', '✚', '■', '★'][Math.floor(Math.random() * 5)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        rot: Math.random() * 360,
        scale: Math.random() * 0.5 + 0.7,
        dur: Math.random() * 10 + 10,
      })),
    []
  )

  const setAndFocusError = (msg: string) => {
    setError(msg)
    requestAnimationFrame(() => errorRef.current?.focus())
  }

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setAndFocusError('Please enter your name')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Failed to create room')
      const { roomId } = (await response.json()) as CreateRoomResponse
      localStorage.setItem('playerName', playerName)
      setIsRouting(true)
      setTimeout(() => {
        router.push(`/play/room/${roomId}`)
      }, reduceMotion ? 50 : 350)
    } catch {
      setAndFocusError('Failed to create room. Please try again.')
      setIsLoading(false)
      setIsRouting(false)
    }
  }

  const handleJoinRoom = (e: FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) {
      setAndFocusError('Please enter your name')
      return
    }
    if (!roomIdInput.trim()) {
      setAndFocusError('Please enter a room ID')
      return
    }

    let extractedRoomId = roomIdInput.trim()
    try {
      const input = roomIdInput.startsWith('http') ? roomIdInput : `https://${roomIdInput}`
      const url = new URL(input)
      const parts = url.pathname.split('/').filter(Boolean)
      extractedRoomId = parts[parts.length - 1] || extractedRoomId
    } catch {
      /* fall back */
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(extractedRoomId)) {
      setAndFocusError('Invalid room ID format')
      return
    }

    localStorage.setItem('playerName', playerName)
    setIsRouting(true)
    setTimeout(() => {
      router.push(`/play/room/${extractedRoomId}`)
    }, reduceMotion ? 50 : 300)
  }

  const busy = isLoading || isRouting

  return (
    <div
      className="min-h-[100dvh] grid place-items-center p-4 bg-background sm:bg-gradient-to-b sm:from-background sm:to-card"
      aria-busy={busy}
    >
      {/* Centered stack */}
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -30 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
          className="relative overflow-hidden rounded-t-xl bg-primary p-6 shadow-lg text-primary-foreground"
        >
          {!reduceMotion && (
            <div className="pointer-events-none absolute inset-0 opacity-20">
              {symbols.map((s, i) => (
                <motion.div
                  key={i}
                  className="absolute text-white text-3xl select-none"
                  initial={{ x: `${s.x}%`, y: `${s.y}%`, rotate: s.rot, opacity: 0.4, scale: s.scale }}
                  animate={{
                    x: [`${s.x}%`, `${(s.x + 18) % 100}%`],
                    y: [`${s.y}%`, `${(s.y + 22) % 100}%`],
                    opacity: [0.25, 0.55, 0.25],
                    rotate: [s.rot, s.rot + 180],
                  }}
                  transition={{ duration: s.dur, repeat: Infinity, repeatType: 'mirror' }}
                >
                  {s.char}
                </motion.div>
              ))}
            </div>
          )}

          <div className="relative z-10 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">
              Whot! Multiplayer
            </h1>
            <p className="text-sm text-white/85 md:text-base">
              Join the fun or create your own game room!
            </p>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="relative w-full rounded-b-xl bg-white p-5 shadow-2xl sm:p-6"
        >
          {/* confetti on route */}
          <AnimatePresence>
            {isRouting && !reduceMotion && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {Array.from({ length: 18 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    initial={{
                      x: `${Math.random() * 100}%`,
                      y: -20,
                      opacity: 1,
                      scale: Math.random() * 0.5 + 0.6,
                    }}
                    animate={{
                      y: '120%',
                      opacity: 0,
                      rotate: Math.random() * 360,
                    }}
                    transition={{ duration: Math.random() * 1.6 + 1.1 }}
                    style={{
                      width: `${Math.random() * 10 + 6}px`,
                      height: `${Math.random() * 10 + 6}px`,
                      background: ['#FFD700', '#FFA7A6', '#FF9190', '#FFFFFF'][Math.floor(Math.random() * 4)],
                      left: `${Math.random() * 100}%`,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* error */}
          <AnimatePresence>
            {error && (
              <motion.div
                role="alert"
                tabIndex={-1}
                ref={errorRef}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* name */}
          <div className="mb-4">
            <label
              htmlFor="playerName"
              className="mb-2 block text-sm font-semibold text-primary"
            >
              Your Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-primary/20 p-3 text-primary
                         placeholder-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your name"
            />
          </div>

          {/* create */}
          <div className="mb-5">
            <Button
              onClick={handleCreateRoom}
              disabled={busy}
              className="group relative w-full overflow-hidden rounded-lg bg-primary
                         py-4 text-base font-bold text-white shadow-lg transition-all
                         hover:bg-[#3D0000] hover:shadow-xl active:scale-[0.99]
                         disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r
                               from-transparent via-white/20 to-transparent transition-transform duration-700
                               group-hover:translate-x-full" />
              {isLoading ? (
                <span className="inline-flex items-center">
                  <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                    <path d="M4 12a8 8 0 018-8v8H4z" fill="currentColor" opacity="0.85" />
                  </svg>
                  Creating...
                </span>
              ) : isRouting ? (
                'Entering Room...'
              ) : (
                'Create New Game'
              )}
            </Button>
          </div>

          {/* divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="h-px w-full bg-primary/15" />
            <span className="absolute rounded-full bg-white px-2 text-xs text-primary/60">
              or
            </span>
          </div>

          {/* join */}
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <h2 className="mb-2 text-center text-lg font-semibold text-primary">
                Join Existing Game
              </h2>
              <input
                id="roomId"
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                disabled={busy}
                placeholder="Enter room ID or paste link"
                className="w-full rounded-lg border border-primary/20 p-3
                           text-primary placeholder-primary/50
                           focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="group relative w-full overflow-hidden rounded-lg bg-[#FF9190]
                         py-4 text-base font-bold text-white shadow-lg transition-all
                         hover:bg-[#FF7A79] hover:shadow-xl active:scale-[0.99]
                         disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r
                               from-transparent via-white/20 to-transparent transition-transform duration-700
                               group-hover:translate-x-full" />
              {isRouting ? 'Entering Room...' : 'Join Game'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
