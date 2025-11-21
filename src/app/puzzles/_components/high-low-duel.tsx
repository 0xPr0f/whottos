'use client'

import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type DuelMode = 'bot' | 'friend'
type DuelVariant = 'highest' | 'lowest'

type DuelHand = {
  you: number[]
  rival: number[]
}

type Scoreboard = {
  you: number
  rival: number
  draws: number
}

const CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

const buildDeck = () => {
  const deck = CARD_VALUES.flatMap((value) => [value, value, value, value])
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

const drawHands = (): DuelHand => {
  const deck = buildDeck()
  const you = deck.slice(0, 5)
  const rival = deck.slice(5, 10)
  return { you, rival }
}

const formatCard = (value: number) => {
  switch (value) {
    case 11:
      return '11'
    case 12:
      return '12'
    case 13:
      return 'Whot'
    case 14:
      return 'Commander'
    default:
      return String(value)
  }
}

const cardColor = (value: number) => {
  if (value >= 13) return 'bg-accent/20 text-accent border-accent'
  if (value >= 10) return 'bg-primary/90 text-primary-foreground border-primary-foreground'
  return 'bg-secondary text-foreground/80 border-border'
}

const modeLabel: Record<DuelMode, string> = {
  bot: 'Play vs Bot',
  friend: 'Hotseat Duel',
}

const calculateScore = (hand: number[]) => hand.reduce((total, value) => total + value, 0)

export function HighLowDuel() {
  const [mode, setMode] = useState<DuelMode>('bot')
  const [variant, setVariant] = useState<DuelVariant>('highest')
  const [hand, setHand] = useState<DuelHand>(() => drawHands())
  const [scores, setScores] = useState<Scoreboard>({ you: 0, rival: 0, draws: 0 })
  const [history, setHistory] = useState<Array<{ you: number; rival: number; outcome: string }>>([])

  const yourScore = useMemo(() => calculateScore(hand.you), [hand])
  const rivalScore = useMemo(() => calculateScore(hand.rival), [hand])

  const determineOutcome = (playerScore: number, rivalTotal: number): 'you' | 'rival' | 'draw' => {
    if (variant === 'highest') {
      if (playerScore === rivalTotal) return 'draw'
      return playerScore > rivalTotal ? 'you' : 'rival'
    }

    if (playerScore === rivalTotal) return 'draw'
    return playerScore < rivalTotal ? 'you' : 'rival'
  }

  const dealNewRound = () => {
    const nextHand = drawHands()
    setHand(nextHand)

    const nextYourScore = calculateScore(nextHand.you)
    const nextRivalScore = calculateScore(nextHand.rival)
    const outcome = determineOutcome(nextYourScore, nextRivalScore)

    setScores((prev) => ({
      you: prev.you + (outcome === 'you' ? 1 : 0),
      rival: prev.rival + (outcome === 'rival' ? 1 : 0),
      draws: prev.draws + (outcome === 'draw' ? 1 : 0),
    }))

    setHistory((prev) => [
      { you: nextYourScore, rival: nextRivalScore, outcome },
      ...prev.slice(0, 9),
    ])
  }


  useEffect(() => {
    setScores({ you: 0, rival: 0, draws: 0 })
    setHistory([])
    setHand(drawHands())
  }, [variant])
  const resetSeries = (nextMode: DuelMode = mode) => {
    setMode(nextMode)
    setHand(drawHands())
    setScores({ you: 0, rival: 0, draws: 0 })
    setHistory([])
  }

  return (
    <Card className="bg-card text-foreground border-border">
      <CardHeader className="pb-4 md:pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl md:text-2xl font-semibold">
              High / Low Duel
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Draw five cards and compare totals. Choose whether the highest or lowest score wins.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            className="border-border bg-secondary hover:bg-secondary/80"
            onClick={() => resetSeries(mode)}
          >
            Reset series
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-secondary p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Mode
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['bot', 'friend'] satisfies DuelMode[]).map((entry) => (
                <Button
                  key={entry}
                  size="sm"
                  variant={mode === entry ? 'default' : 'outline'}
                  className={cn(
                    'min-w-[120px] justify-center text-xs md:text-sm',
                    mode === entry
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-foreground border-border hover:bg-secondary'
                  )}
                  onClick={() => resetSeries(entry)}
                >
                  {modeLabel[entry]}
                </Button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Variant
            </p>
            <Tabs
              value={variant}
              onValueChange={(next) => setVariant(next as DuelVariant)}
              className="mt-2"
            >
              <TabsList className="grid w-full grid-cols-2 bg-secondary rounded-xl text-sm">
                <TabsTrigger
                  value="highest"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  High wins
                </TabsTrigger>
                <TabsTrigger
                  value="lowest"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Low wins
                </TabsTrigger>
              </TabsList>
              <TabsContent value="highest" className="pt-2 text-sm text-muted-foreground">
                Highest combined total wins the round. Aim for commanding draws.
              </TabsContent>
              <TabsContent value="lowest" className="pt-2 text-sm text-muted-foreground">
                Lowest total wins. Dodge high cards and force your rival to bust.
              </TabsContent>
            </Tabs>
          </div>
          <div className="rounded-lg border border-border bg-secondary p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Series record
            </p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded border border-border bg-card/80 p-2 text-center">
                <dt className="text-xs text-muted-foreground uppercase">You</dt>
                <dd className="text-lg font-semibold text-foreground">
                  {scores.you}
                </dd>
              </div>
              <div className="rounded border border-border bg-card/80 p-2 text-center">
                <dt className="text-xs text-muted-foreground uppercase">
                  {mode === 'friend' ? 'Friend' : 'Bot'}
                </dt>
                <dd className="text-lg font-semibold text-foreground">
                  {scores.rival}
                </dd>
              </div>
              <div className="rounded border border-border bg-card/80 p-2 text-center">
                <dt className="text-xs text-muted-foreground uppercase">Draws</dt>
                <dd className="text-lg font-semibold text-foreground">
                  {scores.draws}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary p-4">
          <div className="flex flex-col gap-4 md:flex-row md:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Your hand</h3>
              <p className="text-sm text-muted-foreground">Total: {yourScore}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {hand.you.map((value, index) => (
                  <div
                    key={`you-${index}-${value}`}
                    className={cn(
                      'flex h-20 w-14 flex-col items-center justify-center rounded-lg border text-lg font-semibold',
                      cardColor(value)
                    )}
                  >
                    {formatCard(value)}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{`${mode === 'friend' ? 'Friend' : 'Bot'}’s hand`}</h3>
              <p className="text-sm text-muted-foreground">Total: {rivalScore}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {hand.rival.map((value, index) => (
                  <div
                    key={`rival-${index}-${value}`}
                    className={cn(
                      'flex h-20 w-14 flex-col items-center justify-center rounded-lg border text-lg font-semibold',
                      cardColor(value)
                    )}
                  >
                    {mode === 'bot' ? formatCard(value) : formatCard(value)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-zinc-300">
              {(() => {
                const outcome = determineOutcome(yourScore, rivalScore)
                if (outcome === 'draw') {
                  return 'Stalemate! Both totals are equal.'
                }
                if (outcome === 'you') {
                  return variant === 'highest'
                    ? 'You take the round with the stronger total.'
                    : 'You win by keeping your total the lowest.'
                }
                return variant === 'highest'
                  ? 'Rival edges ahead with a higher total.'
                  : 'Rival stays cooler with a smaller sum.'
              })()}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-border bg-card hover:bg-secondary"
                onClick={() => setHand(drawHands())}
              >
                Redeal without scoring
              </Button>
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/80"
                onClick={dealNewRound}
              >
                Deal &amp; record round
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/80 p-4">
          <h3 className="text-lg font-semibold">Recent rounds</h3>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No recorded rounds yet. Play a few games to build your streak and track performance.
            </p>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {history.map((item, index) => (
                <div
                  key={`history-${index}`}
                  className="flex flex-wrap items-center justify-between rounded-lg border border-border bg-card/80 px-3 py-2"
                >
                  <span>Round {history.length - index}</span>
                  <span>
                    You: {item.you} · {mode === 'friend' ? 'Friend' : 'Bot'}: {item.rival}
                  </span>
                  <span className="font-semibold uppercase">
                    {item.outcome === 'draw' ? 'Draw' : item.outcome === 'you' ? 'You win' : 'Rival wins'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
