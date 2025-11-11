'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket, clickButton } from '@/lib/socket'
import { localWranglerHost } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  MessageCircle,
  Settings,
  Send,
  XIcon,
  Play,
  Network,
  RefreshCw,
  Trophy,
  LayoutGrid,
  ChevronUp,
  Check,
  Copy,
  X,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { WhotCard } from '../../bot/helper'
import { MovesHistorySidebar } from '../../bot/helper'
import { QRCodeCanvas } from 'qrcode.react'
import type {
  Player,
  ChatMessage,
  WhotConfig,
  Card,
  WhotPlayer,
  MoveHistoryItem,
  WhotGameState,
  GameState,
} from '@/types/game'
import type { InboundWebSocketMessage } from '@/types/ws'
import { isChatMessage } from '@/types/ws'

// Types are imported from '@/types/game' and '@/types/ws' to keep TSX clean

export default function GameRoom() {
  const { room } = useParams() ?? { room: '' }
  const roomId = room as string
  const searchParams = useSearchParams()
  const matchMode = searchParams?.get('mode') === 'ranked' ? 'ranked' : 'private'
  const matchId = searchParams?.get('matchId') || undefined

  const [players, setPlayers] = useState<Player[]>([])
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window === 'undefined') {
      return 'Player'
    }
    return window.localStorage.getItem('playerName') || 'Player'
  })
  const [playerId] = useState(() => {
    if (typeof window === 'undefined') {
      return `player-${Math.random().toString(36).slice(2)}`
    }
    const stored = window.localStorage.getItem('playerId')
    if (stored) return stored
    const newId = `player-${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem('playerId', newId)
    return newId
  })
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [whotConfig, setWhotConfig] = useState<WhotConfig>({
    pick2: true,
    pick3: false,
    whotEnabled: true,
  })
  const [gameStarted, setGameStarted] = useState(false)
  const [whotGame, setWhotGame] = useState<WhotGameState | null>(null)
  // const chatContainerRef = useRef<HTMLDivElement>(null)
  const lastProcessedIndex = useRef(-1)
  const hasJoined = useRef(false)

  const [showShapeSelector, setShowShapeSelector] = useState(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(
    null
  )
  const [handExpanded, setHandExpanded] = useState(false)
  const playerHandRef = useRef<HTMLDivElement>(null)
  const [handWidth, setHandWidth] = useState(0)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const [showCardView, setShowCardView] = useState(false)
  const [whotInsightShow, setWhotInsightShow] = useState(true)

  const { isConnected, messages, send } = useWebSocket(
    roomId,
    playerId,
    playerName,
    matchMode === 'ranked' ? { mode: 'ranked', matchId } : undefined
  )

  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const host =
          process.env.NEXT_PUBLIC_WHOT_AGENT_HOST || localWranglerHost
        const url = `${host}/room/${roomId}?playerId=${playerId}&playerName=${encodeURIComponent(
          playerName
        )}`
        const response = await fetch(url, { method: 'GET' })
        if (!response.ok) throw new Error('Failed to fetch game state')
        const state: GameState = await response.json()

        console.log('Fetched game state from Durable Object:', state)

        setPlayers(state.players || [])
        setChatMessages(state.chatMessages || [])
        setWhotConfig(
          state.gameConfig || { pick2: true, pick3: false, whotEnabled: true }
        )
        setGameStarted(state.gameStarted || false)
        setWhotGame(state.whotGame || null)
      } catch (error) {
        console.error('Error fetching game state:', error)
        setError('Failed to fetch game state')
      }
    }

    if (roomId && playerId && playerName) {
      fetchGameState()
    }
  }, [roomId, playerId, playerName])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('playerName', playerName)
    }
  }, [playerName])

  useEffect(() => {
    const newMessages = messages.slice(
      lastProcessedIndex.current + 1
    ) as unknown as InboundWebSocketMessage[]
    newMessages.forEach((data) => {
      switch (data.type) {
        case 'room-update':
        case 'score-update':
        case 'player-left':
          setPlayers(data.players || [])
          setChatMessages((prev) => data.chatMessages ?? prev)
          setWhotConfig((prev) => (data.config ?? prev))
          setGameStarted(Boolean(data.gameStarted))
          setWhotGame(data.whotGame || null)
          setError(null)
          break
        case 'chat-message':
          if (isChatMessage(data)) {
            setChatMessages((prev) => [...prev, data])
          }
          break
        case 'game-config':
          if (data.config) {
            setWhotConfig(data.config)
          }
          break
        case 'start-game':
          setGameStarted(true)
          setWhotGame(data.whotGame || null)
          console.log('Game started with config:', whotConfig)
          break
        case 'whot-game-update':
          setWhotGame(data.whotGame || null)
          break
        default:
          console.warn('Unknown message:', data)
      }
    })
    lastProcessedIndex.current = messages.length - 1
  }, [messages, chatMessages, whotConfig])

  // Join is handled inside useWebSocket on open; avoid duplicate join here

  useEffect(() => {
    const element = playerHandRef.current
    if (!element) return

    const updateSizes = () => {
      if (playerHandRef.current) {
        setHandWidth(playerHandRef.current.offsetWidth)
        setIsSmallScreen(window.innerWidth < 768)
      }
    }

    updateSizes()
    window.addEventListener('resize', updateSizes)
    const resizeObserver = new ResizeObserver(updateSizes)
    resizeObserver.observe(element)

    return () => {
      window.removeEventListener('resize', updateSizes)
      resizeObserver.unobserve(element)
    }
  }, [whotGame])

  const handleTestConnection = useCallback(() => {
    if (roomId && isConnected) {
      clickButton(roomId, playerId, send)
    }
  }, [roomId, isConnected, playerId, send])

  const handleStartGame = useCallback(() => {
    if (
      players[0]?.id === playerId &&
      isConnected &&
      (!gameStarted || whotGame?.gameStatus === 'finished')
    ) {
      send({
        type: 'start-game',
        roomId,
        playerId,
        config: whotConfig,
      })
    }
  }, [
    players,
    playerId,
    isConnected,
    roomId,
    send,
    whotConfig,
    gameStarted,
    whotGame?.gameStatus,
  ])

  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim() || !isConnected) return

    const chatMessage: ChatMessage = {
      playerId,
      playerName,
      message: chatInput,
      timestamp: new Date().toISOString(),
    }
    send({
      type: 'chat-message',
      roomId,
      ...chatMessage,
    })
    setChatInput('')
  }, [chatInput, isConnected, playerId, playerName, roomId, send])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage]
  )
  const gameLink = `${window.location.origin}/play/room/${roomId}`
  const copyRoomLink = useCallback(() => {
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
  }, [roomId])

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPlayerName(e.target.value)
      hasJoined.current = false
    },
    []
  )

  const handleConfigChange = useCallback(
    (key: keyof WhotConfig, value: boolean) => {
      setWhotConfig((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const saveConfig = useCallback(() => {
    if (isConnected) {
      send({
        type: 'game-config',
        roomId,
        playerId,
        config: whotConfig,
      })
    }
    setShowConfig(false)
  }, [isConnected, roomId, playerId, send, whotConfig])

  const playCard = (cardIndex: number) => {
    if (
      !whotGame ||
      whotGame.currentPlayerIndex !==
        whotGame.whotPlayers.findIndex((p) => p.id === playerId)
    )
      return
    const card = whotGame.whotPlayers.find((p) => p.id === playerId)?.hand[
      cardIndex
    ]
    if (!card) return

    if (card.value === 20) {
      setShowShapeSelector(true)
      setSelectedCardIndex(cardIndex)
    } else {
      send({
        type: 'play-card',
        roomId,
        playerId,
        cardIndex,
        whotChosenShape: null,
      })
    }

    if (showCardView) {
      setShowCardView(false)
    }
  }

  const selectShape = (shape: Card['whotChosenShape']) => {
    if (selectedCardIndex !== null) {
      send({
        type: 'play-card',
        roomId,
        playerId,
        cardIndex: selectedCardIndex,
        whotChosenShape: shape,
      })
    }
    setShowShapeSelector(false)
    setSelectedCardIndex(null)
  }

  const drawCard = () => {
    if (
      whotGame &&
      whotGame.currentPlayerIndex ===
        whotGame.whotPlayers.findIndex((p) => p.id === playerId)
    ) {
      send({
        type: 'draw-card',
        roomId,
        playerId,
      })
    }
  }

  const getPlayerCardStyle = (index: number, totalCards: number) => {
    const cardWidth = 70
    const overlapFactor = Math.min(1, 10 / totalCards)
    const mobileAdjust = handWidth < 400 ? 0.5 : handWidth < 600 ? 0.7 : 1
    const cardVisibleWidth = isSmallScreen
      ? cardWidth * 0.6
      : handExpanded
      ? cardWidth * (0.5 + overlapFactor * 0.3)
      : cardWidth * (0.25 + overlapFactor * 0.15)

    const maxFanWidth = Math.min(
      handWidth - cardWidth,
      totalCards * cardVisibleWidth * mobileAdjust
    )

    const baseMaxAngle = isSmallScreen ? 0 : 25
    const cardCountFactor = Math.min(1, 7 / totalCards)
    const maxAngle =
      handWidth < 500 ? baseMaxAngle + 5 : baseMaxAngle * cardCountFactor

    const center = totalCards / 2
    const position = index - center
    const normalizedPosition = position / center
    const rotation = normalizedPosition * maxAngle
    const fanFactor = maxFanWidth / Math.max(totalCards - 1, 1)

    let arcX
    if (isSmallScreen) {
      const cardSpacing = cardVisibleWidth * 1.2
      arcX =
        index * cardSpacing - (totalCards * cardSpacing) / 2 + handWidth / 2
    } else {
      arcX = index * fanFactor - (fanFactor * (totalCards - 1)) / 2
    }

    const arcHeight = isSmallScreen ? 10 : Math.min(25, 30 * cardCountFactor)
    const arcY = Math.abs(normalizedPosition) * arcHeight
    const zIndex = 50 + (position < 0 ? totalCards + index : totalCards - index)

    return {
      rotation,
      x: arcX,
      y: arcY,
      zIndex,
      scale: 1,
    }
  }

  const getCurrentCallCard = () => {
    if (
      !whotGame ||
      !whotGame.callCardPile ||
      whotGame.callCardPile.length === 0
    ) {
      return null
    }
    return whotGame.callCardPile[whotGame.callCardPile.length - 1]
  }

  const closeInsightCallback = useCallback(() => {
    setWhotInsightShow(false)
  }, [])

  const isFirstPlayer = players.length > 0 && players[0].id === playerId
  const isInGame = whotGame?.whotPlayers.some((p) => p.id === playerId)

  const [showQR, setShowQR] = useState(false)
  const [longPress, setLongPress] = useState(false)

  useEffect(() => {
    let timer
    if (longPress) {
      timer = setTimeout(() => {
        setShowQR(true)
      }, 500)
    }
    return () => clearTimeout(timer)
  }, [longPress])

  const handleMouseDown = () => {
    setLongPress(true)
  }

  const handleMouseUp = () => {
    setLongPress(false)
    if (!showQR) {
      copyRoomLink()
    }
  }

  const handleTouchStart = (e) => {
    e.preventDefault()
    setLongPress(true)
  }

  const handleTouchEnd = (e) => {
    e.preventDefault()
    setLongPress(false)
    if (!showQR) {
      copyRoomLink()
    }
  }

  if (!roomId) {
    return <div className="p-8 text-center text-[#570000]">Loading...</div>
  }

  return (
    <div className="h-full bg-[#FFA7A6] flex flex-col overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}
        className="bg-[#570000] w-full p-4 flex justify-between items-center"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">Room {roomId}</h2>
        </div>
        <div className="flex items-center">
          {/*} <Button
            variant="outline"
            size="sm"
            className="border-white hover:text-white text-[#3D0000] bg-white hover:bg-[#570000]"
            onClick={handleStartGame}
            disabled={!isFirstPlayer || gameStarted}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            New Game
          </Button> */}
        </div>
      </motion.div>

      {!isConnected && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#570000] text-lg">Connecting to game server...</p>
        </div>
      )}

      {isConnected && !players.length && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#570000] text-lg">Loading game state...</p>
        </div>
      )}

      {isConnected && !gameStarted && (
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="bg-[#570000] p-6 relative overflow-hidden">
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
                  className="text-3xl font-bold text-white mb-2"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Whot Multiplayer
                </motion.h1>
                {/*} <motion.p
                  className="text-white/80 text-sm"
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Room: {roomId}
                </motion.p> */}
              </div>
            </div>

            <div className="p-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-4 flex items-center justify-between rounded-lg bg-[#FFA7A6]/20 p-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#570000]">
                    Room: {roomId}
                  </span>
                  {matchMode === 'ranked' && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#570000]/70">
                      Ranked online match
                    </span>
                  )}
                </div>
                <Button
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onClick={copyRoomLink}
                  className={`px-3 py-1 text-xs rounded-lg select-none ${
                    copied ? 'bg-green-500' : 'bg-[#570000]'
                  } text-white hover:bg-[#3D0000] hover:scale-105 transition-all duration-300`}
                >
                  {copied ? 'Copied!' : 'Share'}
                </Button>
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <label className="block mb-2 text-[#570000] font-semibold text-sm md:text-base">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={handleNameChange}
                  className="w-full p-3 border border-[#570000]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#570000] text-[#570000] placeholder-[#570000]/50"
                  placeholder="Enter your name"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-8"
              >
                <h2 className="text-xl font-semibold mb-4 text-center text-[#570000]">
                  Players ({players.length})
                </h2>
                <div className="bg-[#FFA7A6]/20 rounded-lg p-4">
                  {players.length === 0 ? (
                    <p className="text-center text-[#570000]/70">
                      {isConnected ? 'Waiting for players…' : 'Connecting…'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {players.map((player, index) => (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex justify-between items-center p-2 bg-white rounded-lg shadow-sm"
                        >
                          <span
                            className={`font-medium ${
                              !player.connected
                                ? 'text-gray-400'
                                : 'text-[#570000]'
                            }`}
                          >
                            {player.name}
                            {player.id === playerId ? ' (You)' : ''}
                            {!player.connected && ' (Offline)'}
                          </span>
                          <span className="bg-[#570000] text-white px-3 py-1 rounded-full font-bold text-sm">
                            {player.score}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 mb-6 w-full max-w-2xl mx-auto"
              >
                <Button
                  onClick={handleTestConnection}
                  disabled={!isConnected}
                  className={`relative flex-1 py-3 px-4 sm:px-6 rounded-lg shadow-lg transition-all duration-300 text-base sm:text-lg font-semibold group ${
                    isConnected
                      ? 'bg-[#570000] hover:bg-[#3D0000] text-white hover:shadow-xl hover:scale-105'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                  <Network className="h-5 w-5 mr-2 inline-block" />
                  Test Connection
                </Button>

                <Button
                  onClick={handleStartGame}
                  disabled={!isConnected || !isFirstPlayer || gameStarted}
                  className={`relative flex-1 py-3 px-4 sm:px-6 rounded-lg shadow-lg transition-all duration-300 text-base sm:text-lg font-semibold group ${
                    isConnected && isFirstPlayer && !gameStarted
                      ? 'bg-[#FF9190] hover:bg-[#FF7A79] content-center text-white hover:shadow-xl hover:scale-105'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                  <Play className="h-5 w-5 mr-2 inline-block" />
                  {gameStarted ? 'Game Started' : 'Start Game'}
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-center"
              >
                <Button
                  onClick={() => setShowConfig(true)}
                  disabled={gameStarted}
                  className={`bg-[#570000] hover:bg-[#3D0000] text-white rounded-full p-3 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 ${
                    gameStarted ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {gameStarted && whotGame?.gameStatus === 'playing' && (
        <div className="flex flex-col lg:flex-row flex-1 relative">
          <div className="flex-1 flex flex-col p-4 lg:w-2/3">
            {whotGame.whotPlayers.map((whotPlayer, playerIndex) => {
              if (whotPlayer.id === playerId && isInGame) return null
              return (
                <div key={whotPlayer.id} className="mb-8 h-fit">
                  <h3 className="text-[#570000] font-bold mb-2 flex items-center">
                    {whotPlayer.name}&apos;s Cards
                    {whotGame.currentPlayerIndex === playerIndex && (
                      <span className="ml-2 bg-[#570000] text-white text-xs px-2 py-1 rounded-full">
                        Current Turn
                      </span>
                    )}
                  </h3>
                  <div className="flex justify-center h-38 relative">
                    <div className="relative w-full max-w-md">
                      {Array(whotPlayer.hand.length)
                        .fill(0)
                        .map((_, j) => {
                          const totalCards = whotPlayer.hand.length
                          const center = totalCards / 2
                          const normalizedPos = (j - center) / center

                          const maxRotation = Math.min(
                            25,
                            35 * (10 / Math.max(totalCards, 10))
                          )
                          const rotation = normalizedPos * maxRotation

                          const cardWidth = 70
                          const screenWidth = window.innerWidth
                          const isMobile = screenWidth < 768

                          const widthFactor = isMobile
                            ? Math.min(0.6, 5 / Math.max(totalCards, 5))
                            : Math.min(1, 12 / Math.max(totalCards, 12))

                          const maxWidth = isMobile ? screenWidth * 0.7 : 400
                          const arcWidth = Math.min(
                            maxWidth,
                            totalCards * 20 * widthFactor
                          )

                          const spacingFactor = Math.min(
                            0.8,
                            8 / Math.max(totalCards, 8)
                          )
                          const xPos =
                            j * (arcWidth / totalCards) * spacingFactor -
                            (arcWidth / 2) * spacingFactor +
                            cardWidth / 2

                          const yOffset =
                            Math.abs(normalizedPos) * 10 * spacingFactor

                          return (
                            <motion.div
                              key={`player-${whotPlayer.id}-card-${j}`}
                              className="absolute top-0 left-1/2"
                              initial={{ scale: 0, rotate: 0, x: 0, y: 0 }}
                              animate={{
                                scale: isMobile ? 0.9 : 1,
                                rotate: rotation,
                                x: xPos,
                                y: yOffset,
                              }}
                              transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 20,
                                delay: j * 0.02,
                              }}
                              style={{
                                transformOrigin: 'bottom center',
                                zIndex: j,
                              }}
                            >
                              <WhotCard
                                card={{ type: 'whot', value: 20 }}
                                faceDown={true}
                              />
                            </motion.div>
                          )
                        })}
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="flex justify-center gap-8 mb-4 h-44">
              <div className="text-center">
                <h4 className="text-[#570000] text-sm font-bold mb-1">
                  Call Card
                </h4>
                <div className="relative h-32 w-20">
                  {whotGame.callCardPile
                    .slice(-3)
                    .map((card: Card, index, array) => {
                      const isTopCard = index === array.length - 1

                      return (
                        <motion.div
                          key={index}
                          className="absolute top-0 left-0"
                          initial={{
                            scale: 0.8,
                            rotate: (index - array.length + 1) * 5,
                            x: (index - array.length + 1) * 3,
                            y: (index - array.length + 1) * -2,
                          }}
                          animate={{
                            scale: 1,
                            rotate: isTopCard
                              ? 0
                              : (index - array.length + 1) * 50,
                            x: isTopCard ? 0 : (index - array.length + 1) * 3,
                            y: isTopCard ? 0 : (index - array.length + 1) * -2,
                          }}
                          transition={{
                            duration: 0.3,
                            type: 'spring',
                            stiffness: 300,
                            damping: 20,
                          }}
                          style={{
                            zIndex: index,
                          }}
                        >
                          <div className="relative">
                            <WhotCard
                              card={card}
                              className={cn('transition-all duration-300')}
                            />
                            {isTopCard &&
                              card.type === 'whot' &&
                          card.whotChosenShape && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="text-5xl text-[#570000] font-bold rounded-none">
                                {card.whotChosenShape === 'circle' && '●'}
                                {card.whotChosenShape === 'triangle' &&
                                      '▲'}
                                {card.whotChosenShape === 'cross' && '✚'}
                                {card.whotChosenShape === 'square' && '■'}
                                {card.whotChosenShape === 'star' && '★'}
                                  </div>
                                </div>
                              )}
                          </div>
                        </motion.div>
                      )
                    })}
                </div>
              </div>

              <div className="text-center">
                <h4 className="text-[#570000] text-sm font-bold mb-1">
                  Market
                </h4>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={drawCard}
                  className={cn(
                    'cursor-pointer',
                    (whotGame.currentPlayerIndex !==
                      whotGame.whotPlayers.findIndex(
                        (p) => p.id === playerId
                      ) ||
                      !isInGame) &&
                      'opacity-50 cursor-not-allowed'
                  )}
                >
                  <WhotCard
                    card={{ type: 'whot', value: 20 }}
                    faceDown={true}
                  />
                </motion.div>
                <div className="text-[#570000] text-sm font-bold mt-1">
                  {whotGame.deck.length} cards left
                </div>
              </div>
            </div>

            {isInGame && (
              <div className="h-52">
                <h3 className="text-[#570000] font-bold mb-2 flex items-center flex-wrap">
                  <span className="flex items-center">
                    Your Cards
                    {whotGame.currentPlayerIndex ===
                      whotGame.whotPlayers.findIndex(
                        (p) => p.id === playerId
                      ) && (
                      <span className="ml-2 bg-[#570000] text-white text-xs px-2 py-1 rounded-full">
                        Current Turn
                      </span>
                    )}
                  </span>
                  <span className="ml-2 text-sm">
                    (
                    {
                      whotGame.whotPlayers.find((p) => p.id === playerId)?.hand
                        .length
                    }{' '}
                    cards)
                  </span>

                  {!isSmallScreen && (
                    <button
                      onClick={() => setHandExpanded(!handExpanded)}
                      className="ml-auto text-xs bg-[#570000] text-white px-2 py-1 rounded-full hover:bg-[#3D0000]"
                    >
                      {handExpanded ? 'Compact View' : 'Expand Hand'}
                    </button>
                  )}
                </h3>

                <div
                  className="relative w-full mx-auto h-44 md:h-48 overflow-x-auto items-stretch"
                  ref={playerHandRef}
                  onTouchStart={() => setHandExpanded(true)}
                  onTouchEnd={() => setHandExpanded(false)}
                  onMouseEnter={() => setHandExpanded(true)}
                  onMouseLeave={() => setHandExpanded(false)}
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    transition: 'all 0.3s ease-in-out',
                  }}
                >
                  <div
                    className={cn(
                      'flex items-center transition-all duration-300 ease-in-out h-full',
                      isSmallScreen ? 'justify-start px-2' : 'justify-center'
                    )}
                    style={{
                      width: isSmallScreen
                        ? `${
                            (whotGame.whotPlayers.find((p) => p.id === playerId)
                              ?.hand.length || 0) * 60
                          }px`
                        : '100%',
                      minWidth: 'fit-content',
                      paddingLeft: isSmallScreen ? '16px' : '0',
                      paddingRight: isSmallScreen ? '16px' : '0',
                      transform: isSmallScreen
                        ? handExpanded
                          ? 'scale(1.05)'
                          : 'scale(1)'
                        : 'scale(1)',
                      transition: 'all 1s ease-in-out',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <AnimatePresence>
                      {(
                        whotGame.whotPlayers.find((p) => p.id === playerId)
                          ?.hand || []
                      ).map((card, index) => {
                        const style = getPlayerCardStyle(
                          index,
                          whotGame.whotPlayers.find((p) => p.id === playerId)
                            ?.hand.length || 0
                        )

                        const isPlayable =
                          whotGame.currentPlayerIndex ===
                          whotGame.whotPlayers.findIndex(
                            (p) => p.id === playerId
                          )
                        const hoveredScale = isSmallScreen ? 1.0 : 1.15
                        const hoveredY = isSmallScreen ? -5 : -15

                        return (
                          <motion.div
                            key={`player-card-${index}`}
                            className={cn(
                              'relative',
                              isPlayable ? 'cursor-pointer' : 'cursor-default'
                            )}
                            initial={{
                              scale: 0,
                              rotate: 0,
                              x: 0,
                              y: 0,
                            }}
                            animate={{
                              scale: style.scale,
                              rotate: style.rotation,
                              x: isSmallScreen ? 0 : style.x,
                              y: isSmallScreen ? 0 : style.y,
                              zIndex:
                                (whotGame.whotPlayers.find(
                                  (p) => p.id === playerId
                                )?.hand.length || 0) + index,
                            }}
                            whileHover={
                              isPlayable
                                ? {
                                    scale: hoveredScale,
                                    y: hoveredY,
                                    zIndex: 100,
                                  }
                                : {}
                            }
                            style={{
                              transformOrigin: 'bottom center',
                              marginRight: isSmallScreen ? '4px' : '0',
                              width: isSmallScreen ? '55px' : undefined,
                              position: isSmallScreen ? 'relative' : 'absolute',
                              left: isSmallScreen ? 'auto' : '50%',
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isPlayable) {
                                playCard(index)
                              }
                            }}
                          >
                            <WhotCard card={card} />
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </div>

                {isSmallScreen && (
                  <div className="absolute bottom-1 left-0 right-0 flex justify-center z-50">
                    <Button
                      onClick={() => setShowCardView(!showCardView)}
                      className="bg-[#570000] hover:bg-[#3D0000] text-white rounded-full"
                    >
                      {showCardView ? (
                        <ChevronUp className="mr-2 h-4 w-4" />
                      ) : (
                        <LayoutGrid className="mr-2 h-4 w-4" />
                      )}
                      {showCardView ? 'Close Cards' : 'View All Cards'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {!isSmallScreen && whotInsightShow && (
            <div className="w-full min-h-full h-[calc(100vh-64px)] lg:w-1/3 border-red-500 overflow-y-auto">
              <MovesHistorySidebar
                moves={whotGame.moveHistory}
                setWhotInsightShow={closeInsightCallback}
                onNewGame={handleStartGame}
              />
            </div>
          )}
        </div>
      )}

      {gameStarted && whotGame?.gameStatus === 'finished' && (
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="bg-[#570000] p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
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
                        repeat: Number.POSITIVE_INFINITY,
                        repeatDelay: Math.random() * 2,
                      }}
                      style={{
                        left: `${Math.random() * 100}%`,
                        width: `${Math.random() * 10 + 5}px`,
                        height: `${Math.random() * 10 + 5}px`,
                        background: [
                          '#FFD700',
                          '#FFA7A6',
                          '#FF9190',
                          '#FFFFFF',
                        ][Math.floor(Math.random() * 4)],
                      }}
                    />
                  ))}
              </div>
              <div className="relative z-10 flex justify-center">
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="text-white"
                >
                  <Trophy className="h-20 w-20" />
                </motion.div>
              </div>
            </div>

            <div className="p-8 text-center">
              <motion.h2
                className="text-[#570000] text-3xl font-bold mb-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Game Over!
              </motion.h2>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <p className="text-[#570000] text-xl font-medium mb-2">
                  {whotGame.winner
                    ? `${
                        whotGame.whotPlayers.find(
                          (p) => p.id === whotGame.winner
                        )?.name
                      } Wins!`
                    : 'No Winner (Game Ended)'}
                </p>
                <p className="text-gray-600">
                  {whotGame.winner === playerId
                    ? 'Congratulations on your victory!'
                    : whotGame.winner
                    ? 'Better luck next time!'
                    : 'The game ended due to insufficient players.'}
                </p>
              </motion.div>

              <motion.div
                className="grid grid-cols-2 gap-4 mb-8 text-sm"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="bg-[#FFA7A6]/20 p-3 rounded-lg">
                  <p className="text-[#570000] font-medium">Cards Played</p>
                  <p className="text-2xl font-bold text-[#570000]">
                    {
                      whotGame.moveHistory.filter((m) => m.action === 'play')
                        .length
                    }
                  </p>
                </div>
                <div className="bg-[#FFA7A6]/20 p-3 rounded-lg">
                  <p className="text-[#570000] font-medium">Cards Drawn</p>
                  <p className="text-2xl font-bold text-[#570000]">
                    {
                      whotGame.moveHistory.filter((m) => m.action === 'draw')
                        .length
                    }
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  className="hover:bg-[#570000] bg-[#3D0000] text-white w-full py-6 text-lg rounded-lg shadow-lg transition-all hover:shadow-xl hover:scale-105"
                  onClick={handleStartGame}
                  disabled={!isFirstPlayer}
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Play Again
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {showCardView && isInGame && (
        <div className="fixed inset-0 z-50 bg-[#FFA7A6] bg-opacity-95 flex flex-col overflow-y-auto">
          <div className="sticky top-0 z-50 bg-[#570000] text-white p-4 flex justify-between items-center">
            <h3 className="font-bold">Your Cards</h3>
            <button onClick={() => setShowCardView(false)}>
              <XIcon className="h-5 w-5 cursor-pointer" />
            </button>
          </div>

          <div className="flex-1 p-4">
            <div className="mb-6 border-b border-[#570000] pb-4">
              <h4 className="text-[#570000] font-bold mb-2">
                Current Call Card:
              </h4>
              <div className="flex items-center">
                <div className="mr-4 relative -z-20">
                  <WhotCard card={getCurrentCallCard()!} />
                  {getCurrentCallCard()?.type === 'whot' &&
                    getCurrentCallCard()?.whotChosenShape && (
                      <div className="absolute inset-0 flex items-center z-0 justify-center pointer-events-none">
                        <div className="text-5xl text-[#570000] font-bold">
                          {getCurrentCallCard()?.whotChosenShape ===
                            'circle' && '●'}
                          {getCurrentCallCard()?.whotChosenShape ===
                            'triangle' && '▲'}
                          {getCurrentCallCard()?.whotChosenShape === 'cross' &&
                            '✚'}
                          {getCurrentCallCard()?.whotChosenShape ===
                            'square' && '■'}
                          {getCurrentCallCard()?.whotChosenShape === 'star' &&
                            '★'}
                        </div>
                      </div>
                    )}
                </div>

                <div>
                  <Button
                    onClick={drawCard}
                    disabled={
                      whotGame?.currentPlayerIndex !==
                      whotGame?.whotPlayers.findIndex((p) => p.id === playerId)
                    }
                    className="mt-2 bg-[#570000] hover:bg-[#3D0000] text-white"
                  >
                    Draw Card
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {(() => {
                const sortedCards = [
                  ...(whotGame!.whotPlayers.find((p) => p.id === playerId)
                    ?.hand || []),
                ].sort((a, b) => {
                  const shapeOrder = {
                    circle: 1,
                    triangle: 2,
                    cross: 3,
                    square: 4,
                    star: 5,
                    whot: 6,
                  }
                  const shapeComparison =
                    shapeOrder[a.type] - shapeOrder[b.type]
                  if (shapeComparison !== 0) return shapeComparison
                  return a.value - b.value
                })
                return sortedCards.map((card, index) => {
                  const isPlayable =
                    whotGame!.currentPlayerIndex ===
                    whotGame!.whotPlayers.findIndex((p) => p.id === playerId)

                  const originalIndex = whotGame!.whotPlayers
                    .find((p) => p.id === playerId)!
                    .hand.findIndex(
                      (handCard) =>
                        handCard.type === card.type &&
                        handCard.value === card.value
                    )

                  return (
                    <div
                      key={`grid-card-${index}`}
                      className={cn(
                        'rounded-lg p-2 flex flex-col items-center justify-center',
                        isPlayable
                          ? 'cursor-pointer hover:bg-[#FF9190] active:bg-[#FF7A79]'
                          : 'opacity-70'
                      )}
                      onClick={() => isPlayable && playCard(originalIndex)}
                    >
                      <WhotCard card={card} />
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      )}
      {showShapeSelector && (
        <div
          className="fixed inset-0 flex md:items-end md:justify-end items-center justify-center bg-black/50 z-50"
          onClick={() => setShowShapeSelector(false)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white rounded-lg p-4 w-[90%] md:w-[400px] md:m-4 fixed bottom-0 md:relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowShapeSelector(false)}
              className="absolute top-2 right-2 text-[#570000] hover:text-[#3D0000] cursor-pointer"
            >
              <XIcon />
            </button>
            <h3 className="text-xl font-bold text-[#570000] mb-2 text-center">
              Select a shape:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-2xl">
              <button
                onClick={() => selectShape('circle')}
                className="bg-[#570000] text-white py-3 px-6 rounded-lg hover:bg-[#3D0000] transition-colors cursor-pointer"
              >
                ●
              </button>
              <button
                onClick={() => selectShape('triangle')}
                className="bg-[#570000] text-white py-3 px-6 rounded-lg hover:bg-[#3D0000] transition-colors cursor-pointer"
              >
                ▲
              </button>
              <button
                onClick={() => selectShape('cross')}
                className="bg-[#570000] text-white py-3 px-6 rounded-lg hover:bg-[#3D0000] transition-colors cursor-pointer"
              >
                ✚
              </button>
              <button
                onClick={() => selectShape('square')}
                className="bg-[#570000] text-white py-3 px-6 rounded-lg hover:bg-[#3D0000] transition-colors cursor-pointer"
              >
                ■
              </button>
              <button
                onClick={() => selectShape('star')}
                className="bg-[#570000] text-white py-3 px-6 rounded-lg hover:bg-[#3D0000] transition-colors cursor-pointer"
              >
                ★
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, type: 'spring' }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setShowChat(true)}
          className="bg-[#570000] hover:bg-[#3D0000] text-white rounded-full p-4 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </motion.div>

      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 bg-black/50 md:bg-transparent"
          >
            <div
              className="bg-white rounded-t-xl md:rounded-xl w-full md:w-[400px] h-[80vh] md:h-[500px] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#570000] text-white p-4 rounded-t-xl flex justify-between items-center">
                <h3 className="text-lg font-bold">Room Chat</h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-white hover:text-[#FFA7A6] cursor-pointer"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>

              <div
                ref={(el) => {
                  if (el && chatMessages?.length > 0) {
                    const container = el.closest('.overflow-y-auto')
                    if (container) {
                      container.scrollTop = container.scrollHeight
                    }
                  }
                }}
                className="flex-1 p-4 overflow-y-auto bg-[#FFA7A6]/10"
              >
                {chatMessages.length === 0 ? (
                  <p className="text-center text-[#570000]/50">
                    No messages yet. Start chatting!
                  </p>
                ) : (
                  chatMessages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`mb-3 flex ${
                        msg.playerId === playerId
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.playerId === playerId
                            ? 'bg-[#570000] text-white'
                            : 'bg-white text-[#570000] shadow-sm'
                        }`}
                      >
                        <p className="text-sm opacity-75">
                          {msg.playerName} •{' '}
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-[#570000]/20 flex flex-col gap-3">
                <div className="flex flex-wrap gap-2 justify-center">
                  {['Nice move', 'You almost got me', 'Last card'].map(
                    (quickMessage) => (
                      <Button
                        key={quickMessage}
                        onClick={() => {
                          const chatMessage: ChatMessage = {
                            playerId,
                            playerName,
                            message: quickMessage,
                            timestamp: new Date().toISOString(),
                          }
                          send({
                            type: 'chat-message',
                            roomId,
                            ...chatMessage,
                          })
                        }}
                        disabled={!isConnected}
                        className={`px-3 py-1 text-sm rounded-full transition-all duration-300 ${
                          isConnected
                            ? 'bg-[#FFA7A6] hover:bg-[#FF7A79] text-white hover:shadow-md'
                            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        }`}
                      >
                        {quickMessage}
                      </Button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 p-3 border border-[#570000]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#570000] text-[#570000] placeholder-[#570000]/50 resize-none"
                    rows={2}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!isConnected || !chatInput.trim()}
                    className="bg-[#570000] hover:bg-[#3D0000] text-white rounded-full p-3"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            onClick={() => setShowConfig(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white rounded-lg p-6 w-[90%] max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-[#570000]">
                  Whot Game Settings
                </h3>
                <button
                  onClick={() => setShowConfig(false)}
                  className="text-[#570000] hover:text-[#3D0000] cursor-pointer"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[#570000] font-medium">
                    Pick 2 Enabled
                  </label>
                  <Switch
                    checked={whotConfig.pick2}
                    onCheckedChange={(value) =>
                      handleConfigChange('pick2', value)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[#570000] font-medium">
                    Pick 3 Enabled
                  </label>
                  <Switch
                    checked={whotConfig.pick3}
                    onCheckedChange={(value) =>
                      handleConfigChange('pick3', value)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[#570000] font-medium">
                    Whot Card Enabled
                  </label>
                  <Switch
                    checked={whotConfig.whotEnabled}
                    onCheckedChange={(value) =>
                      handleConfigChange('whotEnabled', value)
                    }
                  />
                </div>
              </div>
              <Button
                onClick={saveConfig}
                className="w-full mt-6 bg-[#570000] hover:bg-[#3D0000] text-white rounded-lg py-3 font-bold hover:scale-105 transition-all duration-300"
              >
                Save Settings
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              className="bg-gradient-to-b from-white to-gray-50 p-6 rounded-xl shadow-2xl max-w-xs w-full mx-4 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex justify-center items-center mb-3">
                <h3 className="text-xl font-bold text-[#570000]">
                  Scan to Join Room
                </h3>
                <button
                  onClick={() => setShowQR(false)}
                  className="absolute right-0 top-0 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex justify-center mb-4">
                <QRCodeCanvas
                  value={gameLink}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#570000"
                  level="H"
                />
              </div>
              <div className="flex items-center justify-between bg-gray-100 rounded-lg p-2 mb-4">
                <p className="text-sm text-gray-700 truncate">{gameLink}</p>
                <button
                  onClick={copyRoomLink}
                  className="ml-2 p-1 text-[#570000] hover:text-[#3D0000] transition-colors cursor-pointer"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <p className="text-sm text-gray-500 text-center">
                Scan the QR code or copy the link to join the game.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
