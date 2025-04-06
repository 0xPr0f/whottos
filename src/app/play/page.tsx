'use client'
import type React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { useAgent } from 'agents/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  RefreshCw,
  Clock,
  Users,
  Trophy,
  Settings,
  ChevronDown,
  UserPlus,
  HelpCircle,
  MessageSquare,
  History,
  Award,
} from 'lucide-react'
import { Bot, Zap, Dice1Icon as Dice } from 'lucide-react'

import { toast, useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  generateCardBack,
  generateWhotCards,
} from '@/components/whot-card/card-svg-generation/generate-cards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import Sidebar from './helper/sidebar'
import Link from 'next/link'

// Types

interface ICard {
  type: 'whot' | 'circle' | 'triangle' | 'cross' | 'square' | 'star'
  value: number
  whotChoosenShape?: 'circle' | 'triangle' | 'cross' | 'square' | 'star' | null
}

interface GameState {
  gameId: string
  deck: ICard[]
  playerHand: ICard[]
  botHand: ICard[]
  callCardPile: ICard[]
  currentPlayer: 'player' | 'bot'
  gameStatus: 'waiting' | 'playing' | 'finished'
  botHandCount?: number
  winner?: 'player' | 'bot'
  lastAction?: {
    player: 'player' | 'bot'
    action: 'play' | 'draw' | 'pass'
    card?: ICard
  }
}

// Main component
export default function GamePage() {
  const [gameState, setGameState] = useState({
    //Mock
    playerHand: [] as ICard[],
    botHand: [] as ICard[],
    marketDeck: [] as ICard[],
    discardPile: [] as ICard[],
    currentPlayer: 'player', // 'player' or 'bot'
    gameStatus: 'idle', // 'idle', 'playing', 'finished'
    winner: null as 'player' | 'bot' | null,
    lastAction: null as string | null,
  })

  /*
  const [gameState, setGameState] = useState<GameState | null>(null)

  const [isConnected, setIsConnected] = useState(false)
  const [isBotThinking, setIsBotThinking] = useState(false)
  const [showShapeSelector, setShowShapeSelector] = useState(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(
    null
  )
  const [lastPlayedCard, setLastPlayedCard] = useState<ICard | null>(null)
  const [isCardBeingPlayed, setIsCardBeingPlayed] = useState(false)
  const [gameTime, setGameTime] = useState(600) // 10 minutes in seconds
*/
  const [cards, setCards] = useState<ICard[] | null>()
  const { toast } = useToast()

  // Function to create a deck of cards
  const createDeck = () => {
    const deck: ICard[] = []

    // Add numbered cards for each shape
    for (const type of [
      'circle',
      'triangle',
      'cross',
      'square',
      'star',
    ] as const) {
      for (const value of [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]) {
        deck.push({ type, value, whotChoosenShape: null })
      }
    }

    // Add whot cards
    for (let i = 0; i < 5; i++) {
      deck.push({ type: 'whot', value: 20, whotChoosenShape: null })
    }

    return deck
  }

  // Function to shuffle a deck of cards
  const shuffleDeck = (deck: ICard[]) => {
    const shuffled = [...deck]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  useEffect(() => {
    // Create and shuffle the deck
    const newDeck = createDeck()
    const shuffledDeck = shuffleDeck(newDeck)

    // Set the cards state
    setCards(shuffledDeck)

    // Deal cards to players and set up initial game state
    const playerHand = shuffledDeck.slice(0, 5)
    const botHand = shuffledDeck.slice(5, 10)
    const firstCard = [shuffledDeck[10]]
    const marketDeck = shuffledDeck.slice(11)

    setGameState({
      playerHand,
      botHand,
      marketDeck,
      discardPile: firstCard,
      currentPlayer: 'player',
      gameStatus: 'playing',
      winner: null,
      lastAction: null,
    })
  }, [])
  return (
    <div className="min-h-fit h-full bg-gradient-to-b from-[#FFA7A6] overflow-auto to-[#FF8585]">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ">
          {/* Game area - takes 2/3 of screen on desktop, full width on mobile */}
          <div className="lg:col-span-2 bg-white h-fit rounded-lg overflow-hidden hidden md:block lg:block">
            <div
              className="relative"
              style={{ minHeight: '90vh', maxHeight: '843px' }}
            >
              {/* Bot's cards (face down) */}
              <div className="absolute top-4 md:top-6 lg:top-8 left-0 right-0 flex flex-col items-center">
                <div className="mb-2 md:mb-4 lg:mb-6">
                  <span className="bg-white/80 px-2 py-1 md:px-3 md:py-1.5 lg:px-4 lg:py-2 rounded-md text-xs md:text-sm lg:text-base font-semibold">
                    Computer
                  </span>
                </div>
                <div className="flex space-x-[-15px] md:space-x-[-20px] xl:space-x-[-25px]">
                  {gameState.botHand.map((_, index) => (
                    <div
                      key={`bot-card-${index}`}
                      className="w-14 h-20 md:w-16 md:h-22 lg:w-16 xl:w-20 xl:h-28 transform rotate-180"
                    >
                      {generateCardBack()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Discard pile / Call card */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                {gameState.discardPile.length > 0 && (
                  <div className="w-14 h-20 md:w-18 md:h-24 lg:w-20 lg:h-28 xl:w-24 xl:h-32">
                    {generateWhotCards({
                      cardType: gameState.discardPile[0].type,
                      cardNumber: gameState.discardPile[0].value,
                    })}
                  </div>
                )}
              </div>

              {/* Market deck - now positioned to the right of the call card */}
              <div className="absolute top-1/2 right-4 md:right-8 lg:right-16 xl:right-24 transform -translate-y-1/2">
                <div className="w-14 h-20 md:w-18 md:h-24 lg:w-20 lg:h-28 xl:w-24 xl:h-32 bg-[#570000] rounded-lg relative">
                  {generateCardBack()}
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xs md:text-sm lg:text-base xl:text-lg font-bold">
                    {gameState.marketDeck.length}
                  </span>
                </div>
              </div>

              {/* Player's cards (face up) */}
              <div className="absolute bottom-4 md:bottom-6 lg:bottom-8 left-0 right-0 flex flex-col items-center">
                <div className="w-full px-2 py-2">
                  <div className="flex justify-center">
                    <div className="flex space-x-2 md:space-x-3 lg:space-x-4 max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw]">
                      {gameState.playerHand.map((card, index) => (
                        <motion.div
                          key={`player-card-${index}`}
                          className="w-14 h-20 md:w-18 md:h-24 lg:w-20 lg:h-28 xl:w-24 xl:h-32 rounded-lg cursor-pointer shrink-0"
                          initial={{ rotateY: 180 }}
                          whileHover={{ rotateY: 0, y: -16, zIndex: 10 }}
                          transition={{ duration: 0.5 }}
                          style={{
                            transformStyle: 'preserve-3d',
                            perspective: '1000px',
                          }}
                        >
                          <div
                            className="absolute w-full h-full flex items-center justify-center"
                            style={{
                              backfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)',
                              zIndex: 1,
                            }}
                          >
                            {generateCardBack()}
                          </div>

                          <div
                            className="absolute w-full h-full flex items-center justify-center"
                            style={{
                              backfaceVisibility: 'hidden',
                              transform: 'rotateY(0deg)',
                              zIndex: 2,
                            }}
                          >
                            {generateWhotCards({
                              cardType: card.type,
                              cardNumber: card.value,
                            })}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-2 md:mt-3 lg:mt-4">
                  <span className="bg-white/80 px-2 py-1 md:px-3 md:py-1.5 lg:px-4 lg:py-2 rounded-md text-xs md:text-sm lg:text-base font-semibold">
                    Player
                  </span>
                </div>
              </div>
              {/* Game status */}
              <div className="absolute top-2 md:top-3 lg:top-4 right-2 md:right-3 lg:right-4 bg-white/80 p-2 md:p-3 rounded-md">
                <p className="text-xs md:text-sm lg:text-base font-bold">
                  {gameState.gameStatus === 'playing'
                    ? `Current turn: ${gameState.currentPlayer}`
                    : gameState.gameStatus}
                </p>
                {gameState.lastAction && (
                  <p className="text-xs md:text-sm">{gameState.lastAction}</p>
                )}
              </div>
            </div>
          </div>

          {/* Game controls and info - takes 1/3 of screen on desktop, full width on mobile */}
          <Sidebar
            header={
              <Card className="bg-[#570000] flex flex-row items-center justify-center text-white px-6 py-3 shadow-lg border-none">
                <div className="flex justify-center mr-4">
                  <div className="h-16 w-16 rounded-full bg-white p-2" />
                </div>
                <h2 className="text-2xl font-bold text-center">Play Whot</h2>
              </Card>
            }
          >
            <div className="lg:col-span-1 space-y-4">
              <div className="space-y-3 ">
                <Link href="/play/bot" className="block">
                  <GameOption
                    icon={<Zap size={32} />}
                    title="Quick Play"
                    description="Play vs an AI bot with standard rules"
                    onClick={() => {
                      console.log('Quick Play')
                    }}
                  />
                </Link>
                <Link href="/play/online" className="block">
                  <GameOption
                    icon={<Users size={32} />}
                    title="Play Online"
                    description="Play vs a person of similar skill"
                    onClick={() => {
                      console.log('Quick Play')
                    }}
                  />
                </Link>
                <Link href="/play/room" className="block">
                  <GameOption
                    icon={<div className="text-2xl">🤝</div>}
                    title="Play a Friend"
                    description="Invite a friend to a game of Whot"
                    onClick={() => {
                      console.log('Quick Play')
                    }}
                  />
                </Link>
                <Link href="/play/onchain/tournaments" className="block">
                  <GameOption
                    icon={<Trophy size={32} />}
                    title="Tournaments"
                    description="Join an Arena where anyone can win"
                    onClick={() => {
                      console.log('Quick Play')
                    }}
                  />
                </Link>
                <Link href="/play/variants" className="block">
                  <GameOption
                    icon={<Dice size={32} />}
                    title="Game Variants"
                    description="Find fun new ways to play Whot"
                    onClick={() => {
                      console.log('Quick Play')
                    }}
                  />
                </Link>
                <div className="flex flex-row items-center gap-2 justify-center">
                  <Button
                    variant="outline"
                    className="bg-white text-[#570000] border-[#570000] "
                  >
                    <History className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">Game</span> History
                  </Button>

                  <Button
                    variant="outline"
                    className="bg-white text-[#570000] border-[#570000] "
                  >
                    <Award className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Leaderboard
                  </Button>
                </div>
              </div>
            </div>
          </Sidebar>
        </div>
      </div>
    </div>
  )
}
const startGame = (mode: string) => {
  toast({
    title: 'Starting Game',
    description: `Starting a new ${mode} game`,
  })
  // Navigate to the game page
  window.location.href = '/game-2d'
}

const GameOption = ({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-lg p-4 flex items-center cursor-pointer shadow-md"
      onClick={onClick}
    >
      <div className="mr-4 text-[#570000]">{icon}</div>
      <div className="flex-1">
        <h3 className="font-bold text-[#570000]">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </motion.div>
  )
}
