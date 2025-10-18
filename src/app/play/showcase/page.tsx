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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
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
import Sidebar from '../helper/sidebar'

// Types
interface ICard {
  type: string
  value: number
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

// 2D Card component
function Card2D({
  card,
  faceDown = false,
  onClick = () => {},
  isPlayable = false,
  className = '',
  style = {},
}: {
  card: ICard
  faceDown?: boolean
  onClick?: () => void
  isPlayable?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const [hovered, setHovered] = useState(false)

  // Generate SVG for card
  const svgContent = useMemo(() => {
    if (faceDown) {
      return generateCardBack()
    } else {
      return generateWhotCards({
        cardType: card.type as
          | 'circle'
          | 'square'
          | 'triangle'
          | 'cross'
          | 'star'
          | 'whot',
        cardNumber: card.value,
      })
    }
  }, [card, faceDown])

  return (
    <motion.div
      className={cn(
        'relative cursor-pointer transition-all duration-200',
        isPlayable && 'hover:-translate-y-4',
        className
      )}
      style={style}
      whileHover={isPlayable ? { scale: 1.05 } : {}}
      whileTap={isPlayable ? { scale: 0.98 } : {}}
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <div
        className="card-container"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />

      {isPlayable && hovered && (
        <div className="absolute inset-0 bg-primary/10 rounded-lg border-2 border-primary" />
      )}
    </motion.div>
  )
}

// Card Deck component
function CardDeck({
  cards,
  faceDown = false,
  spread = 'fan',
  onClick = () => {},
  isPlayable = false,
  className = '',
}: {
  cards: ICard[]
  faceDown?: boolean
  spread?: 'fan' | 'stack' | 'grid'
  onClick?: (index: number) => void
  isPlayable?: boolean
  className?: string
}) {
  // Calculate positions based on spread type
  const getCardStyle = (index: number, total: number) => {
    let style: React.CSSProperties = {}

    if (spread === 'fan') {
      // Fan layout - cards spread in an arc
      const fanWidth = Math.min(total * 30, 400)
      const offset = (index - (total - 1) / 2) * (fanWidth / total)
      const rotation = (index - (total - 1) / 2) * 5

      style = {
        transform: `translateX(${offset}px) rotate(${rotation}deg)`,
        zIndex: index,
      }
    } else if (spread === 'stack') {
      // Stack layout - cards stacked with slight offset
      style = {
        transform: `translateX(${index * 2}px) translateY(${index * 2}px)`,
        zIndex: index,
      }
    } else if (spread === 'grid') {
      // Grid layout
      style = {
        position: 'relative',
        transform: 'none',
        margin: '5px',
      }
    }

    return style
  }

  return (
    <div className={cn('relative flex justify-center items-center', className)}>
      {spread === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {cards.map((card, index) => (
            <Card2D
              key={`card-${index}`}
              card={card}
              faceDown={faceDown}
              onClick={() => onClick(index)}
              isPlayable={isPlayable}
              style={getCardStyle(index, cards.length)}
            />
          ))}
        </div>
      ) : (
        <div className="relative h-80 w-full">
          {cards.map((card, index) => (
            <Card2D
              key={`card-${index}`}
              card={card}
              faceDown={faceDown}
              onClick={() => onClick(index)}
              isPlayable={isPlayable}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={getCardStyle(index, cards.length)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Market Deck component
function MarketDeck({
  onClick,
  isPlayable = false,
}: {
  onClick: () => void
  isPlayable?: boolean
}) {
  return (
    <div className="relative h-80 w-60 cursor-pointer" onClick={onClick}>
      {[...Array(5)].map((_, i) => (
        <div
          key={`deck-${i}`}
          className="absolute"
          style={{
            transform: `translateX(${i * 2}px) translateY(${i * 2}px) rotate(${
              (Math.random() - 0.5) * 5
            }deg)`,
            zIndex: i,
          }}
        >
          <Card2D
            card={{ type: 'whot', value: 20 }}
            faceDown={true}
            isPlayable={isPlayable}
          />
        </div>
      ))}
    </div>
  )
}

// Game Board component
function GameBoard({
  gameState,
  onPlayCard,
  onDrawCard,
  isCardBeingPlayed,
}: {
  gameState: GameState | null
  onPlayCard: (index: number) => void
  onDrawCard: () => void
  isCardBeingPlayed: boolean
}) {
  // Create bot cards array (just for rendering)
  const botCards = useMemo(() => {
    return Array(gameState?.botHandCount || 0).fill({ type: 'whot', value: 20 })
  }, [gameState?.botHandCount])
  if (!gameState) return null
  return (
    <div className="relative w-full h-full bg-[#570000]/20 rounded-lg p-4 flex flex-col">
      {/* Bot's cards */}
      <div className="mb-4">
        <h3 className="text-white mb-2 font-semibold">Bot&rsquo;s Cards</h3>
        <CardDeck cards={botCards} faceDown={true} spread="fan" />
      </div>

      {/* Middle section with call card and market */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 my-4">
        <div className="text-center">
          <h3 className="text-white mb-2 font-semibold">Market</h3>
          <MarketDeck
            onClick={onDrawCard}
            isPlayable={gameState?.currentPlayer === 'player'}
          />
        </div>

        <div className="text-center">
          <h3 className="text-white mb-2 font-semibold">Call Card</h3>
          {gameState?.callCardPile.length > 0 ? (
            <Card2D
              card={gameState.callCardPile[gameState.callCardPile.length - 1]}
              faceDown={false}
            />
          ) : (
            <div className="w-[200px] h-[320px] border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center">
              <p className="text-white/70">No card played yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Player's cards */}
      <div className="mt-4">
        <h3 className="text-white mb-2 font-semibold">Your Cards</h3>
        <CardDeck
          cards={gameState?.playerHand || []}
          spread="fan"
          onClick={onPlayCard}
          isPlayable={gameState?.currentPlayer === 'player'}
          className={cn(
            isCardBeingPlayed ? 'pointer-events-none opacity-80' : ''
          )}
        />
      </div>
    </div>
  )
}

// Game timer component
function GameTimer({ time }: { time: number }) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className="flex items-center justify-center bg-[#3D0000] text-white text-2xl font-bold rounded-md p-2 w-full">
      <Clock className="mr-2 h-5 w-5" />
      {formatTime(time)}
    </div>
  )
}

// Game statistics component
function GameStats({ gameState }: { gameState: GameState | null }) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Game Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between">
          <span>Cards in deck:</span>
          <span className="font-bold">{gameState?.deck.length || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Your cards:</span>
          <span className="font-bold">{gameState?.playerHand.length || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Bot cards:</span>
          <span className="font-bold">{gameState?.botHandCount || 0}</span>
        </div>
        <div className="flex justify-between">
          <span>Current player:</span>
          <Badge
            variant={
              gameState?.currentPlayer === 'player' ? 'default' : 'outline'
            }
          >
            {gameState?.currentPlayer === 'player' ? 'You' : 'Bot'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// Player profile component
function PlayerProfile() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Profile</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src="/placeholder.svg?height=40&width=40" />
            <AvatarFallback>P1</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">Player 1</p>
            <p className="text-sm text-muted-foreground">Level 5</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Experience</span>
            <span>450/1000</span>
          </div>
          <Progress value={45} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-md bg-muted p-2">
            <p className="text-xl font-bold">12</p>
            <p className="text-xs text-muted-foreground">Wins</p>
          </div>
          <div className="rounded-md bg-muted p-2">
            <p className="text-xl font-bold">8</p>
            <p className="text-xs text-muted-foreground">Losses</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Game options component
function GameOptions({ onStartGame }: { onStartGame: () => void }) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Game Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                <span>10 min</span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Time Control</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>5 min</DropdownMenuItem>
            <DropdownMenuItem>10 min</DropdownMenuItem>
            <DropdownMenuItem>15 min</DropdownMenuItem>
            <DropdownMenuItem>30 min</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>Custom</span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Game Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Standard Rules</DropdownMenuItem>
            <DropdownMenuItem>Advanced Rules</DropdownMenuItem>
            <DropdownMenuItem>Tournament Rules</DropdownMenuItem>
            <DropdownMenuItem>Custom Rules</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          className="w-full bg-[#570000] hover:bg-[#3D0000]"
          onClick={onStartGame}
        >
          Play
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="flex items-center justify-center"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            <span>Play a Friend</span>
          </Button>
          <Button
            variant="outline"
            className="flex items-center justify-center"
          >
            <Trophy className="mr-2 h-4 w-4" />
            <span>Tournaments</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Shape selector component
function ShapeSelector({
  onSelectShape,
  show,
}: {
  onSelectShape: (shape: string) => void
  show: boolean
}) {
  if (!show) return null

  const shapes = ['circle', 'triangle', 'cross', 'square', 'star']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
        className="bg-white p-6 rounded-lg shadow-xl"
      >
        <h3 className="text-lg font-bold mb-4 text-[#570000]">
          Select a shape:
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {shapes.map((shape) => (
            <motion.button
              key={shape}
              onClick={() => onSelectShape(shape)}
              className="bg-[#570000] text-white px-4 py-2 rounded capitalize hover:bg-[#3D0000]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {shape}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Main component
export default function Game2DPage() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [showShapeSelector, setShowShapeSelector] = useState(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(
    null
  )
  const [isCardBeingPlayed, setIsCardBeingPlayed] = useState(false)
  const [gameTime, setGameTime] = useState(600) // 10 minutes in seconds
  const { toast } = useToast()

  // Generate a unique game ID
  const gameId = 'game-123'

  const agent = useAgent({
    agent: 'whot-game-agent',
    name: gameId,
    host: 'http://localhost:8787',
    onOpen: () => {
      console.log('Connected to Whot game')
      setIsConnected(true)
    },
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'gameState') {
          setGameState(data.state)
        } else if (data.type === 'error') {
          console.error('Game error:', data.message)
          toast({
            title: 'Game Error',
            description: data.message,
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    },
    onClose: () => {
      setIsConnected(false)
    },
  })

  // Handler for starting a new game
  const startGame = () => {
    agent.send(JSON.stringify({ action: 'start_game' }))
    setGameTime(600) // Reset timer to 10 minutes
  }

  // Handler for playing a card
  const playCard = (cardIndex: number) => {
    if (gameState?.currentPlayer !== 'player') return

    const card = gameState?.playerHand[cardIndex]

    // If it's a Whot card, prompt for shape selection
    if (card?.value === 20) {
      setShowShapeSelector(true)
      setSelectedCardIndex(cardIndex)
      return
    }

    // Animate card being played
    setIsCardBeingPlayed(true)

    // Send play action after animation delay
    setTimeout(() => {
      agent.send(
        JSON.stringify({
          action: 'play_card',
          cardIndex,
        })
      )
      setIsCardBeingPlayed(false)
    }, 800)
  }

  // Function to handle shape selection
  const selectShape = (shape: string) => {
    if (selectedCardIndex === null) return

    // Animate card being played
    setIsCardBeingPlayed(true)

    // Send play action after animation delay
    setTimeout(() => {
      agent.send(
        JSON.stringify({
          action: 'play_card',
          cardIndex: selectedCardIndex,
          whotChoosenShape: shape,
        })
      )
      setIsCardBeingPlayed(false)
      setShowShapeSelector(false)
      setSelectedCardIndex(null)
    }, 800)
  }

  // Handler for drawing a card
  const drawCard = () => {
    if (gameState?.currentPlayer === 'player') {
      agent.send(JSON.stringify({ action: 'draw_card' }))
    }
  }

  // Game timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (gameState?.gameStatus === 'playing' && gameTime > 0) {
      interval = setInterval(() => {
        setGameTime((prev) => prev - 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [gameState?.gameStatus, gameTime])

  // Sample player hand for preview
  const samplePlayerHand: ICard[] = [
    { type: 'circle', value: 1 },
    { type: 'square', value: 5 },
    { type: 'triangle', value: 7 },
    { type: 'cross', value: 2 },
    { type: 'star', value: 10 },
    { type: 'whot', value: 20 },
  ]

  // Sample game state for preview
  const previewGameState: GameState = gameState || {
    gameId: 'preview',
    deck: Array(20).fill({ type: 'whot', value: 20 }),
    playerHand: samplePlayerHand,
    botHand: [],
    callCardPile: [{ type: 'circle', value: 3 }],
    currentPlayer: 'player',
    gameStatus: 'playing',
    botHandCount: 5,
  }

  return (
    <div className="overflow-y-auto bg-gradient-to-b from-[#FFA7A6] to-[#FF8585]">
      {/* Header */}
      <div className="bg-[#570000] text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">Whot Game</h1>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-white">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white">
            <Settings className="h-5 w-5" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg?height=32&width=32" />
            <AvatarFallback>P1</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Game area - takes 2/3 of screen on desktop, full width on mobile */}
          <div className="lg:col-span-2 bg-[#3D0000]/10 rounded-lg overflow-hidden">
            <div className="relative" style={{ minHeight: '70vh' }}>
              {/* Game status indicators */}
              <AnimatePresence>
                {gameState?.currentPlayer && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-[#570000] text-white px-4 py-2 rounded-full"
                  >
                    {gameState.currentPlayer === 'player'
                      ? 'Your Turn'
                      : 'Bot is thinking...'}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Game Board */}
              <GameBoard
                gameState={previewGameState}
                onPlayCard={playCard}
                onDrawCard={drawCard}
                isCardBeingPlayed={isCardBeingPlayed}
              />

              {/* Loading and waiting states */}
              <AnimatePresence>
                {!isConnected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <div className="bg-white p-6 rounded-lg text-[#570000]">
                      Connecting to game server...
                    </div>
                  </motion.div>
                )}

                {isConnected && gameState?.gameStatus === 'waiting' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <div className="bg-white p-8 rounded-lg text-center">
                      <h2 className="text-2xl font-bold text-[#570000] mb-4">
                        Welcome to Whot!
                      </h2>
                      <p className="text-[#570000] mb-6">Ready to play?</p>
                      <Button
                        className="bg-[#570000] hover:bg-[#3D0000] text-white"
                        onClick={startGame}
                      >
                        Start New Game
                      </Button>
                    </div>
                  </motion.div>
                )}

                {gameState?.gameStatus === 'finished' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <div className="bg-white p-8 rounded-lg text-center">
                      <h2 className="text-2xl font-bold text-[#570000] mb-4">
                        Game Over!
                      </h2>
                      <p className="text-[#570000] text-xl mb-6">
                        {gameState.winner === 'player'
                          ? 'You Win!'
                          : 'Bot Wins!'}
                      </p>
                      <Button
                        className="bg-[#570000] hover:bg-[#3D0000] text-white"
                        onClick={startGame}
                      >
                        Play Again
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Shape selector */}
              <AnimatePresence>
                {showShapeSelector && (
                  <ShapeSelector
                    onSelectShape={selectShape}
                    show={showShapeSelector}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Game controls and info - takes 1/3 of screen on desktop, full width on mobile */}
          <Sidebar>
            <div className="space-y-4">
              {/* Timer */}
              <GameTimer time={gameTime} />

              {/* Tabs for different sections */}
              <Tabs defaultValue="game" className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="game">Game</TabsTrigger>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="game" className="space-y-4 mt-4">
                  <GameOptions onStartGame={startGame} />

                  <Card className="w-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          New Game
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start"
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Chat
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start"
                        >
                          <History className="mr-2 h-4 w-4" size="sm" />
                          History
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Players
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="profile" className="space-y-4 mt-4">
                  <PlayerProfile />
                </TabsContent>

                <TabsContent value="stats" className="space-y-4 mt-4">
                  <GameStats gameState={previewGameState} />

                  <Card className="w-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Game History</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center py-2 border-b">
                        <div className="flex items-center">
                          <Badge className="mr-2" variant="outline">
                            Win
                          </Badge>
                          <span>vs Bot</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          2 hours ago
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <div className="flex items-center">
                          <Badge className="mr-2" variant="destructive">
                            Loss
                          </Badge>
                          <span>vs Bot</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Yesterday
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <div className="flex items-center">
                          <Badge className="mr-2" variant="outline">
                            Win
                          </Badge>
                          <span>vs Bot</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          3 days ago
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Online players */}
              <Card className="w-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Online Players</CardTitle>
                    <Badge variant="outline" className="ml-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                      1,245
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">John Doe</p>
                        <p className="text-xs text-muted-foreground">Level 8</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback>AS</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">Alice Smith</p>
                        <p className="text-xs text-muted-foreground">
                          Level 12
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Sidebar>
        </div>
      </div>
    </div>
  )
}
