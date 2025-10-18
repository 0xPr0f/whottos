import type { DurableObjectState } from './durable-object-types'

interface QueuePlayer {
  playerId: string
  name: string
  joinedAt: number
  skill?: string | null
}

interface MatchAssignment {
  roomId: string
  matchId: string
  createdAt: number
  players: QueuePlayer[]
}

type SerializedAssignments = [string, MatchAssignment][]

export class MatchmakingQueueDO {
  private state: DurableObjectState
  private queue: QueuePlayer[] = []
  private assignments = new Map<string, MatchAssignment>()
  private matches = new Map<string, MatchAssignment>()
  private readonly MATCH_EXPIRY = 5 * 60 * 1000

  constructor(state: DurableObjectState) {
    this.state = state
    Promise.all([
      state.storage.get<QueuePlayer[]>('queue'),
      state.storage.get<SerializedAssignments>('assignments'),
      state.storage.get<SerializedAssignments>('matches'),
    ])
      .then(([queue, assignments, matches]) => {
        this.queue = Array.isArray(queue) ? queue : []
        this.assignments = new Map(assignments || [])
        this.matches = new Map(matches || [])
        this.cleanupExpiredMatches()
      })
      .catch((error) => {
        console.error('Failed to restore matchmaking state:', error)
      })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const action = segments[segments.length - 1]

    try {
      if (action === 'join' && request.method === 'POST') {
        const body = (await request.json()) as {
          playerId?: string
          name?: string
          skill?: string | null
        }

        if (!body.playerId || !body.name) {
          return new Response('Missing player information', { status: 400 })
        }

        this.removePlayer(body.playerId)

        const player: QueuePlayer = {
          playerId: body.playerId,
          name: body.name,
          joinedAt: Date.now(),
          skill: body.skill ?? null,
        }

        this.queue.push(player)
        await this.persistState()

        const assignment = await this.attemptMatch(player.playerId)

        if (assignment) {
          return this.response({
            status: 'matched',
            roomId: assignment.roomId,
            matchId: assignment.matchId,
            opponents: assignment.players.filter(
              (p) => p.playerId !== player.playerId
            ),
          })
        }

        return this.response({
          status: 'queued',
          position:
            this.queue.findIndex((p) => p.playerId === player.playerId) + 1,
          totalPlayers: this.queue.length,
        })
      }

      if (action === 'status' && request.method === 'GET') {
        const playerId = url.searchParams.get('playerId')
        if (!playerId) {
          return new Response('playerId is required', { status: 400 })
        }

        const assignment = this.assignments.get(playerId)
        if (assignment) {
          return this.response({
            status: 'matched',
            roomId: assignment.roomId,
            matchId: assignment.matchId,
            opponents: assignment.players.filter(
              (p) => p.playerId !== playerId
            ),
          })
        }

        const position = this.queue.findIndex((p) => p.playerId === playerId)
        if (position >= 0) {
          return this.response({
            status: 'queued',
            position: position + 1,
            totalPlayers: this.queue.length,
            waitSeconds: Math.round((Date.now() - this.queue[position].joinedAt) / 1000),
          })
        }

        return this.response({ status: 'not-found' })
      }

      if (action === 'leave') {
        const playerId =
          request.method === 'DELETE'
            ? new URL(request.url).searchParams.get('playerId')
            : undefined

        if (!playerId) {
          return new Response('playerId is required', { status: 400 })
        }

        const removed = this.removePlayer(playerId)
        await this.persistState()

        return this.response({ status: removed ? 'removed' : 'not-found' })
      }

      return new Response('Not Found', { status: 404 })
    } catch (error) {
      console.error('Matchmaking request failed:', error)
      return new Response('Internal error', { status: 500 })
    }
  }

  private async attemptMatch(targetPlayerId?: string) {
    this.cleanupExpiredMatches()

    const pairs: QueuePlayer[][] = []
    while (this.queue.length >= 2) {
      const pair = this.queue.splice(0, 2)
      pairs.push(pair)
    }

    if (pairs.length === 0) {
      await this.persistState()
      return undefined
    }

    const createdMatches: MatchAssignment[] = []
    for (const players of pairs) {
      const matchId = this.generateId('match')
      const roomId = `ranked-${matchId}`
      const assignment: MatchAssignment = {
        roomId,
        matchId,
        createdAt: Date.now(),
        players,
      }
      createdMatches.push(assignment)
      this.matches.set(matchId, assignment)
      for (const player of players) {
        this.assignments.set(player.playerId, assignment)
      }
    }

    await this.persistState()

    if (!targetPlayerId) {
      return createdMatches[0]
    }

    return this.assignments.get(targetPlayerId)
  }

  private removePlayer(playerId: string) {
    const before = this.queue.length
    this.queue = this.queue.filter((p) => p.playerId !== playerId)

    const assignment = this.assignments.get(playerId)
    if (assignment) {
      this.assignments.delete(playerId)
      const remaining = assignment.players.filter(
        (p) => p.playerId !== playerId
      )
      if (remaining.length === 0) {
        this.matches.delete(assignment.matchId)
      }
    }
    return this.queue.length !== before || Boolean(assignment)
  }

  private cleanupExpiredMatches() {
    const cutoff = Date.now() - this.MATCH_EXPIRY
    for (const [matchId, assignment] of this.matches.entries()) {
      if (assignment.createdAt < cutoff) {
        this.matches.delete(matchId)
        for (const player of assignment.players) {
          this.assignments.delete(player.playerId)
        }
      }
    }
  }

  private async persistState() {
    await Promise.all([
      this.state.storage.put('queue', this.queue),
      this.state.storage.put(
        'assignments',
        Array.from(this.assignments.entries()) as SerializedAssignments
      ),
      this.state.storage.put(
        'matches',
        Array.from(this.matches.entries()) as SerializedAssignments
      ),
    ])
  }

  private generateId(prefix: string) {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    return `${prefix}-${id}`
  }

  private response(data: Record<string, unknown>) {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
