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
    <div className="min-h-screen bg-gradient-to-b from-[#0B0000] to-[#200000] py-16 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4">
        <header className="rounded-3xl border border-[#3D0000] bg-[#120000]/60 p-8 shadow-lg shadow-[#3D0000]/40">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.4em] text-[#F28D35]">Puzzle Lab</p>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                Mini-games that sharpen your Whot instincts
              </h1>
              <p className="max-w-2xl text-base text-zinc-300 sm:text-lg">
                Mix up your training routine with focused challenges. Build memory, decision making, and composure — all without
                leaving the Whottos universe.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-zinc-300">
                <span className="rounded-full border border-[#3D0000] bg-[#3D0000]/40 px-3 py-1">
                  Solo drills
                </span>
                <span className="rounded-full border border-[#3D0000] bg-[#3D0000]/40 px-3 py-1">
                  Hotseat duels
                </span>
                <span className="rounded-full border border-[#3D0000] bg-[#3D0000]/40 px-3 py-1">
                  Bot sparring
                </span>
                <span className="rounded-full border border-[#3D0000] bg-[#3D0000]/40 px-3 py-1">
                  Future online matchmaking
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-[#3D0000] bg-[#1F0000]/60 p-5 text-sm text-zinc-300">
              <p className="font-semibold text-white">Looking for full multiplayer?</p>
              <p>
                Queue for ranked games in the{' '}
                <Link href="/play/online" className="text-[#F28D35] underline underline-offset-4">
                  online lobby
                </Link>
                . Bring the skills you hone here straight into competitive play.
              </p>
              <Button asChild className="bg-[#F28D35] text-black hover:bg-[#F28D35]/80">
                <Link href="/play/online">Enter ranked lobby</Link>
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <Card className="border border-[#3D0000] bg-[#1F0000]/70 text-white">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Pick your puzzle</CardTitle>
              <CardDescription className="text-zinc-300">
                Each game targets a different competitive skill. Swap freely and chase new personal bests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {puzzles.map((puzzle) => {
                  const isActive = puzzle.id === activePuzzle
                  return (
                    <button
                      key={puzzle.id}
                      type="button"
                      onClick={() => setActivePuzzle(puzzle.id)}
                      className={`flex h-full flex-col justify-between gap-3 rounded-2xl border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-[#F28D35] focus:ring-offset-2 focus:ring-offset-[#0B0000] ${
                        isActive
                          ? 'border-[#F28D35] bg-[#F28D35]/15 shadow-lg shadow-[#F28D35]/40'
                          : 'border-[#3D0000] bg-[#120000]/60 hover:border-[#F28D35]/60 hover:bg-[#1F0000]/70'
                      }`}
                    >
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.3em] text-[#F28D35]">{puzzle.tagline}</p>
                        <h2 className="text-xl font-semibold">{puzzle.name}</h2>
                        <p className="text-sm text-zinc-300">{puzzle.description}</p>
                      </div>
                      <p className="text-xs text-zinc-400">{puzzle.audience}</p>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#3D0000] bg-[#1F0000]/70 text-white">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Play styles</CardTitle>
              <CardDescription className="text-zinc-300">
                Switch between solo, bot sparring, or hotseat duels. Online matchmaking for mini-games is in research.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="solo" className="text-sm text-zinc-300">
                <TabsList className="grid w-full grid-cols-3 bg-[#3D0000]/50">
                  <TabsTrigger value="solo" className="data-[state=active]:bg-[#570000] data-[state=active]:text-white">
                    Solo
                  </TabsTrigger>
                  <TabsTrigger value="bot" className="data-[state=active]:bg-[#570000] data-[state=active]:text-white">
                    Vs Bot
                  </TabsTrigger>
                  <TabsTrigger value="friend" className="data-[state=active]:bg-[#570000] data-[state=active]:text-white">
                    Hotseat
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="solo" className="pt-3">
                  Practice at your own pace, reset often, and focus on mechanical mastery.
                </TabsContent>
                <TabsContent value="bot" className="pt-3">
                  Face a quick AI opponent. Great for stress-testing your reactions without coordinating schedules.
                </TabsContent>
                <TabsContent value="friend" className="pt-3">
                  Share the same device and take turns. Perfect for couch rivalries or remote calls.
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        <section>{selectedPuzzle.render()}</section>

        <section className="rounded-3xl border border-[#3D0000] bg-[#120000]/60 p-8 text-sm text-zinc-300">
          <h2 className="text-2xl font-semibold text-white">Roadmap for Puzzle Play</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#3D0000] bg-[#1F0000]/70 p-4">
              <h3 className="text-lg font-semibold text-white">Upcoming features</h3>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Ranked queue integrations so puzzle ELO contributes to the global leaderboard.</li>
                <li>Private mini-game lobbies with invite links and spectator tools.</li>
                <li>Timed challenges and weekly puzzle playlists for long-term progression.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#3D0000] bg-[#1F0000]/70 p-4">
              <h3 className="text-lg font-semibold text-white">Want to help test?</h3>
              <p>
                Join the community Discord to vote on the next puzzle and get early access to multiplayer experiments.
              </p>
              <Button
                variant="outline"
                className="mt-3 border-[#F28D35] text-[#F28D35] hover:bg-[#F28D35]/10"
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
