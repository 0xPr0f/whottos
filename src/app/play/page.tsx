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
import GameSkeleton from './gameSkeleton'

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
  winner?: 'player' | 'bot' | null
  lastAction?: {
    player: 'player' | 'bot'
    action: 'play' | 'draw'
    card?: ICard
  } | null
}

// Main component
export default function GamePage() {
  const [gameState, setGameState] = useState<GameState>({
    gameId: Math.random().toString(36).substring(2, 15),
    deck: [],
    playerHand: [],
    botHand: [],
    callCardPile: [],
    currentPlayer: 'player',
    gameStatus: 'waiting',
    winner: null,
    lastAction: null,
  })

  const [cards, setCards] = useState<ICard[] | null>()
  const { toast } = useToast()

  const createDeck = () => {
    const deck: ICard[] = []

    // Circles: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14
    for (const value of [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]) {
      deck.push({ type: 'circle', value, whotChoosenShape: null })
    }

    // Triangles: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14
    for (const value of [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]) {
      deck.push({ type: 'triangle', value, whotChoosenShape: null })
    }

    // Crosses: 1, 2, 3, 5, 7, 10, 11, 13, 14
    for (const value of [1, 2, 3, 5, 7, 10, 11, 13, 14]) {
      deck.push({ type: 'cross', value, whotChoosenShape: null })
    }

    // Squares: 1, 2, 3, 5, 7, 10, 11, 13, 14
    for (const value of [1, 2, 3, 5, 7, 10, 11, 13, 14]) {
      deck.push({ type: 'square', value, whotChoosenShape: null })
    }

    // Stars: 1, 2, 3, 4, 5, 7, 8
    for (const value of [1, 2, 3, 4, 5, 7, 8]) {
      deck.push({ type: 'star', value, whotChoosenShape: null })
    }

    // 5 "Whot" cards numbered 20
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
    const remainingDeck = shuffledDeck.slice(11)

    setGameState({
      gameId: Math.random().toString(36).substring(2, 15),
      deck: remainingDeck,
      playerHand,
      botHand,
      callCardPile: firstCard,
      currentPlayer: 'player',
      gameStatus: 'playing',
      winner: null,
      lastAction: null,
    })
  }, [])

  return (
    <div className="p-2 bg-gradient-to-b h-fit min-h-full from-[#FFA7A6] overflow-y-auto to-[#FF8585]">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-2/3 h-fit w-full rounded-lg overflow-hidden hidden md:block lg:block">
          <GameSkeleton gameState={gameState} />
        </div>

        {/* Game controls and info - takes 1/3 of screen on desktop, full width on mobile */}
        <div className="w-full lg:w-1/3 h-full border-black">
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
