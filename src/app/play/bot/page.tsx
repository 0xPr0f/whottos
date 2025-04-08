'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useAgent } from 'agents/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { RefreshCw, XIcon, LayoutGrid, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  generateCardBack,
  generateWhotCards,
} from '@/components/whot-card/card-svg-generation/generate-cards'
import { MovesHistorySidebar } from './helper'

interface Card {
  type: 'whot' | 'circle' | 'triangle' | 'cross' | 'square' | 'star'
  value: number
  whotChoosenShape?: 'circle' | 'triangle' | 'cross' | 'square' | 'star' | null
}

interface MoveHistoryItem {
  player: 'player' | 'bot'
  card: Card
  timestamp: Date
  action: 'play' | 'draw' | 'pass'
}

interface GameState {
  gameId: string
  deckCount?: number
  playerHand: Card[]
  botHand: Card[]
  callCardPile: Card[]
  currentPlayer: 'player' | 'bot'
  gameStatus: 'waiting' | 'playing' | 'finished'
  botHandCount?: number
  winner?: 'player' | 'bot'
  lastAction?: {
    player: 'player' | 'bot'
    action: 'play' | 'draw'
    card?: Card
  }
}

export default function PlayBot() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isBotThinking, setIsBotThinking] = useState(false)
  const [showShapeSelector, setShowShapeSelector] = useState(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(
    null
  )
  const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([])
  const [handExpanded, setHandExpanded] = useState(false)
  const [showCardView, setShowCardView] = useState(false)
  const playerHandRef = useRef<HTMLDivElement>(null)
  const [handWidth, setHandWidth] = useState(0)
  const [isSmallScreen, setIsSmallScreen] = useState(false)

  // Generate a unique game ID
  const gameId = (() => {
    const storageKey = 'whot-game-storage'
    const storedData = localStorage.getItem(storageKey)
    const gameData = storedData ? JSON.parse(storedData) : {}

    if (gameData.gameId && gameData.gameId.length > 5) {
      return gameData.gameId
    }

    const newGameId = `game-${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem(
      storageKey,
      JSON.stringify({ ...gameData, gameId: newGameId })
    )
    return newGameId
  })()

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Update hand width and screen size on resize
  useEffect(() => {
    if (!playerHandRef.current) return

    const updateSizes = () => {
      if (playerHandRef.current) {
        setHandWidth(playerHandRef.current.offsetWidth)
        setIsSmallScreen(window.innerWidth < 768)
      }
    }

    updateSizes()
    window.addEventListener('resize', updateSizes)
    const resizeObserver = new ResizeObserver(updateSizes)
    resizeObserver.observe(playerHandRef.current)

    return () => {
      window.removeEventListener('resize', updateSizes)
      if (playerHandRef.current) resizeObserver.unobserve(playerHandRef.current)
    }
  }, [gameState])

  // WebSocket agent for game communication
  const agent = useAgent({
    agent: 'whot-game-agent',
    name: gameId,
    host: process.env.NEXT_PUBLIC_WHOT_AGENT_HOST || 'http://localhost:8787',
    onOpen: () => setIsConnected(true),
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'gameState') {
          setGameState(data.state)
          setIsBotThinking(data.state.currentPlayer === 'bot')
        } else if (data.type === 'error') {
          console.error('Game error:', data.message)
        }
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    },
    onClose: () => setIsConnected(false),
  })

  const startGame = () => agent.send(JSON.stringify({ action: 'start_game' }))

  const playCard = (cardIndex: number) => {
    if (gameState?.currentPlayer !== 'player' || isBotThinking) return

    const card = gameState?.playerHand[cardIndex]
    if (card?.value === 20) {
      setShowShapeSelector(true)
      setSelectedCardIndex(cardIndex)
    } else {
      agent.send(JSON.stringify({ action: 'play_card', cardIndex }))
    }
    if (showCardView) setShowCardView(false)
  }

  const selectShape = (shape: string) => {
    agent.send(
      JSON.stringify({
        action: 'play_card',
        cardIndex: selectedCardIndex,
        whotChoosenShape: shape,
      })
    )
    setShowShapeSelector(false)
    setSelectedCardIndex(null)
  }

  const drawCard = () => {
    if (gameState?.currentPlayer === 'player' && !isBotThinking) {
      agent.send(JSON.stringify({ action: 'draw_card' }))
    }
  }

  useEffect(() => {
    if (!gameState?.lastAction) return
    const { player, action, card } = gameState.lastAction
    setMoveHistory((prev) => [
      ...prev,
      {
        player,
        action,
        card: card as Card,
        timestamp: new Date(),
      },
    ])
  }, [gameState])

  const getPlayerCardStyle = (index: number, totalCards: number) => {
    const cardWidth = 70
    const overlapFactor = Math.min(1, 10 / totalCards)
    const mobileAdjust = handWidth < 400 ? 0.5 : handWidth < 600 ? 0.7 : 1

    // Card visibility width
    const cardVisibleWidth = isSmallScreen
      ? cardWidth * 0.6
      : handExpanded
      ? cardWidth * 0.5
      : cardWidth * 0.3

    const maxFanWidth = Math.min(
      handWidth - cardWidth,
      totalCards * cardVisibleWidth * mobileAdjust
    )

    // Rotation for desktop fan effect
    const baseMaxAngle = isSmallScreen ? 0 : 20
    const cardCountFactor = Math.min(1, 7 / totalCards)
    const maxAngle =
      handWidth < 500 ? baseMaxAngle + 5 : baseMaxAngle * cardCountFactor

    const center = totalCards / 2
    const position = index - center
    const normalizedPosition = position / center
    const rotation = normalizedPosition * maxAngle

    // X position for card arrangement
    const fanFactor = maxFanWidth / Math.max(totalCards - 1, 1)
    let arcX
    if (isSmallScreen) {
      const cardSpacing = cardVisibleWidth * 1.2
      arcX =
        index * cardSpacing - (totalCards * cardSpacing) / 2 + handWidth / 2
    } else {
      arcX = handExpanded
        ? index * fanFactor * 0.8 - (fanFactor * (totalCards - 1) * 0.8) / 2
        : index * fanFactor * 0.5 - (fanFactor * (totalCards - 1) * 0.5) / 2
    }

    // Y position for slight arc effect
    const arcHeight = isSmallScreen ? 10 : Math.min(20, 25 * cardCountFactor)
    const arcY = Math.abs(normalizedPosition) * arcHeight

    const zIndex = 50 + (position < 0 ? totalCards + index : totalCards - index)

    return { rotation, x: arcX, y: arcY, zIndex, scale: 1 }
  }

  const getCurrentCallCard = () => {
    if (
      !gameState ||
      !gameState.callCardPile ||
      gameState.callCardPile.length === 0
    ) {
      return null
    }
    return gameState.callCardPile[gameState.callCardPile.length - 1]
  }

  return (
    <div className="bg-[#FFA7A6] flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-[#570000] text-white p-4 flex justify-between items-center">
        <h2 className="text-lg font-bold">Whot Game</h2>
        <Button
          variant="outline"
          size="sm"
          className="border-white text-[#3D0000] bg-white hover:bg-[#570000] hover:text-white"
          onClick={startGame}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          New Game
        </Button>
      </div>

      {/* Connection and Loading States */}
      {!isConnected && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#570000] text-lg">Connecting to game server...</p>
        </div>
      )}

      {isConnected && !gameState && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#570000] text-lg">Loading game state...</p>
        </div>
      )}

      {isConnected && gameState?.gameStatus === 'waiting' && (
        <div className="flex-1 flex items-center justify-center">
          <Button
            className="bg-[#570000] hover:bg-[#3D0000] text-white"
            onClick={startGame}
          >
            Start New Game
          </Button>
        </div>
      )}

      {/* Main Game Interface */}
      {gameState?.gameStatus === 'playing' && (
        <div className="flex flex-col lg:flex-row flex-1 min-h-fit">
          <div className="flex-1 flex flex-col p-4 lg:w-2/3">
            {/* Bot's Cards */}
            <div className="mb-8">
              <h3 className="text-[#570000] font-bold mb-2 flex items-center">
                Bot's Cards
                {gameState.currentPlayer === 'bot' && (
                  <span className="ml-2 bg-[#570000] text-white text-xs px-2 py-1 rounded-full">
                    Current Turn
                  </span>
                )}
              </h3>
              <div className="flex justify-center h-38 relative">
                <div className="relative w-full max-w-md">
                  {Array(gameState.botHandCount!)
                    .fill(0)
                    .map((_, j) => {
                      const totalCards = gameState.botHandCount!
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
                        ? Math.min(0.8, 7 / Math.max(totalCards, 7))
                        : Math.min(1, 12 / Math.max(totalCards, 12))
                      const maxWidth = isMobile ? screenWidth * 0.8 : 400
                      const arcWidth = Math.min(
                        maxWidth,
                        totalCards * 20 * widthFactor
                      )
                      const spacingFactor = Math.min(
                        1,
                        10 / Math.max(totalCards, 10)
                      )
                      const xPos =
                        j * (arcWidth / totalCards) * spacingFactor -
                        (arcWidth / 2) * spacingFactor +
                        cardWidth / 2
                      const yOffset =
                        Math.abs(normalizedPos) * 10 * spacingFactor

                      return (
                        <motion.div
                          key={`bot-card-${j}`}
                          className="absolute top-0 left-1/2"
                          initial={{ scale: 0, rotate: 0, x: 0, y: 0 }}
                          animate={{
                            scale: 1,
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
                            faceDown
                          />
                        </motion.div>
                      )
                    })}
                </div>
              </div>
              <div
                className="text-[#570000] text-sm font-bold text-center transition-opacity duration-300"
                style={{ opacity: isBotThinking ? 1 : 0 }}
              >
                Bot is thinking...
              </div>
            </div>

            {/* Call Card and Market */}
            <div className="flex justify-center gap-8 mb-4 h-44">
              <div className="text-center">
                <h4 className="text-[#570000] text-sm font-bold mb-1">
                  Call Card
                </h4>
                <div className="relative h-32 w-20">
                  {gameState.callCardPile
                    .slice(-5)
                    .map((card: Card, index, array) => {
                      const randomOffset = () => (Math.random() - 0.5) * 3
                      const isTopCard = index === array.length - 1

                      return (
                        <motion.div
                          key={index}
                          className="absolute top-0 left-0"
                          initial={{ scale: 0 }}
                          animate={{
                            scale: 1,
                            rotate: isTopCard
                              ? 0
                              : (index - array.length + 1) * 8 + randomOffset(),
                            x: isTopCard
                              ? 0
                              : (index - array.length + 1) * 6 + randomOffset(),
                            y: isTopCard
                              ? 0
                              : (index - array.length + 1) * -4 +
                                randomOffset(),
                          }}
                          transition={{ duration: 0.2, velocity: 0.9 }}
                          style={{ zIndex: index }}
                        >
                          <div className="relative">
                            <WhotCard card={card} faceDown={!isTopCard} />
                            {isTopCard &&
                              card.type === 'whot' &&
                              card.whotChoosenShape && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="text-4xl text-[#570000]">
                                    {card.whotChoosenShape === 'circle' && '●'}
                                    {card.whotChoosenShape === 'triangle' &&
                                      '▲'}
                                    {card.whotChoosenShape === 'cross' && '✚'}
                                    {card.whotChoosenShape === 'square' && '■'}
                                    {card.whotChoosenShape === 'star' && '★'}
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
                    (gameState.currentPlayer !== 'player' || isBotThinking) &&
                      'opacity-50 cursor-not-allowed'
                  )}
                >
                  <WhotCard card={{ type: 'whot', value: 20 }} faceDown />
                </motion.div>
                <div className="text-[#570000] text-sm font-bold mt-1">
                  {gameState?.deckCount} cards left
                </div>
              </div>
            </div>

            {/* Player's Cards */}
            <div className="h-52 relative">
              <h3 className="text-[#570000] font-bold mb-2 flex items-center whitespace-nowrap">
                <div className="flex items-center min-w-0 overflow-hidden">
                  <span className="flex-shrink-0">Your Cards</span>
                  {gameState.currentPlayer === 'player' && (
                    <span className="ml-2 bg-[#570000] text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                      Current Turn
                    </span>
                  )}
                  <span className="ml-2 text-sm flex-shrink-0">
                    ({gameState.playerHand.length} cards)
                  </span>
                </div>
                <button
                  onClick={() => setHandExpanded(!handExpanded)}
                  className="ml-auto text-xs bg-[#570000] text-white px-2 py-1 rounded-full hover:bg-[#3D0000] flex-shrink-0"
                >
                  {handExpanded ? 'Compact View' : 'Expand Hand'}
                </button>
              </h3>

              <div
                className="relative w-full mx-auto h-44 md:h-48 overflow-x-auto scrollbar-hide"
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
                  overflow: 'visible',
                }}
              >
                <div
                  className={cn(
                    'flex items-center transition-all duration-300 ease-in-out',
                    isSmallScreen ? 'justify-start px-2' : 'justify-center'
                  )}
                  style={{
                    width: isSmallScreen
                      ? `${gameState.playerHand.length * 60}px`
                      : handExpanded
                      ? '80%'
                      : '70%',
                    minWidth: isSmallScreen ? 'fit-content' : '100%',
                    paddingLeft: isSmallScreen ? '16px' : undefined,
                    paddingRight: isSmallScreen ? '16px' : undefined,
                    transform: isSmallScreen
                      ? handExpanded
                        ? 'scale(1.05)'
                        : 'scale(1)'
                      : handExpanded
                      ? 'scale(1.03)'
                      : 'scale(0.95)',
                    transition: 'all 0.3s ease-in-out',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <AnimatePresence>
                    {gameState.playerHand.map((card, index) => {
                      const style = getPlayerCardStyle(
                        index,
                        gameState.playerHand.length
                      )
                      const isPlayable =
                        gameState.currentPlayer === 'player' && !isBotThinking
                      const hoveredScale = isSmallScreen ? 1.1 : 1.15
                      const hoveredY = isSmallScreen ? -5 : -12

                      return (
                        <motion.div
                          key={`player-card-${index}`}
                          className={cn(
                            'relative',
                            isPlayable ? 'cursor-pointer' : 'cursor-default'
                          )}
                          initial={{ scale: 0, rotate: 0, x: 0, y: 0 }}
                          animate={{
                            scale: handExpanded
                              ? style.scale * 1.0
                              : style.scale * 0.95,
                            rotate: style.rotation,
                            x: isSmallScreen ? 0 : style.x,
                            y: isSmallScreen ? 0 : style.y,
                            zIndex: gameState.playerHand.length + index,
                          }}
                          whileHover={
                            isPlayable
                              ? {
                                  scale: hoveredScale,
                                  y: hoveredY,
                                  zIndex: 999,
                                }
                              : {}
                          }
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 30,
                            duration: 0.2,
                            velocity: 0.9,
                          }}
                          style={{
                            transformOrigin: 'bottom center',
                            marginRight: isSmallScreen
                              ? '4px'
                              : handExpanded
                              ? '4px'
                              : '-20px',
                            width: isSmallScreen ? '55px' : '70px',
                          }}
                          onClick={() => isPlayable && playCard(index)}
                        >
                          <WhotCard card={card} />
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {isSmallScreen && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center">
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
          </div>

          {/* Move History Sidebar */}
          <div className="w-full lg:w-1/3 border-t lg:border-l lg:border-t-0 border-red-500 overflow-y-auto">
            <MovesHistorySidebar moves={moveHistory} />
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState?.gameStatus === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <h2 className="text-[#570000] text-2xl font-bold mb-4">Game Over!</h2>
          <p className="text-[#570000] text-xl mb-6">
            {gameState.winner === 'player' ? 'You Win!' : 'Bot Wins!'}
          </p>
          <Button
            className="bg-[#570000] hover:bg-[#3D0000] text-white"
            onClick={startGame}
          >
            Play Again
          </Button>
        </div>
      )}

      {/* Mobile Card Grid View */}
      {showCardView && (
        <div className="fixed inset-0 z-50 bg-[#FFA7A6] bg-opacity-95 flex flex-col overflow-y-auto">
          <div className="sticky top-0 bg-[#570000] text-white p-4 flex justify-between items-center">
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
                <div className="mr-4">
                  <WhotCard card={getCurrentCallCard()!} />
                </div>
                <div>
                  <p className="text-[#570000] font-medium">
                    {getCurrentCallCard()?.type === 'whot'
                      ? `Whot (${
                          getCurrentCallCard()?.whotChoosenShape ||
                          'No shape chosen'
                        })`
                      : `${getCurrentCallCard()?.type} ${
                          getCurrentCallCard()?.value
                        }`}
                  </p>
                  <Button
                    onClick={drawCard}
                    disabled={
                      gameState?.currentPlayer !== 'player' || isBotThinking
                    }
                    className="mt-2 bg-[#570000] hover:bg-[#3D0000] text-white"
                  >
                    Draw Card
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {gameState?.playerHand.map((card, index) => {
                const isPlayable =
                  gameState.currentPlayer === 'player' && !isBotThinking
                return (
                  <div
                    key={`grid-card-${index}`}
                    className={cn(
                      'rounded-lg p-2 flex flex-col items-center justify-center',
                      isPlayable
                        ? 'cursor-pointer hover:bg-[#FF9190] active:bg-[#FF7A79]'
                        : 'opacity-70'
                    )}
                    onClick={() => isPlayable && playCard(index)}
                  >
                    <WhotCard card={card} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Shape Selector Modal */}
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
              {['circle', 'triangle', 'cross', 'square', 'star'].map(
                (shape) => (
                  <button
                    key={shape}
                    onClick={() => selectShape(shape)}
                    className="bg-[#570000] text-white py-3 px-6 rounded-lg hover:bg-[#3D0000] transition-colors cursor-pointer"
                  >
                    {shape === 'circle' && '●'}
                    {shape === 'triangle' && '▲'}
                    {shape === 'cross' && '✚'}
                    {shape === 'square' && '■'}
                    {shape === 'star' && '★'}
                  </button>
                )
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function WhotCard({
  card,
  faceDown,
  className,
}: {
  card: Card
  faceDown?: boolean
  className?: string
}) {
  if (!card) return null
  return (
    <div className={cn('h-32 w-20', className)}>
      {faceDown
        ? generateCardBack()
        : generateWhotCards({
            cardType: card.type as
              | 'circle'
              | 'square'
              | 'triangle'
              | 'cross'
              | 'star'
              | 'whot',
            cardNumber: card.value,
          })}
    </div>
  )
}
