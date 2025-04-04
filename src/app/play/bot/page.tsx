'use client'
import React, { useState, useEffect } from 'react'
import { useAgent } from 'agents/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, Award, Link, Zap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  generateCardBack,
  generateWhotCards,
} from '@/components/whot-card/card-svg-generation/generate-cards'
import WithSidebar from '../helper/sidebar'
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

  // Generate a unique game ID or use user ID
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

  const agent = useAgent({
    agent: 'whot-game-agent',
    name: gameId,
    host: process.env.NEXT_PUBLIC_WHOT_AGENT_HOST || 'http://localhost:8787',
    onOpen: () => {
      console.log('Connected to Whot game')
      setIsConnected(true)
    },
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
    onClose: () => {
      setIsConnected(false)
    },
  })

  const startGame = () => {
    agent.send(JSON.stringify({ action: 'start_game' }))
  }

  const playCard = (cardIndex: number) => {
    const card = gameState?.playerHand[cardIndex]

    if (card?.value === 20) {
      setShowShapeSelector(true)
      setSelectedCardIndex(cardIndex)
    } else {
      agent.send(
        JSON.stringify({
          action: 'play_card',
          cardIndex,
        })
      )
    }
  }

  // Function to handle shape selection
  const selectShape = (shape: string) => {
    // Play the Whot card with the chosen shape
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

  // Handler for drawing a card
  const drawCard = () => {
    if (gameState?.currentPlayer === 'player') {
      agent.send(JSON.stringify({ action: 'draw_card' }))
    }
  }
  useEffect(() => {
    if (gameState?.lastAction) {
      console.log(gameState.lastAction)
      if (gameState.lastAction.action === 'draw') {
        addMoveToHistory(
          gameState.lastAction.player,
          gameState.lastAction.action
        )
      } else {
        addMoveToHistory(
          gameState.lastAction.player,
          gameState.lastAction.action,
          gameState.lastAction.card
        )
      }
    }
  }, [gameState])

  const addMoveToHistory = (
    player: 'player' | 'bot',
    action: 'play' | 'draw',
    card?
  ) => {
    const newMove: MoveHistoryItem = {
      player,
      card,
      timestamp: new Date(),
      action,
    }

    setMoveHistory((prev) => [...prev, newMove])
  }

  console.log(gameState)
  return (
    <div className="overflow-y-auto bg-[#FFA7A6] flex flex-col">
      <div className="bg-[#570000] text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Whot Game</h2>
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
        <div className="flex-1 flex items-center justify-center">
          <Button
            className="bg-[#570000] hover:bg-[#3D0000] text-white"
            onClick={startGame}
          >
            Start New Game
          </Button>
        </div>
      )}

      {gameState?.gameStatus === 'playing' && (
        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 flex flex-col p-4 lg:w-2/3">
            <div className="mb-8">
              <h3 className="text-[#570000] font-bold mb-2 flex items-center">
                Bot's Cards
                {gameState.currentPlayer === 'bot' && (
                  <span className="ml-2 bg-[#570000] text-white text-xs px-2 py-1 rounded-full">
                    Current Turn
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap justify-start gap-2 max-w-[800px]">
                {Array(Math.min(gameState.botHandCount!, 6))
                  .fill(0)
                  .map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="w-[88px]"
                    >
                      <WhotCard
                        card={{ type: 'whot', value: 20 }}
                        faceDown={true}
                      />
                      {i === 5 && gameState.botHandCount! > 6 && (
                        <div className="text-[#570000] text-sm font-bold text-center mt-1">
                          +{gameState.botHandCount! - 6} more
                        </div>
                      )}
                    </motion.div>
                  ))}
              </div>
              <div
                className="text-[#570000] text-sm font-bold text-center mt-2 h-6 transition-opacity duration-300"
                style={{ opacity: isBotThinking ? 1 : 0 }}
              >
                Bot is thinking...
              </div>
            </div>
            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <h4 className="text-[#570000] text-sm font-bold mb-1">
                  Call Card
                </h4>
                <div className="relative">
                  {gameState.callCardPile
                    .slice(-3)
                    .map((card: Card, index, array) => (
                      <motion.div
                        key={index}
                        className="absolute"
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{
                          scale: 1,
                          rotate: (index - array.length + 1) * 5,
                          x: (index - array.length + 1) * 4,
                          y: (index - array.length + 1) * -2,
                        }}
                        transition={{ duration: 0.3 }}
                        style={{ zIndex: index }}
                      >
                        <div className="relative">
                          <WhotCard
                            card={card}
                            faceDown={index !== array.length - 1}
                          />
                          {index === array.length - 1 &&
                            card.type === 'whot' &&
                            card.whotChoosenShape && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-4xl text-[#570000] transform-none">
                                  {card.whotChoosenShape === 'circle' && '●'}
                                  {card.whotChoosenShape === 'triangle' && '▲'}
                                  {card.whotChoosenShape === 'cross' && '✚'}
                                  {card.whotChoosenShape === 'square' && '■'}
                                  {card.whotChoosenShape === 'star' && '★'}
                                </div>
                              </div>
                            )}
                        </div>
                      </motion.div>
                    ))}
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
                    gameState.currentPlayer !== 'player' &&
                      'opacity-50 pointer-events-none'
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
            <div>
              <h3 className="text-[#570000] font-bold mb-2 flex items-center">
                Your Cards
                {gameState.currentPlayer === 'player' && (
                  <span className="ml-2 bg-[#570000] text-white text-xs px-2 py-1 rounded-full">
                    Current Turn
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap justify-start gap-2 max-w-[800px]">
                {gameState.playerHand.map((card, index) => (
                  <motion.div
                    key={index}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    onClick={() =>
                      gameState.currentPlayer === 'player' && playCard(index)
                    }
                    className={cn(
                      'cursor-pointer transform transition-transform hover:-translate-y-2 w-[88px]',
                      gameState.currentPlayer !== 'player' &&
                        'opacity-50 pointer-events-none'
                    )}
                  >
                    <WhotCard card={card} />
                  </motion.div>
                ))}
              </div>
            </div>{' '}
          </div>

          <div className="w-full h-full lg:w-1/3 border-t lg:border-l lg:border-t-0 border-red-500">
            <MovesHistorySidebar
              moves={moveHistory}
              // onNewGame={startNewGame}
              // onRematch={rematch}
            />
          </div>
        </div>
      )}

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

      {showShapeSelector && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50"
          onClick={() => setShowShapeSelector(false)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white rounded-lg p-4 w-[90%] md:w-[400px] md:relative fixed bottom-0 md:bottom-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowShapeSelector(false)}
              className="absolute top-2 right-2 text-[#570000] hover:text-[#3D0000] cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h3 className="text-xl font-bold text-[#570000] mb-2 text-center">
              Select a shape:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-2xl">
              <button
                onClick={() => selectShape('circle')}
                className="bg-[#570000] text-white py-3 px-6 rounded-lg hover:bg-[#3D0000] transition-colors  cursor-pointer"
              >
                ●
              </button>
              <button
                onClick={() => selectShape('triangle')}
                className="bg-[#570000] text-white py-3 px-6 rounded-lg hover:bg-[#3D0000] transition-colors  cursor-pointer"
              >
                ▲
              </button>
              <button
                onClick={() => selectShape('cross')}
                className="bg-[#570000] text-white py-3 px-6 rounded-lg hover:bg-[#3D0000] transition-colors  cursor-pointer"
              >
                ✚
              </button>
              <button
                onClick={() => selectShape('square')}
                className="bg-[#570000] text-white py-3 px-6 rounded-lg hover:bg-[#3D0000] transition-colors  cursor-pointer"
              >
                ■
              </button>
              <button
                onClick={() => selectShape('star')}
                className="bg-[#570000] text-white py-3 px-6 rounded-lg hover:bg-[#3D0000] transition-colors  cursor-pointer"
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

function WhotCard({ card, faceDown }: { card: Card; faceDown?: boolean }) {
  if (!card) return null

  if (faceDown) {
    return <div className="h-32 w-20">{generateCardBack()}</div>
  }

  return (
    <div className="h-32 w-20">
      {generateWhotCards({
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
