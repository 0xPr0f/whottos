'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import WhotCard, { type CardShape, type CardValue } from './card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Coins, Zap, Users, RefreshCw, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Define card types
type Card = {
  id: string
  value: CardValue
  shape: CardShape
}

// Define player type
type Player = {
  id: string
  name: string
  cards: Card[]
  isComputer: boolean
}

// Game state type
type GameState = 'waiting' | 'playing' | 'finished'

export default function GameBoard() {
  const [gameState, setGameState] = useState<GameState>('waiting')
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [deck, setDeck] = useState<Card[]>([])
  const [callCardPile, setcallCardPile] = useState<Card[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [specialAction, setSpecialAction] = useState<string | null>(null)
  const [winner, setWinner] = useState<Player | null>(null)
  const [gameMode, setGameMode] = useState<
    'onchain' | 'offchain' | 'friends' | null
  >(null)
  const [isComputerThinking, setIsComputerThinking] = useState(false)
  const callCardPileRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Initialize the game
  const initializeGame = (mode: 'onchain' | 'offchain' | 'friends') => {
    setGameMode(mode)
    const newDeck = createDeck()
    const shuffledDeck = shuffleDeck([...newDeck])

    // Create players based on game mode
    const gamePlayers: Player[] = [
      { id: 'player1', name: 'You', cards: [], isComputer: false },
    ]

    if (mode === 'friends') {
      gamePlayers.push({
        id: 'player2',
        name: 'Friend',
        cards: [],
        isComputer: false,
      })
    } else {
      gamePlayers.push({
        id: 'computer',
        name: 'Computer',
        cards: [],
        isComputer: true,
      })
    }

    // Deal cards to players (7 each)
    gamePlayers.forEach((player) => {
      player.cards = shuffledDeck.splice(0, 7)
    })

    // Set up initial discard pile
    const initialCard = shuffledDeck.splice(0, 1)[0]

    setPlayers(gamePlayers)
    setDeck(shuffledDeck)
    setcallCardPile([initialCard])
    setCurrentPlayerIndex(0)
    setGameState('playing')
    setWinner(null)
    setSpecialAction(null)
  }

  // Create a standard Whot deck
  const createDeck = (): Card[] => {
    const deck: Card[] = []
    const shapes: CardShape[] = [
      'circle',
      'triangle',
      'square',
      'star',
      'cross',
    ]

    // Add numbered cards for each shape (except whot)
    shapes.forEach((shape) => {
      for (let i = 1; i <= 14; i++) {
        deck.push({
          id: `${shape}-${i}-${Math.random().toString(36).substring(2, 9)}`,
          value: i as CardValue,
          shape,
        })
      }
    })

    // Add whot cards
    for (let i = 0; i < 5; i++) {
      deck.push({
        id: `whot-${i}-${Math.random().toString(36).substring(2, 9)}`,
        value: 20 as CardValue,
        shape: 'whot',
      })
    }

    return deck
  }

  // Shuffle the deck
  const shuffleDeck = (deck: Card[]): Card[] => {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
    return deck
  }

  // Check if a card is playable
  const isCardPlayable = (card: Card): boolean => {
    if (specialAction) return false

    const topCard = callCardPile[callCardPile.length - 1]

    // Whot cards can always be played
    if (card.shape === 'whot') return true

    // Match by shape or value
    return card.shape === topCard.shape || card.value === topCard.value
  }

  // Handle card selection
  const handleCardSelect = (cardId: string) => {
    if (gameState !== 'playing' || currentPlayerIndex !== 0) return

    setSelectedCardId(cardId)
  }

  // Handle card play
  const playCard = (cardId: string) => {
    if (gameState !== 'playing' || currentPlayerIndex !== 0) return

    const currentPlayer = players[currentPlayerIndex]
    const cardIndex = currentPlayer.cards.findIndex(
      (card) => card.id === cardId
    )

    if (cardIndex === -1) return

    const card = currentPlayer.cards[cardIndex]

    if (!isCardPlayable(card)) {
      toast({
        title: 'Invalid move',
        description: 'This card cannot be played now',
        variant: 'destructive',
      })
      return
    }

    // Remove card from player's hand
    const updatedPlayers = [...players]
    const playedCard = updatedPlayers[currentPlayerIndex].cards.splice(
      cardIndex,
      1
    )[0]

    // Add card to discard pile with animation
    setcallCardPile((prev) => [...prev, playedCard])

    // Check for win condition
    if (updatedPlayers[currentPlayerIndex].cards.length === 0) {
      setWinner(updatedPlayers[currentPlayerIndex])
      setGameState('finished')
      return
    }

    // Handle special cards
    handleSpecialCard(playedCard)

    setPlayers(updatedPlayers)
    setSelectedCardId(null)

    // Move to next player if no special action is pending
    if (!specialAction) {
      const nextPlayerIndex = (currentPlayerIndex + 1) % players.length
      setCurrentPlayerIndex(nextPlayerIndex)

      // If next player is computer, trigger its turn
      if (players[nextPlayerIndex].isComputer) {
        setTimeout(() => computerTurn(), 1000)
      }
    }
  }

  // Handle drawing a card
  const drawCard = () => {
    if (gameState !== 'playing' || specialAction) return

    const updatedPlayers = [...players]
    let updatedDeck = [...deck]

    // If deck is empty, reshuffle discard pile except top card
    if (updatedDeck.length === 0) {
      const topCard = callCardPile[callCardPile.length - 1]
      updatedDeck = shuffleDeck([...callCardPile.slice(0, -1)])
      setcallCardPile([topCard])
      toast({
        title: 'Deck reshuffled',
        description: 'The discard pile has been reshuffled into the deck',
      })
    }

    // Draw a card
    const drawnCard = updatedDeck.pop()

    if (drawnCard) {
      updatedPlayers[currentPlayerIndex].cards.push(drawnCard)

      setPlayers(updatedPlayers)
      setDeck(updatedDeck)

      // Check if drawn card is playable
      if (isCardPlayable(drawnCard)) {
        toast({
          title: 'Card drawn',
          description: 'You can play this card now if you want',
        })
        return
      }

      // Move to next player
      const nextPlayerIndex = (currentPlayerIndex + 1) % players.length
      setCurrentPlayerIndex(nextPlayerIndex)

      // If next player is computer, trigger its turn
      if (players[nextPlayerIndex].isComputer) {
        setTimeout(() => computerTurn(), 1000)
      }
    }
  }

  // Handle special card effects
  const handleSpecialCard = (card: Card) => {
    // Implement special card rules based on Whot game
    if (card.value === 1) {
      // Hold on: Next player misses a turn
      setSpecialAction('hold')
      toast({
        title: 'Hold on!',
        description: 'Next player misses a turn',
      })
      setTimeout(() => {
        setSpecialAction(null)
        const nextPlayerIndex = (currentPlayerIndex + 2) % players.length
        setCurrentPlayerIndex(nextPlayerIndex)

        if (players[nextPlayerIndex].isComputer) {
          setTimeout(() => computerTurn(), 1000)
        }
      }, 1500)
    } else if (card.value === 2) {
      // Pick two: Next player picks two cards
      setSpecialAction('pick2')
      toast({
        title: 'Pick Two!',
        description: 'Next player must pick two cards',
      })
      setTimeout(() => {
        const nextPlayerIndex = (currentPlayerIndex + 1) % players.length
        const updatedPlayers = [...players]
        let updatedDeck = [...deck]

        // Draw two cards for next player
        for (let i = 0; i < 2; i++) {
          if (updatedDeck.length === 0) {
            // Reshuffle if needed
            const topCard = callCardPile[callCardPile.length - 1]
            updatedDeck = shuffleDeck([...callCardPile.slice(0, -1)])
            setcallCardPile([topCard])
          }

          if (updatedDeck.length > 0) {
            const drawnCard = updatedDeck.pop()
            if (drawnCard) {
              updatedPlayers[nextPlayerIndex].cards.push(drawnCard)
            }
          }
        }

        setPlayers(updatedPlayers)
        setDeck(updatedDeck)
        setSpecialAction(null)
        setCurrentPlayerIndex(nextPlayerIndex)

        if (players[nextPlayerIndex].isComputer) {
          setTimeout(() => computerTurn(), 1000)
        }
      }, 1500)
    } else if (card.value === 5) {
      // Pick three: Next player picks three cards
      setSpecialAction('pick3')
      toast({
        title: 'Pick Three!',
        description: 'Next player must pick three cards',
      })
      setTimeout(() => {
        const nextPlayerIndex = (currentPlayerIndex + 1) % players.length
        const updatedPlayers = [...players]
        let updatedDeck = [...deck]

        // Draw three cards for next player
        for (let i = 0; i < 3; i++) {
          if (updatedDeck.length === 0) {
            // Reshuffle if needed
            const topCard = callCardPile[callCardPile.length - 1]
            updatedDeck = shuffleDeck([...callCardPile.slice(0, -1)])
            setcallCardPile([topCard])
          }

          if (updatedDeck.length > 0) {
            const drawnCard = updatedDeck.pop()
            if (drawnCard) {
              updatedPlayers[nextPlayerIndex].cards.push(drawnCard)
            }
          }
        }

        setPlayers(updatedPlayers)
        setDeck(updatedDeck)
        setSpecialAction(null)
        setCurrentPlayerIndex(nextPlayerIndex)

        if (players[nextPlayerIndex].isComputer) {
          setTimeout(() => computerTurn(), 1000)
        }
      }, 1500)
    } else if (card.value === 14) {
      // General Market: All other players pick one card
      setSpecialAction('general')
      toast({
        title: 'General Market!',
        description: 'All other players pick one card',
      })
      setTimeout(() => {
        const updatedPlayers = [...players]
        let updatedDeck = [...deck]

        // Each player except current draws a card
        players.forEach((player, index) => {
          if (index !== currentPlayerIndex) {
            if (updatedDeck.length === 0) {
              // Reshuffle if needed
              const topCard = callCardPile[callCardPile.length - 1]
              updatedDeck = shuffleDeck([...callCardPile.slice(0, -1)])
              setcallCardPile([topCard])
            }

            if (updatedDeck.length > 0) {
              const drawnCard = updatedDeck.pop()
              if (drawnCard) {
                updatedPlayers[index].cards.push(drawnCard)
              }
            }
          }
        })

        setPlayers(updatedPlayers)
        setDeck(updatedDeck)
        setSpecialAction(null)

        const nextPlayerIndex = (currentPlayerIndex + 1) % players.length
        setCurrentPlayerIndex(nextPlayerIndex)

        if (players[nextPlayerIndex].isComputer) {
          setTimeout(() => computerTurn(), 1000)
        }
      }, 1500)
    } else if (card.shape === 'whot') {
      // Whot card: Player can choose any shape
      setSpecialAction('whot')
      // For simplicity, we'll just choose a random shape for now
      const shapes: CardShape[] = [
        'circle',
        'triangle',
        'square',
        'star',
        'cross',
      ]
      const chosenShape = shapes[Math.floor(Math.random() * shapes.length)]

      toast({
        title: 'Whot!',
        description: `You chose ${chosenShape}`,
      })

      setTimeout(() => {
        setSpecialAction(null)
        const nextPlayerIndex = (currentPlayerIndex + 1) % players.length
        setCurrentPlayerIndex(nextPlayerIndex)

        if (players[nextPlayerIndex].isComputer) {
          setTimeout(() => computerTurn(), 1000)
        }
      }, 1500)
    }
  }

  // Computer's turn logic
  const computerTurn = () => {
    if (gameState !== 'playing' || !players[currentPlayerIndex].isComputer)
      return

    setIsComputerThinking(true)

    setTimeout(() => {
      const computerPlayer = players[currentPlayerIndex]
      const playableCards = computerPlayer.cards.filter((card) =>
        isCardPlayable(card)
      )

      if (playableCards.length > 0) {
        // Play a random playable card
        const cardToPlay =
          playableCards[Math.floor(Math.random() * playableCards.length)]
        playCard(cardToPlay.id)
      } else {
        // Draw a card
        drawCard()
      }

      setIsComputerThinking(false)
    }, 1500)
  }

  // Reset the game
  const resetGame = () => {
    setGameState('waiting')
    setPlayers([])
    setDeck([])
    setcallCardPile([])
    setCurrentPlayerIndex(0)
    setSelectedCardId(null)
    setSpecialAction(null)
    setWinner(null)
    setGameMode(null)
  }

  // Render game board based on state
  if (gameState === 'waiting') {
    return (
      <div className="min-h-screen bg-[#FFA7A6] flex flex-col items-center justify-center p-4">
        <motion.div
          className="bg-white rounded-xl p-8 shadow-2xl max-w-2xl w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-[#570000] text-center mb-8">
            Play Whot Card Game
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Button
              size="lg"
              className="bg-white hover:bg-[#570000] text-[#570000] hover:text-white font-bold text-lg py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 group border-2 border-[#570000]"
              onClick={() => initializeGame('onchain')}
            >
              <Coins className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-12 text-[#570000] group-hover:text-white" />
              <span>Play Onchain</span>
            </Button>

            <Button
              size="lg"
              className="bg-white hover:bg-[#570000] text-[#570000] hover:text-white font-bold text-lg py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 group border-2 border-[#570000]"
              onClick={() => initializeGame('offchain')}
            >
              <Zap className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-12 text-[#570000] group-hover:text-white" />
              <span>Play Offchain</span>
            </Button>

            <Button
              size="lg"
              className="bg-[#FFA7A6] hover:bg-[#570000] text-[#570000] hover:text-white font-bold text-lg py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 group md:col-span-2 border-2 border-[#570000]"
              onClick={() => initializeGame('friends')}
            >
              <Users className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:rotate-12 text-[#570000] group-hover:text-white" />
              <span>Play With Friends</span>
            </Button>
          </div>

          <div className="text-center text-[#570000]/70">
            <p>Choose a game mode to start playing!</p>
          </div>
        </motion.div>
      </div>
    )
  }

  if (gameState === 'finished') {
    return (
      <div className="min-h-screen bg-[#FFA7A6] flex flex-col items-center justify-center p-4">
        <motion.div
          className="bg-white rounded-xl p-8 shadow-2xl max-w-2xl w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-[#570000] text-center mb-4">
            Game Over!
          </h1>

          <div className="text-center mb-8">
            <p className="text-xl text-[#570000]">
              {winner?.name === 'You'
                ? 'Congratulations! You won!'
                : `${winner?.name} won the game!`}
            </p>
          </div>

          <Button
            size="lg"
            className="w-full bg-[#570000] hover:text-white text-[#3D0000] hover:bg-[#3D0000] font-bold text-lg py-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            onClick={resetGame}
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            <span>Play Again</span>
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-[#FFA7A6] flex flex-col">
      {/* Game info */}
      <div className="bg-[#570000] text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Whot Game</h2>
          <p className="text-sm opacity-80">
            {gameMode === 'onchain'
              ? 'Onchain Mode'
              : gameMode === 'offchain'
              ? 'Offchain Mode'
              : 'Friend Mode'}
          </p>
        </div>

        <div className="flex items-center">
          <span className="mr-4 hidden sm:inline">
            Cards in deck: {deck.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-white hover:text-white text-[#3D0000] bg-white hover:bg-[#570000]"
            onClick={resetGame}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Game board */}
      <div className="flex-1 flex flex-col p-4">
        {/* Opponent's cards */}
        <div className="mb-8">
          <h3 className="text-[#570000] font-bold mb-2 flex items-center">
            {players[1]?.name}'s Cards
            {currentPlayerIndex === 1 && (
              <span className="ml-2 bg-[#570000] text-white text-xs px-2 py-1 rounded-full">
                Current Turn
              </span>
            )}
            {isComputerThinking && (
              <span className="ml-2 bg-[#FFA7A6] text-[#570000] text-xs px-2 py-1 rounded-full animate-pulse">
                Thinking...
              </span>
            )}
          </h3>

          <div className="flex overflow-x-auto pb-4 gap-2">
            {players[1]?.cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="flex-shrink-0"
              >
                <WhotCard
                  id={card.id}
                  value={card.value}
                  shape={card.shape}
                  faceUp={gameMode === 'friends'}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex justify-center gap-4 sm:gap-8">
            <div className="relative h-40 w-24 sm:w-32" ref={callCardPileRef}>
              <h4 className="text-[#570000] text-xs sm:text-sm font-bold mb-1 text-center">
                Discard Pile
              </h4>
              <div className="relative h-32 w-20 sm:w-24 mx-auto">
                {callCardPile.map((card, index) => (
                  <motion.div
                    key={card.id}
                    className="absolute"
                    initial={{
                      x: index === callCardPile.length - 1 ? 300 : 0,
                      y: index === callCardPile.length - 1 ? -300 : 0,
                      rotate:
                        index === callCardPile.length - 1
                          ? Math.random() * 180 - 90
                          : 0,
                    }}
                    animate={{
                      x: 0,
                      y: 0,
                      rotate: (index - callCardPile.length + 1) * 2,
                      zIndex: index,
                    }}
                    transition={{ duration: 0.5 }}
                    style={{
                      zIndex: index,
                    }}
                  >
                    <WhotCard
                      id={card.id}
                      value={card.value}
                      shape={card.shape}
                      faceUp={true}
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <h4 className="text-[#570000] text-xs sm:text-sm font-bold mb-1 text-center">
                Draw Pile
              </h4>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={drawCard}
                className={cn(
                  'cursor-pointer',
                  (gameState !== 'playing' ||
                    currentPlayerIndex !== 0 ||
                    specialAction) &&
                    'opacity-50 pointer-events-none'
                )}
              >
                <WhotCard
                  id="deck-top"
                  value={20 as CardValue}
                  shape="whot"
                  faceUp={false}
                />
              </motion.div>
              <div className="text-center mt-2">
                <span className="text-[#570000] text-xs sm:text-sm font-bold">
                  {deck.length} cards left
                </span>
              </div>
            </div>
          </div>

          {/* Special action indicator */}
          {specialAction && (
            <motion.div
              className="bg-[#570000] text-white px-4 py-2 rounded-full mb-4 flex items-center mt-6 max-w-md text-sm sm:text-base"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span>
                {specialAction === 'hold' &&
                  'Hold on! Next player misses a turn'}
                {specialAction === 'pick2' &&
                  'Pick Two! Next player must pick two cards'}
                {specialAction === 'pick3' &&
                  'Pick Three! Next player must pick three cards'}
                {specialAction === 'general' &&
                  'General Market! All other players pick one card'}
                {specialAction === 'whot' && 'Whot! Choose a shape'}
              </span>
            </motion.div>
          )}

          <div className="text-center my-4">
            <span
              className={cn(
                'px-4 py-2 rounded-full text-white font-bold text-sm sm:text-base',
                currentPlayerIndex === 0 ? 'bg-[#570000]' : 'bg-[#3D0000]'
              )}
            >
              {currentPlayerIndex === 0
                ? 'Your Turn'
                : `${players[1]?.name}'s Turn`}
            </span>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-[#570000] font-bold mb-2 flex items-center">
            Your Cards
            {currentPlayerIndex === 0 && (
              <span className="ml-2 bg-[#570000] text-white text-xs px-2 py-1 rounded-full">
                Current Turn
              </span>
            )}
          </h3>

          <div className="flex overflow-x-auto pb-4 gap-2">
            {players[0]?.cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ y: 100, opacity: 0 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  scale: selectedCardId === card.id ? 1.1 : 1,
                  translateY: selectedCardId === card.id ? -20 : 0,
                }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="flex-shrink-0"
              >
                <WhotCard
                  id={card.id}
                  value={card.value}
                  shape={card.shape}
                  faceUp={true}
                  isPlayable={
                    currentPlayerIndex === 0 &&
                    isCardPlayable(card) &&
                    !specialAction
                  }
                  onClick={handleCardSelect}
                  className={
                    selectedCardId === card.id ? 'ring-4 ring-[#FFA7A6]' : ''
                  }
                />
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-center mt-6 gap-4">
            {selectedCardId && (
              <Button
                className="bg-[#570000] hover:bg-[#3D0000] text-white"
                onClick={() => playCard(selectedCardId)}
              >
                Play Selected Card
              </Button>
            )}

            <Button
              variant="outline"
              className="border-[#570000] text-[#570000] hover:bg-[#570000] hover:text-white"
              onClick={drawCard}
              disabled={currentPlayerIndex !== 0 || specialAction !== null}
            >
              Draw Card
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
