'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2,
  Users,
  Sword,
  ShieldCheck,
  Clock3,
  Trophy,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MatchmakingResponse {
  status: 'queued' | 'matched' | 'removed' | 'not-found'
  position?: number
  totalPlayers?: number
  waitSeconds?: number
  roomId?: string
  matchId?: string
  opponents?: { playerId: string; name: string }[]
  error?: string
}

interface LeaderboardEntry {
  playerId: string
  name: string
  rating: number
  wins: number
  losses: number
  lastMatch: string
}

const formatLastMatch = (entry: LeaderboardEntry) =>
  entry.wins + entry.losses > 0
    ? new Date(entry.lastMatch).toLocaleString()
    : 'No ranked matches yet'

const POLL_INTERVAL = 3000

const defaultLeaderboard: LeaderboardEntry[] = []

function generatePlayerId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `match-player-${crypto.randomUUID()}`
  }
  return `match-player-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`
}

async function fetchLeaderboardPreview(): Promise<LeaderboardEntry[]> {
  try {
    const response = await fetch('/api/leaderboard', { cache: 'no-store' })
    if (!response.ok) {
      throw new Error('Unable to load leaderboard')
    }
    const payload = (await response.json()) as { leaderboard?: LeaderboardEntry[] }
    return (payload.leaderboard || []).slice(0, 5)
  } catch (error) {
    console.error('Failed to load leaderboard preview:', error)
    return defaultLeaderboard
  }
}

export default function OnlinePlayPage() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [queueStatus, setQueueStatus] = useState<'idle' | 'queued' | 'matched'>(
    'idle'
  )
  const [queueMeta, setQueueMeta] = useState<MatchmakingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const storedName = window.localStorage.getItem('playerName')
    if (storedName) {
      setPlayerName(storedName)
    }
    const storedId = window.localStorage.getItem('matchmakingPlayerId')
    if (storedId) {
      setPlayerId(storedId)
    } else {
      const newId = generatePlayerId()
      window.localStorage.setItem('matchmakingPlayerId', newId)
      setPlayerId(newId)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboardPreview().then(setLeaderboard)
  }, [])

  const opponents = useMemo(() => queueMeta?.opponents || [], [queueMeta])

  const joinQueue = useCallback(async () => {
    if (!playerName.trim()) {
      setError('Please enter your display name before joining the queue.')
      return
    }
    if (!playerId) {
      setError('Unable to generate matchmaking ID. Refresh and try again.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/matchmaking/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, name: playerName }),
      })

      const payload = (await response.json()) as MatchmakingResponse

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to join matchmaking queue')
      }

      window.localStorage.setItem('playerName', playerName)

      setQueueMeta(payload)
      setQueueStatus(payload.status === 'matched' ? 'matched' : 'queued')
      if (payload.status === 'matched' && payload.roomId && payload.matchId) {
        router.push(
          `/play/room/${payload.roomId}?mode=ranked&matchId=${encodeURIComponent(
            payload.matchId
          )}`
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error joining queue')
    } finally {
      setIsSubmitting(false)
    }
  }, [playerId, playerName, router])

  const leaveQueue = useCallback(async () => {
    if (!playerId) return
    setIsSubmitting(true)
    setError(null)
    try {
      await fetch(`/api/matchmaking/leave?playerId=${encodeURIComponent(playerId)}`, {
        method: 'DELETE',
      })
    } catch (err) {
      console.error('Failed to leave queue:', err)
    } finally {
      setQueueStatus('idle')
      setQueueMeta(null)
      setIsSubmitting(false)
    }
  }, [playerId])

  useEffect(() => {
    if (queueStatus !== 'queued' || !playerId) {
      return
    }

    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/matchmaking/status?playerId=${encodeURIComponent(playerId)}`,
          { cache: 'no-store' }
        )
        const payload = (await response.json()) as MatchmakingResponse
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to fetch queue status')
        }

        setQueueMeta(payload)
        if (payload.status === 'matched' && payload.roomId && payload.matchId) {
          setQueueStatus('matched')
          router.push(
            `/play/room/${payload.roomId}?mode=ranked&matchId=${encodeURIComponent(
              payload.matchId
            )}`
          )
        }
      } catch (err) {
        console.error('Queue polling failed:', err)
        setError('We lost connection to the queue. Please try joining again.')
        window.clearInterval(interval)
        setQueueStatus('idle')
      }
    }, POLL_INTERVAL)

    return () => window.clearInterval(interval)
  }, [playerId, queueStatus, router])

  const queuePosition = queueMeta?.position ?? null
  const totalPlayers = queueMeta?.totalPlayers ?? null
  const waitSeconds = queueMeta?.waitSeconds ?? null

  return (
    <div className="min-h-full bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="rounded-3xl bg-primary px-8 py-12 text-primary-foreground shadow-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-xs uppercase tracking-wide">
                <Sword className="h-4 w-4" /> Ranked Online
              </p>
              <h1 className="mt-4 text-3xl font-black md:text-4xl">
                Queue for Competitive Whot
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-primary-foreground/80 md:text-base">
                Enter the ranked ladder to face players across the world. Our Elo-style
                rating rewards consistent play and keeps matches fair.
              </p>
            </div>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm hover:bg-primary-foreground/20"
            >
              <Trophy className="h-4 w-4" /> View full leaderboard
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="border border-border bg-card/90 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Users className="h-6 w-6" /> Ranked Matchmaking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="playerName">
                  Display name
                </label>
                <input
                  id="playerName"
                  type="text"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="Your in-game name"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                  disabled={queueStatus === 'queued' || isSubmitting}
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={queueStatus === 'queued' ? leaveQueue : joinQueue}
                  disabled={isSubmitting || !playerId}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {queueStatus === 'queued' ? 'Leave queue' : 'Join ranked queue'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-primary text-primary hover:bg-primary/10"
                  onClick={() => fetchLeaderboardPreview().then(setLeaderboard)}
                  disabled={isSubmitting}
                >
                  Refresh standings
                </Button>
              </div>

              {queueStatus === 'queued' && (
                <div className="rounded-2xl border border-border bg-card/70 px-4 py-5">
                  <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-foreground/70">
                    <ShieldCheck className="h-4 w-4" /> Searching for opponents…
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-foreground sm:grid-cols-2">
                    {queuePosition && (
                      <div className="flex flex-col rounded-xl bg-secondary px-4 py-3">
                        <span className="text-xs uppercase text-foreground/70">
                          Queue position
                        </span>
                        <span className="text-lg font-bold">{queuePosition}</span>
                      </div>
                    )}
                    {totalPlayers && (
                      <div className="flex flex-col rounded-xl bg-secondary px-4 py-3">
                        <span className="text-xs uppercase text-foreground/70">
                          Players searching
                        </span>
                        <span className="text-lg font-bold">{totalPlayers}</span>
                      </div>
                    )}
                    {waitSeconds !== null && waitSeconds !== undefined && (
                      <div className="flex flex-col rounded-xl bg-secondary px-4 py-3">
                        <span className="text-xs uppercase text-foreground/70">
                          Time waiting
                        </span>
                        <span className="flex items-center gap-2 text-lg font-bold">
                          <Clock3 className="h-4 w-4" /> {waitSeconds}s
                        </span>
                      </div>
                    )}
                  </div>

                  {opponents.length > 0 && (
                    <div className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">
                        Opponents locked in:
                      </p>
                      <ul className="mt-2 space-y-1">
                        {opponents.map((opponent) => (
                          <li key={opponent.playerId} className="flex items-center gap-2">
                            <ShieldCheck className="h-3 w-3" /> {opponent.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {queueStatus === 'matched' && queueMeta?.roomId && (
                <div className="rounded-2xl border border-green-200 bg-green-50/90 px-4 py-5 text-sm text-green-900">
                  <p className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="h-4 w-4" /> Match found!
                  </p>
                  <p className="mt-2">
                    Redirecting you to the table. If you are not redirected automatically,
                    <Button
                      variant="link"
                      className="p-0 text-green-900"
                      onClick={() =>
                        router.push(
                          `/play/room/${queueMeta.roomId}?mode=ranked&matchId=${encodeURIComponent(
                            queueMeta.matchId ?? ''
                          )}`
                        )
                      }
                    >
                      tap here
                    </Button>
                    .
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/90 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Trophy className="h-5 w-5" /> Ladder snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {leaderboard.length === 0 ? (
                <div className="rounded-xl bg-secondary px-4 py-6 text-sm text-foreground/80">
                  <p>Finish your first ranked games to start filling the leaderboard.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <li
                      key={`${entry.playerId}-${entry.lastMatch}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-card/70 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          #{index + 1} {entry.name}
                        </p>
                        <p className="text-xs text-foreground/70">
                          Last match {formatLastMatch(entry)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#FF9190]">
                          {Math.round(entry.rating)}
                        </p>
                        <p className="text-xs text-foreground/70">
                          {entry.wins}W / {entry.losses}L
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-foreground/60">
                Ranked matches contribute to the global ladder. Win streaks provide a bonus to
                rating gains, while losses reduce your streak.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
