'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { XIcon } from 'lucide-react'

export default function RoomHome() {
  const [roomIdInput, setRoomIdInput] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRouting, setIsRouting] = useState(false)
  const router = useRouter()

  const [isSmallScreen, setIsSmallScreen] = useState(false)
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name')
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
      const { roomId } = (await response.json()) as any
      localStorage.setItem('playerName', playerName)
      setIsRouting(true)
      setTimeout(() => {
        router.push(`/play/room/${roomId}`)
      }, 1000)
    } catch (error) {
      setError('Failed to create room. Please try again.')
      setIsLoading(false)
    }
  }

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
    setIsRouting(true)
    setTimeout(() => {
      router.push(`/play/room/${roomIdInput}`)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-[#FFA7A6] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}
        className="bg-[#570000] w-full max-w-md p-6 rounded-t-xl relative overflow-hidden shadow-lg"
      >
        <div className="absolute inset-0 opacity-20">
          {['●', '▲', '✚', '■', '★'].map((symbol, i) => (
            <motion.div
              key={i}
              className="absolute text-white text-4xl"
              initial={{
                x: Math.random() * 100 + '%',
                y: Math.random() * 100 + '%',
                opacity: 0.3,
                rotate: Math.random() * 45 - 22.5,
              }}
              animate={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                opacity: [0.3, 0.7, 0.3],
                rotate: Math.random() * 360,
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: 'reverse',
              }}
            >
              {symbol}
            </motion.div>
          ))}
        </div>
        <div className="relative z-10 text-center">
          <motion.h1
            className="text-3xl md:text-4xl font-bold text-white mb-2"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Whot! Multiplayer
          </motion.h1>
          <motion.p
            className="text-white/80 text-sm md:text-base"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Join the fun or create your own game room!
          </motion.p>
        </div>
      </motion.div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
        className="bg-white rounded-b-xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative overflow-hidden"
      >
        <AnimatePresence>
          {isRouting && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {Array(20)
                .fill(0)
                .map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    initial={{
                      x: Math.random() * 100 - 50 + '%',
                      y: -20,
                      opacity: 1,
                      scale: Math.random() * 0.5 + 0.5,
                    }}
                    animate={{
                      y: '120%',
                      opacity: 0,
                      rotate: Math.random() * 360,
                    }}
                    transition={{
                      duration: Math.random() * 2 + 1,
                      repeat: 0,
                    }}
                    style={{
                      left: `${Math.random() * 100}%`,
                      width: `${Math.random() * 10 + 5}px`,
                      height: `${Math.random() * 10 + 5}px`,
                      background: ['#FFD700', '#FFA7A6', '#FF9190', '#FFFFFF'][
                        Math.floor(Math.random() * 4)
                      ],
                    }}
                  />
                ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-center text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <label className="block mb-2 text-[#570000] font-semibold text-sm md:text-base">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-3 border border-[#570000]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#570000] text-[#570000] placeholder-[#570000]/50"
              placeholder="Enter your name"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <Button
              onClick={handleCreateRoom}
              disabled={isLoading || isRouting}
              className="w-full py-4 bg-[#570000] text-white rounded-lg shadow-lg hover:bg-[#3D0000] hover:shadow-xl hover:scale-105 transition-all duration-300 text-base md:text-lg font-bold relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-500 group-hover:translate-x-full"></span>
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8h-8z"
                    ></path>
                  </svg>
                  Creating...
                </span>
              ) : isRouting ? (
                'Entering Room...'
              ) : (
                'Create New Game'
              )}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="border-t border-[#570000]/20 pt-6"
          >
            <h2 className="text-xl font-semibold mb-4 text-[#570000] text-center">
              Join Existing Game
            </h2>
            <form onSubmit={handleJoinRoom}>
              <motion.input
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="Enter room ID"
                className="w-full p-3 mb-4 border border-[#570000]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#570000] text-[#570000] placeholder-[#570000]/50"
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading || isRouting}
                  className="w-full py-4 bg-[#FF9190] text-white rounded-lg shadow-lg hover:bg-[#FF7A79] hover:shadow-xl hover:scale-105 transition-all duration-300 text-base md:text-lg font-bold relative overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-500 group-hover:translate-x-full"></span>
                  {isRouting ? 'Entering Room...' : 'Join Game'}
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
