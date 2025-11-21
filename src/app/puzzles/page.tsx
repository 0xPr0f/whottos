'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { HighLowDuel } from './_components/high-low-duel'
import { MemoryMatchGame } from './_components/memory-match-game'

type PuzzleId = 'memory-match' | 'high-low'

type PuzzleDefinition = {
  id: PuzzleId
  name: string
  tagline: string
  description: string
  audience: string
  render: () => ReactNode
}

const puzzles: PuzzleDefinition[] = [
  {
    id: 'memory-match',
    name: 'Memory Match',
    tagline: 'Sharpen your recall',
    description:
      'Find every matching Whot pair before your opponent does. Practice solo, challenge a friend, or spar with the built-in bot.',
    audience: 'Perfect for focused training sessions and warm-ups before multiplayer bouts.',
    render: () => <MemoryMatchGame />,
  },
  {
    id: 'high-low',
    name: 'High / Low Duel',
    tagline: 'Battle of instincts',
    description:
      'Split the deck, compare totals, and decide if you want the highest or lowest score to win each round.',
    audience: 'Great for head-to-head mind games, quick bot matches, or friendly showdowns.',
    render: () => <HighLowDuel />,
  },
]

export default function PuzzlesPage() {
  const [activePuzzle, setActivePuzzle] = useState<PuzzleId>('memory-match')

  const selectedPuzzle = useMemo(
    () => puzzles.find((entry) => entry.id === activePuzzle) ?? puzzles[0],
    [activePuzzle]
  )

  return (
    <div className="min-h-full bg-background py-8 md:py-12 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:gap-8 px-4">
        <header className="rounded-3xl border border-border bg-primary/90 px-4 py-5 md:px-8 md:py-6 shadow-lg shadow-primary/40 text-primary-foreground">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3 md:space-y-4">
              <p className="text-sm uppercase tracking-[0.4em] text-accent">
                Puzzle Lab
              </p>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl text-primary-foreground">
                Mini-games that sharpen your Whot instincts
              </h1>
              <p className="max-w-2xl text-sm md:text-base text-primary-foreground/80 sm:text-lg">
                Mix up your training routine with focused challenges. Build memory, decision making, and composure — all without
                leaving the Whottos universe.
              </p>
              <div className="flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm text-primary-foreground/80">
                <span className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1">
                  Solo drills
                </span>
                <span className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1">
                  Hotseat duels
                </span>
                <span className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1">
                  Bot sparring
                </span>
                <span className="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1">
                  Future online matchmaking
                </span>
              </div>
            </div>
            <div className="mt-4 lg:mt-0 flex flex-col gap-3 rounded-2xl border border-border bg-card/80 p-4 md:p-5 text-sm text-foreground/80">
              <p className="font-semibold text-foreground">Looking for full multiplayer?</p>
              <p className="text-sm">
                Queue for ranked games in the{' '}
                <Link
                  href="/play/online"
                  className="text-accent underline underline-offset-4"
                >
                  online lobby
                </Link>
                . Bring the skills you hone here straight into competitive play.
              </p>
              <Button
                asChild
                className="bg-accent text-accent-foreground hover:bg-accent/80"
              >
                <Link href="/play/online">Enter ranked lobby</Link>
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:gap-6 md:grid-cols-[1.1fr_0.9fr] items-start">
          <Card className="border border-border bg-card text-foreground">
            <CardHeader className="pb-4 md:pb-5">
              <CardTitle className="text-xl md:text-2xl font-semibold">
                Pick your puzzle
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Each game targets a different competitive skill. Swap freely and chase new personal bests.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                {puzzles.map((puzzle) => {
                  const isActive = puzzle.id === activePuzzle
                  return (
                    <button
                      key={puzzle.id}
                      type="button"
                      onClick={() => setActivePuzzle(puzzle.id)}
                      className={`flex h-full flex-col justify-between gap-2.5 md:gap-3 rounded-2xl border p-4 md:p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background ${
                        isActive
                          ? 'border-accent bg-accent/10 shadow-lg shadow-accent/40'
                          : 'border-border bg-card hover:border-accent hover:bg-accent/5'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-accent">
                          {puzzle.tagline}
                        </p>
                        <h2 className="text-base md:text-lg font-semibold text-foreground">
                          {puzzle.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {puzzle.description}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground/80 leading-snug">
                        {puzzle.audience}
                      </p>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card text-foreground">
            <CardHeader className="pb-4 md:pb-5">
              <CardTitle className="text-xl md:text-2xl font-semibold">
                Play styles
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Switch between solo, bot sparring, or hotseat duels. Online matchmaking for mini-games is in research.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs defaultValue="solo" className="text-sm text-muted-foreground">
                <TabsList className="grid w-full grid-cols-3 bg-secondary rounded-xl">
                  <TabsTrigger
                    value="solo"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Solo
                  </TabsTrigger>
                  <TabsTrigger
                    value="bot"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Vs Bot
                  </TabsTrigger>
                  <TabsTrigger
                    value="friend"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Hotseat
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="solo" className="pt-3 text-foreground/80">
                  Practice at your own pace, reset often, and focus on mechanical mastery.
                </TabsContent>
                <TabsContent value="bot" className="pt-3 text-foreground/80">
                  Face a quick AI opponent. Great for stress-testing your reactions without coordinating schedules.
                </TabsContent>
                <TabsContent value="friend" className="pt-3 text-foreground/80">
                  Share the same device and take turns. Perfect for couch rivalries or remote calls.
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        <section className="mt-2 md:mt-4">
          <div className="max-w-5xl mx-auto">{selectedPuzzle.render()}</div>
        </section>

        <section className="rounded-3xl border border-border bg-card/80 p-6 md:p-7 text-sm text-muted-foreground">
          <h2 className="text-2xl font-semibold text-foreground">
            Roadmap for Puzzle Play
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-secondary p-4">
              <h3 className="text-lg font-semibold text-foreground">
                Upcoming features
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Ranked queue integrations so puzzle ELO contributes to the global leaderboard.</li>
                <li>Private mini-game lobbies with invite links and spectator tools.</li>
                <li>Timed challenges and weekly puzzle playlists for long-term progression.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-secondary p-4">
              <h3 className="text-lg font-semibold text-foreground">
                Want to help test?
              </h3>
              <p className="text-sm">
                Join the community Discord to vote on the next puzzle and get early access to multiplayer experiments.
              </p>
              <Button
                variant="outline"
                className="mt-3 border-accent text-accent hover:bg-accent/10"
                asChild
              >
                <Link href="/community">Jump into Discord</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
