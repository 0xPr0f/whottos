import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ChevronUp, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { WhotCard } from './bot/helper'
import type { Card } from '@/types/game'

interface GameState {
  gameId: string
  deck?: any[]
  deckCount?: number
  playerHand: Card[]
  botHand: Card[]
  callCardPile: Card[]
  currentPlayer: 'player' | 'bot'
  gameStatus: 'waiting' | 'playing' | 'finished'
  botHandCount?: number
  winner?: 'player' | 'bot' | null
  lastAction?: {
    player: 'player' | 'bot'
    action: 'play' | 'draw'
    card?: Card
  } | null
}

interface GameSkeletonProps {
  gameState: GameState
  isBotThinking?: boolean
  drawCard?: () => void
  playCard?: (index: number) => void
  closeInsightCallback?: () => void
}

export default function GameSkeleton({
  gameState,
  isBotThinking,
  drawCard,
  playCard,
  closeInsightCallback,
}: GameSkeletonProps) {
  const [handExpanded, setHandExpanded] = useState(false)
  const [showCardView, setShowCardView] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const [whotInsightShow, setWhotInsightShow] = useState(true)
  const playerHandRef = useRef<HTMLDivElement>(null)
  const [handWidth, setHandWidth] = useState(0)

  // Set default botHandCount if not provided
  const botCount = gameState.botHandCount || gameState.botHand.length || 5

  useEffect(() => {
    const element = playerHandRef.current
    if (!element) {
      setIsSmallScreen(typeof window !== 'undefined' && window.innerWidth < 768)
      return
    }

    const updateSizes = () => {
      if (!playerHandRef.current) return
      setHandWidth(playerHandRef.current.offsetWidth)
      setIsSmallScreen(window.innerWidth < 768)
    }

    updateSizes()
    window.addEventListener('resize', updateSizes)

    const resizeObserver = new ResizeObserver(updateSizes)
    resizeObserver.observe(element)

    return () => {
      window.removeEventListener('resize', updateSizes)
      resizeObserver.unobserve(element)
    }
  }, [])

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
    const zIndex =
      50 + (position < 0 ? totalCards + index : totalCards - index)

    return {
      rotation,
      x: arcX,
      y: arcY,
      zIndex,
      scale: 1,
    }
  }
  return (
    <div className="w-full h-full">
      <div className="flex-1 flex flex-col p-4">
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
              {Array.from({ length: botCount }).map((_, j) => {
                const totalCards = botCount
                const center = totalCards / 2
                const normalizedPos = (j - center) / center

                const maxRotation = Math.min(
                  25,
                  35 * (10 / Math.max(totalCards, 10))
                )
                const rotation = normalizedPos * maxRotation

                const cardWidth = 70
                const screenWidth =
                  typeof window !== 'undefined' ? window.innerWidth : 1024
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
                const spacingFactor = Math.min(0.8, 8 / Math.max(totalCards, 8))
                const xPos =
                  j * (arcWidth / totalCards) * spacingFactor -
                  (arcWidth / 2) * spacingFactor +
                  cardWidth / 2

                const yOffset = Math.abs(normalizedPos) * 10 * spacingFactor

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
            <h4 className="text-[#570000] text-sm font-bold mb-1">Call Card</h4>
            <div className="relative h-32 w-20">
              {gameState.callCardPile
                .slice(-1) // Limit to top 1 cards
                .map((card: Card, index, array) => {
                  const isTopCard = index === array.length - 1

                  return (
                    <motion.div
                      key={`call-card-${index}`}
                      className="absolute top-0 left-0"
                      initial={{
                        scale: 0.8,
                        rotate: (index - array.length + 1) * 5,
                        x: (index - array.length + 1) * 3,
                        y: (index - array.length + 1) * -2,
                      }}
                      animate={{
                        scale: 1,
                        rotate: isTopCard ? 0 : (index - array.length + 1) * 50,
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
                              <div className="text-5xl text-[#570000] font-bold ">
                                {card.whotChosenShape === 'circle' && '●'}
                                {card.whotChosenShape === 'triangle' && '▲'}
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
            <h4 className="text-[#570000] text-sm font-bold mb-1">Market</h4>
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
              <WhotCard card={{ type: 'whot', value: 20 }} faceDown={true} />
            </motion.div>
            <div className="text-[#570000] text-sm font-bold mt-1">
              {gameState?.deckCount || gameState?.deck?.length || 0} cards left
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
                      key={`player-card-${index}-${card.type}-${card.value}`}
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
                      onClick={() => isPlayable && playCard && playCard(index)}
                      style={{
                        transformOrigin: 'bottom center',
                        marginRight: isSmallScreen ? '4px' : '0',
                        width: isSmallScreen ? '55px' : undefined,
                        position: isSmallScreen ? 'relative' : 'absolute',
                        left: isSmallScreen ? 'auto' : '50%',
                      }}
                    >
                      <WhotCard card={card} />
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
