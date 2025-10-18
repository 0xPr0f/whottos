'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

type MemoryMode = 'solo' | 'friend' | 'bot'

type MemoryCard = {
  id: number
  symbol: string
  label: string
  flipped: boolean
  matched: boolean
}

type Turn = 'player' | 'opponent'

type Scoreboard = {
  player: number
  opponent: number
}

const CARD_LIBRARY: Array<{ symbol: string; label: string }> = [
  { symbol: '★', label: 'Star 1' },
  { symbol: '●', label: 'Circle 2' },
  { symbol: '▲', label: 'Triangle 3' },
  { symbol: '■', label: 'Square 4' },
  { symbol: '◆', label: 'Diamond 5' },
  { symbol: '✦', label: 'Whot 20' },
  { symbol: '☘', label: 'Clover 7' },
  { symbol: '✪', label: 'Shield 14' },
]

const shuffle = <T,>(items: T[]): T[] => {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const createDeck = (): MemoryCard[] =>
  shuffle(
    CARD_LIBRARY.flatMap(({ symbol, label }, index) => [
      {
        id: index * 2,
        symbol,
        label,
        flipped: false,
        matched: false,
      },
      {
        id: index * 2 + 1,
        symbol,
        label,
        flipped: false,
        matched: false,
      },
    ])
  )

const modeLabels: Record<MemoryMode, string> = {
  solo: 'Solo Challenge',
  friend: 'Hotseat Duel',
  bot: 'Play vs Bot',
}

const turnLabel: Record<Turn, string> = {
  player: 'You',
  opponent: 'Rival',
}

export function MemoryMatchGame() {
  const [mode, setMode] = useState<MemoryMode>('solo')
  const [deck, setDeck] = useState<MemoryCard[]>(() => createDeck())
  const [selected, setSelected] = useState<number[]>([])
  const [attempts, setAttempts] = useState(0)
  const [scores, setScores] = useState<Scoreboard>({ player: 0, opponent: 0 })
  const [currentTurn, setCurrentTurn] = useState<Turn>('player')
  const [message, setMessage] = useState<string>('')
  const [isResolving, setIsResolving] = useState(false)
  const pendingTurnRef = useRef<Turn>('player')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const totalPairs = useMemo(() => deck.length / 2, [deck.length])

  const resetGame = (nextMode: MemoryMode = mode) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setDeck(createDeck())
    setSelected([])
    setAttempts(0)
    setScores({ player: 0, opponent: 0 })
    setCurrentTurn('player')
    setMessage('')
    setIsResolving(false)
    pendingTurnRef.current = 'player'
    setMode(nextMode)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const finishPair = useCallback((cardIds: number[], actingTurn: Turn) => {
    setIsResolving(true)
    timeoutRef.current = setTimeout(() => {
      let didMatch = false
      let updatedDeck: MemoryCard[] = []

      setDeck((prevDeck) => {
        const [first, second] = cardIds.map((id) => prevDeck.find((card) => card.id === id)!)
        didMatch = first.symbol === second.symbol

        updatedDeck = prevDeck.map((card) => {
          if (cardIds.includes(card.id)) {
            if (didMatch) {
              return { ...card, matched: true, flipped: true }
            }
            return { ...card, flipped: false }
          }
          return card
        })

        return updatedDeck
      })

      setSelected([])
      setAttempts((prev) => prev + 1)

      if (didMatch) {
        if (mode !== 'solo') {
          setScores((prev) => ({
            ...prev,
            [actingTurn === 'player' ? 'player' : 'opponent']:
              prev[actingTurn === 'player' ? 'player' : 'opponent'] + 1,
          }))
        }
        setMessage(
          mode === 'solo'
            ? 'Nice! Keep the streak going.'
            : `${turnLabel[actingTurn]} found a match and gets another turn!`
        )
        setCurrentTurn(actingTurn)
      } else {
        const nextTurn = actingTurn === 'player' ? 'opponent' : 'player'
        setCurrentTurn(mode === 'solo' ? 'player' : nextTurn)
        setMessage(
          mode === 'solo'
            ? 'Try again! Memorize the positions and keep matching.'
            : `${turnLabel[nextTurn]}'s turn to try a match.`
        )
      }

      const hasFinished = updatedDeck.every((card) => card.matched)
      if (hasFinished) {
        if (mode === 'solo') {
          setMessage(
            attempts + 1 <= totalPairs
              ? 'Perfect memory! You cleared the board flawlessly.'
              : `Board cleared in ${attempts + 1} attempts. Can you beat your score?`
          )
        } else {
          const playerPairs = scores.player + (didMatch && actingTurn === 'player' ? 1 : 0)
          const opponentPairs = scores.opponent + (didMatch && actingTurn === 'opponent' ? 1 : 0)
          if (playerPairs === opponentPairs) {
            setMessage('All pairs found — it is a draw!')
          } else {
            const winner = playerPairs > opponentPairs ? 'You win the round!' : 'Rival wins this round.'
            setMessage(winner)
          }
        }
      }

      setIsResolving(false)
      timeoutRef.current = null
    }, 620)
  }, [attempts, mode, scores, totalPairs])

  const revealCard = useCallback((cardId: number, actingTurn: Turn) => {
    if (isResolving) return

    const card = deck.find((item) => item.id === cardId)
    if (!card || card.matched || card.flipped) {
      return
    }

    const nextSelected = [...selected, cardId]
    setDeck((prev) =>
      prev.map((item) => (item.id === cardId ? { ...item, flipped: true } : item))
    )
    setSelected(nextSelected)

    if (nextSelected.length === 1) {
      pendingTurnRef.current = actingTurn
    }

    if (nextSelected.length === 2) {
      finishPair(nextSelected, pendingTurnRef.current)
    }
  }, [deck, finishPair, isResolving, selected])

  useEffect(() => {
    if (mode !== 'bot') {
      return
    }

    if (currentTurn !== 'opponent' || isResolving || selected.length > 0) {
      return
    }

    const availableCards = deck.filter((card) => !card.matched && !card.flipped)
    if (availableCards.length < 2) {
      return
    }

    timeoutRef.current = setTimeout(() => {
      const shuffledCards = shuffle(availableCards)
      const first = shuffledCards[0]
      const second = shuffledCards[1]

      revealCard(first.id, 'opponent')

      timeoutRef.current = setTimeout(() => {
        revealCard(second.id, 'opponent')
      }, 350)
    }, 480)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [mode, currentTurn, deck, isResolving, revealCard, selected])

  const matchedPairs = useMemo(() => deck.filter((card) => card.matched).length / 2, [deck])

  return (
    <Card className="bg-[#120000]/60 border-[#3D0000] text-white">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-semibold">Memory Match</CardTitle>
            <CardDescription className="text-zinc-300">
              Flip cards to find every matching pair. {modeLabels[mode]}.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            className="border-[#3D0000] bg-[#3D0000]/30 text-white hover:bg-[#570000]"
            onClick={() => resetGame(mode)}
          >
            Reset board
          </Button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[#3D0000] bg-[#1F0000]/70 p-4">
            <p className="text-sm text-zinc-300">Mode</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['solo', 'friend', 'bot'] satisfies MemoryMode[]).map((entry) => (
                <Button
                  key={entry}
                  size="sm"
                  variant={mode === entry ? 'default' : 'outline'}
                  className={cn(
                    'border-[#3D0000] text-white hover:bg-[#570000]',
                    mode === entry ? 'bg-[#570000]' : 'bg-[#1F0000]'
                  )}
                  onClick={() => resetGame(entry)}
                >
                  {modeLabels[entry]}
                </Button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[#3D0000] bg-[#1F0000]/70 p-4">
            <p className="text-sm text-zinc-300">Progress</p>
            <p className="mt-2 text-lg font-semibold">
              {matchedPairs} / {totalPairs} pairs found
            </p>
            <p className="text-sm text-zinc-400">Attempts: {attempts}</p>
          </div>
          <div className="rounded-lg border border-[#3D0000] bg-[#1F0000]/70 p-4">
            <p className="text-sm text-zinc-300">
              {mode === 'solo' ? 'Personal best tracker' : 'Scoreboard'}
            </p>
            {mode === 'solo' ? (
              <p className="mt-2 text-sm text-zinc-200">
                Clear the board in as few attempts as possible. Perfect memory uses exactly {totalPairs} attempts.
              </p>
            ) : (
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded border border-[#3D0000] bg-[#3D0000]/30 p-2">
                  <dt className="text-zinc-300">You</dt>
                  <dd className="text-lg font-semibold">{scores.player}</dd>
                </div>
                <div className="rounded border border-[#3D0000] bg-[#3D0000]/30 p-2">
                  <dt className="text-zinc-300">{mode === 'friend' ? 'Friend' : 'Bot'}</dt>
                  <dd className="text-lg font-semibold">{scores.opponent}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-zinc-300">
            {message ||
              (mode === 'solo'
                ? 'Flip two cards to begin. Memorize each symbol and chase a perfect streak.'
                : `${turnLabel[currentTurn]}'s turn.`)}
          </p>
          {mode === 'friend' && (
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Switch
                id="friend-turn"
                checked={currentTurn === 'player'}
                onCheckedChange={(checked) => setCurrentTurn(checked ? 'player' : 'opponent')}
              />
              <label htmlFor="friend-turn" className="cursor-pointer select-none">
                Start with {currentTurn === 'player' ? 'you' : 'your friend'}
              </label>
            </div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {deck.map((card) => {
            const isActive = card.flipped || card.matched
            return (
              <button
                key={card.id}
                type="button"
                disabled={isActive || isResolving || (mode === 'bot' && currentTurn === 'opponent')}
                onClick={() => revealCard(card.id, 'player')}
                className={cn(
                  'aspect-square rounded-xl border-2 text-lg font-semibold transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-[#F28D35] focus:ring-offset-2 focus:ring-offset-[#120000]',
                  card.matched
                    ? 'border-[#F28D35] bg-[#F28D35]/20 text-[#F28D35]'
                    : card.flipped
                    ? 'border-white bg-[#3D0000] text-white scale-105'
                    : 'border-[#3D0000] bg-[#1F0000]/80 text-transparent hover:bg-[#3D0000]/60'
                )}
              >
                <span className="block text-3xl">{card.flipped || card.matched ? card.symbol : '？'}</span>
                <span className="mt-1 block text-xs text-zinc-300">
                  {(card.flipped || card.matched) && card.label}
                </span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
