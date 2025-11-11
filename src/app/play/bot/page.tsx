'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAgent } from 'agents/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { RefreshCw, XIcon, LayoutGrid, ChevronUp, Trophy } from 'lucide-react'
import { cn, localWranglerHost } from '@/lib/utils'
import { MovesHistorySidebar } from './helper'
import { WhotCard } from './helper'
import type { Card } from '@/types/game'

interface MoveHistoryItem {
  player: 'player' | 'bot'
  card: Card
  timestamp: Date
  action: 'play' | 'draw'
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
  moveHistory: MoveHistoryItem[]
}

export default function PlayBot() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isBotThinking, setIsBotThinking] = useState(false)
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
      JSON.stringify({
        ...gameData,
        gameId: newGameId,
      })
    )
    return newGameId
  })()

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
  }, [gameState])

  const agent = useAgent({
    agent: 'MyWhotAgent',
    name: gameId,
    host: process.env.NEXT_PUBLIC_WHOT_AGENT_HOST ?? localWranglerHost,
    onOpen: () => {
      console.log('Connected to Whot game')
      setIsConnected(true)
    },
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log(data)
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
    onClose: () => {
      setIsConnected(false)
    },
  })

  const startGame = () => {
    agent.send(JSON.stringify({ action: 'start_game' }))
  }

  const playCard = (cardIndex: number) => {
    if (gameState?.currentPlayer !== 'player' || isBotThinking) return
    const card = gameState?.playerHand[cardIndex]
    console.log(card)
    if (card?.value === 20) {
      setShowShapeSelector(true)
      setSelectedCardIndex(cardIndex)
    } else {
      agent.send(
        JSON.stringify({
          action: 'play_card',
          cardIndex: cardIndex,
          whotChosenShape: null,
        })
      )
    }

    if (!isBotThinking && showCardView) {
      setShowCardView(false)
    }
  }

  const selectShape = (shape: Card['whotChosenShape']) => {
    agent.send(
      JSON.stringify({
        action: 'play_card',
        cardIndex: selectedCardIndex,
        whotChosenShape: shape,
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
      !gameState ||
      !gameState.callCardPile ||
      gameState.callCardPile.length === 0
    ) {
      return null
    }
    return gameState.callCardPile[gameState.callCardPile.length - 1]
  }

  const closeInsightCallback = useCallback(() => {
    setWhotInsightShow(false)
  }, [])

  useEffect(() => {
    console.log(gameState?.moveHistory)
  }, [gameState?.moveHistory])
  return (
    <div className=" bg-[#FFA7A6] flex flex-col overflow-y-auto min-h-fit ">
      <div className="bg-[#570000] text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">VS</h2> <span> Advance AI</span>
        </div>

        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            className="border-white hover:text-white text-[#3D0000] bg-white hover:bg-[#570000]"
            onClick={startGame}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            New Game
          </Button>
        </div>
      </div>

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
                  Card Game
                </motion.h1>
                <motion.p
                  className="text-white/80 text-sm"
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Match cards by suit or value to win!
                </motion.p>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 text-center">
              <motion.div
                className="mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-[#570000] text-xl font-bold mb-4">
                  How to Play Whot!
                </h2>
                <ul className="text-left text-gray-700 space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-[#570000] mr-2">•</span>
                    <span>
                      Play cards matching the symbol or number of the top card
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#570000] mr-2">•</span>
                    <span>Special cards have unique effects:</span>
                    <ul className="ml-6 mt-1 space-y-1">
                      <li className="flex items-start text-xs">
                        <span className="text-[#570000] mr-2">-</span>
                        <span>Whot (20): Change the required symbol</span>
                      </li>
                      <li className="flex items-start text-xs">
                        <span className="text-[#570000] mr-2">-</span>
                        <span>Card Number 1: Skip next player</span>
                      </li>
                      <li className="flex items-start text-xs">
                        <span className="text-[#570000] mr-2">-</span>
                        <span>Card Number 2: Next player picks 2 cards</span>
                      </li>

                      <li className="flex items-start text-xs">
                        <span className="text-[#570000] mr-2">-</span>
                        <span>Card Number 14: All players pick a card</span>
                      </li>
                    </ul>
                  </li>
                  <li className="flex items-start">
                  <span className="text-[#570000] mr-2">•</span>
                  <span>Draw a card if you can&rsquo;t play any</span>
                  </li>

                  <li className="flex items-start">
                    <span className="text-[#570000] mr-2">•</span>
                    <span>First player to use all their cards wins!</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#570000] mr-2">•</span>
                    <span>
                      When the market is empty, the player with the highest card
                      number loses!
                    </span>
                  </li>
                </ul>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
              >
                <Button
                  className="bg-[#570000] hover:bg-[#3D0000] text-white w-full py-6 text-lg rounded-lg shadow-lg transition-all hover:shadow-xl hover:scale-105"
                  onClick={startGame}
                >
                  Start New Game
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {gameState?.gameStatus === 'playing' && (
        <div className="flex flex-col lg:flex-row flex-1 relative">
          <div className="flex-1 flex flex-col p-4 lg:w-2/3 ">
            <div className="mb-8 h-fit">
              <h3 className="text-[#570000] font-bold mb-2 flex items-center">
                Bot&rsquo;s Cards
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

                      // Reduce width factor on mobile to prevent overflow
                      const widthFactor = isMobile
                        ? Math.min(0.6, 5 / Math.max(totalCards, 5))
                        : Math.min(1, 12 / Math.max(totalCards, 12))

                      // Reduce max width on mobile to prevent overflow
                      const maxWidth = isMobile ? screenWidth * 0.7 : 400
                      const arcWidth = Math.min(
                        maxWidth,
                        totalCards * 20 * widthFactor
                      )

                      // Increase spacing compression for more cards
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
                          key={`bot-card-${j}`}
                          className="absolute top-0 left-1/2"
                          initial={{ scale: 0, rotate: 0, x: 0, y: 0 }}
                          animate={{
                            scale: isMobile ? 0.9 : 1, // Slightly smaller cards on mobile
                            rotate: rotation,
                            x: xPos,
                            y: yOffset,
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 20,
                            delay: j * 0.02, // Slightly faster animation
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
              <div
                className="text-[#570000] text-sm font-bold text-center h-fit transition-opacity duration-300"
                style={{ opacity: isBotThinking ? 1 : 0 }}
              >
                Bot is thinking...
              </div>
            </div>

            <div className="flex justify-center gap-8 mb-4 h-44">
              <div className="text-center">
                <h4 className="text-[#570000] text-sm font-bold mb-1">
                  Call Card
                </h4>
                <div className="relative h-32 w-20">
                  {gameState.callCardPile
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
                    (gameState.currentPlayer !== 'player' || isBotThinking) &&
                      'opacity-50 cursor-not-allowed'
                  )}
                >
                  <WhotCard
                    card={{ type: 'whot', value: 20 }}
                    faceDown={true}
                  />
                </motion.div>
                <div className="text-[#570000] text-sm font-bold mt-1">
                  {gameState?.deckCount} cards left
                </div>
              </div>
            </div>

            <div className=" h-52">
              <h3 className="text-[#570000] font-bold mb-2 flex items-center flex-wrap">
                <span className="flex items-center">
                  Your Cards
                  {gameState.currentPlayer === 'player' && (
                    <span className="ml-2 bg-[#570000] text-white text-xs px-2 py-1 rounded-full">
                      Current Turn
                    </span>
                  )}
                </span>
                <span className="ml-2 text-sm">
                  ({gameState.playerHand.length} cards)
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
                      ? `${gameState.playerHand.length * 60}px`
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
                    {gameState.playerHand.map((card, index) => {
                      const style = getPlayerCardStyle(
                        index,
                        gameState.playerHand.length
                      )

                      const isPlayable =
                        gameState.currentPlayer === 'player' && !isBotThinking
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
                            zIndex: gameState.playerHand.length + index,
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
          </div>

          {!isSmallScreen && whotInsightShow && (
            <div className="w-full min-h-full h-[calc(100vh-64px)] lg:w-1/3 border-red-500 overflow-y-auto">
              <MovesHistorySidebar
                moves={gameState.moveHistory}
                setWhotInsightShow={closeInsightCallback}
                onNewGame={startGame}
              />
            </div>
          )}
        </div>
      )}

      {gameState?.gameStatus === 'finished' && (
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
            {/* Confetti header */}
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
                  <Trophy className="h-20 w-20 " />
                </motion.div>
              </div>
            </div>

            {/* Content */}
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
                  {gameState.winner === 'player'
                    ? 'You Win!'
                    : 'Opponent Wins!'}
                </p>
                <p className="text-gray-600">
                  {gameState.winner === 'player'
                    ? 'Congratulations on your victory!'
                    : 'Better luck next time!'}
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
                      gameState.moveHistory.filter((m) => m.action === 'play')
                        .length
                    }
                  </p>
                </div>
                <div className="bg-[#FFA7A6]/20 p-3 rounded-lg">
                  <p className="text-[#570000] font-medium">Cards Drawn</p>
                  <p className="text-2xl font-bold text-[#570000]">
                    {
                      gameState.moveHistory.filter((m) => m.action === 'draw')
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
                  onClick={startGame}
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Play Again
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {showCardView && (
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
                <div className="mr-4 relative  -z-20">
                  <WhotCard card={getCurrentCallCard()!} />

                  {/* Overlay for chosen shape when card is whot */}
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
                      gameState?.currentPlayer !== 'player' || isBotThinking
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
                const sortedCards = [...gameState!.playerHand].sort((a, b) => {
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
                    gameState!.currentPlayer === 'player' && !isBotThinking

                  const originalIndex = gameState!.playerHand.findIndex(
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
    </div>
  )
}
