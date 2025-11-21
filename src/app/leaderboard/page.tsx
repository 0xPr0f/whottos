'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trophy, RefreshCw, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LeaderboardEntry {
  playerId: string
  name: string
  rating: number
  wins: number
  losses: number
  gamesPlayed: number
  streak: number
  lastWin: string | null
  lastMatch: string
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const response = await fetch('/api/leaderboard', { cache: 'no-store' })
    if (!response.ok) {
      throw new Error('Failed to load leaderboard')
    }
    const data = (await response.json()) as { leaderboard?: LeaderboardEntry[] }
    return data.leaderboard ?? []
  } catch (error) {
    console.error('Unable to fetch leaderboard:', error)
    throw error
  }
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLeaderboard = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const leaderboard = await fetchLeaderboard()
      setEntries(leaderboard)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const podium = useMemo(() => entries.slice(0, 3), [entries])
  const others = useMemo(() => entries.slice(3), [entries])
  const formatLastMatch = useCallback(
    (entry: LeaderboardEntry) =>
      entry.gamesPlayed > 0
        ? new Date(entry.lastMatch).toLocaleString()
        : 'No ranked matches yet',
    []
  )
  const formatLastWin = useCallback(
    (entry: LeaderboardEntry) =>
      entry.lastWin ? new Date(entry.lastWin).toLocaleString() : 'No wins yet',
    []
  )

  return (
    <div className="min-h-full bg-background text-foreground">
      <section className="relative overflow-hidden bg-primary px-6 py-16 text-primary-foreground">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm font-semibold">
            <Trophy className="h-4 w-4" />
            Community Champions
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Whot.gg Global Leaderboard
          </h1>
          <p className="mt-4 text-base text-primary-foreground/80 md:text-lg">
            Celebrate the strongest competitors from ranked online queues. Matches use an
            Elo-style rating system so every win and loss matters.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              onClick={loadLeaderboard}
              disabled={isLoading}
              className="bg-card text-primary hover:bg-card/80"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing…' : 'Refresh leaderboard'}
            </Button>
            <div className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm">
              <Users className="h-4 w-4" />
              <span>{entries.length} tracked players</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16 pt-10">
        {error && (
          <div className="mt-8 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {entries.length === 0 && !isLoading ? (
          <div className="mt-12 rounded-xl bg-card/80 p-8 text-center shadow-lg">
            <p className="text-lg font-semibold">No games have been completed yet.</p>
            <p className="mt-2 text-sm text-foreground/70">
              Jump into a room, finish a match, and you could be the first on the board!
            </p>
          </div>
        ) : (
          <>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {podium.map((entry, index) => (
                <div
                  key={`${entry.playerId}-${entry.lastMatch}`}
                  className="rounded-2xl bg-card p-6 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground/70">
                      Rank #{index + 1}
                    </span>
                    <Trophy className="h-5 w-5 text-[#FF9190]" />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-foreground">
                    {entry.name}
                  </h2>
                  <p className="mt-2 text-sm text-foreground/70">
                    Last win {formatLastWin(entry)}
                  </p>
                  <div className="mt-6 grid gap-2 text-sm text-foreground/80">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs uppercase tracking-wide">Rating</span>
                      <span className="text-3xl font-black text-[#FF9190]">
                        {Math.round(entry.rating)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Record</span>
                      <span className="font-semibold text-foreground">
                        {entry.wins}W / {entry.losses}L
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last match</span>
                      <span>{formatLastMatch(entry)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {others.length > 0 && (
              <div className="mt-12 overflow-hidden rounded-2xl bg-card shadow-xl">
                <div className="bg-primary/90 px-6 py-4 text-primary-foreground">
                  <h3 className="text-lg font-semibold">Challengers</h3>
                </div>
                <ul className="divide-y divide-border/60">
                  {others.map((entry, index) => (
                    <li
                      key={`${entry.playerId}-${entry.lastMatch}`}
                      className="grid gap-2 px-6 py-4 text-sm text-foreground sm:grid-cols-[auto,1fr,auto] sm:items-center"
                    >
                      <div className="flex items-center gap-4 sm:col-span-1">
                        <span className="text-lg font-semibold text-foreground">
                          #{index + podium.length + 1}
                        </span>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{entry.name}</p>
                          <p className="text-xs text-foreground/70">
                            Rating {Math.round(entry.rating)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:col-span-1 sm:justify-end sm:gap-8">
                        <div className="flex flex-col text-xs uppercase tracking-wide text-foreground/70 sm:text-right">
                          <span>Wins</span>
                          <span className="text-base font-semibold text-foreground">
                            {entry.wins}
                          </span>
                        </div>
                        <div className="flex flex-col text-xs uppercase tracking-wide text-foreground/70 sm:text-right">
                          <span>Losses</span>
                          <span className="text-base font-semibold text-foreground">
                            {entry.losses}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-foreground/70 sm:col-span-1 sm:justify-end">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-[#FF9190]" />
                          <span>Last match {formatLastMatch(entry)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
