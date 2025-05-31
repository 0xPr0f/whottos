import { DurableObject } from 'cloudflare:workers'

interface Player {
  id: string
  name: string
  score: number
  connected: boolean
  lastSeen: number
}

export class MultiplayerRoomDO extends DurableObject<Env> {
  private readonly DISCONNECT_TIMEOUT = 15 * 60 * 1000 // 15 minutes
  private state: DurableObjectState
  private players: Player[] = []
  private wsMap = new Map<string, WebSocket>()

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.state = state
    state.storage.get<Player[]>('players').then((stored) => {
      this.players = (stored || []).map((p) => ({
        ...p,
        connected: false,
        lastSeen: p.lastSeen || Date.now(),
      }))
      this.cleanupDisconnectedPlayers()
      this.state.storage.setAlarm(Date.now() + 60 * 1000) // Periodic state persistence
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const roomId = url.pathname.split('/').pop()!
    const playerId = url.searchParams.get('playerId')!
    const playerName = url.searchParams.get('playerName')

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const { 0: client, 1: server } = new WebSocketPair()
    this.state.acceptWebSocket(server, [roomId])
    this.wsMap.set(playerId, server)
    console.log(
      `Accepted WebSocket for playerId: ${playerId}, wsMap size: ${this.wsMap.size}`
    )

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketOpen(ws: WebSocket, request: Request) {
    console.log('WebSocket opened')
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    console.log(`Received message, wsMap size: ${this.wsMap.size}`)
    let msg: any
    try {
      msg =
        typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(raw.toString())
    } catch {
      console.log('Failed to parse message')
      return
    }
    const { type, playerId, playerName, roomId } = msg

    let pl = this.players.find((p) => p.id === playerId)
    if (pl) {
      pl.connected = true
      pl.lastSeen = Date.now()
      this.wsMap.set(playerId, ws)
    }

    const persistAndBroadcast = async (evt: string) => {
      await this.state.storage.put('players', this.players)
      this.broadcast({ type: evt, roomId, players: this.players })
    }

    if (type === 'join-room') {
      if (!pl) {
        pl = {
          id: playerId,
          name: playerName || `Player-${playerId}`,
          score: 0,
          connected: true,
          lastSeen: Date.now(),
        }
        this.players.push(pl)
      } else {
        pl.name = playerName || pl.name
      }
      this.wsMap.set(playerId, ws)
      console.log(`Player ${playerId} joined, connected: ${pl.connected}`)
      await persistAndBroadcast('room-update')
    } else if (type === 'click-button') {
      if (pl) {
        pl.score += 1
        console.log(`Player ${playerId} clicked, score: ${pl.score}`)
        await persistAndBroadcast('score-update')
      }
    } else if (type === 'ping') {
      if (pl) {
        ws.send(JSON.stringify({ type: 'pong' }))
        console.log(`Ping from ${playerId}, responded with pong`)
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    console.log('WebSocket closed, cleaning up')
    for (const [id, sock] of this.wsMap.entries()) {
      if (sock === ws) {
        this.wsMap.delete(id)
        const pl = this.players.find((p) => p.id === id)
        if (pl) {
          pl.connected = false
          pl.lastSeen = Date.now()
          await this.state.storage.put('players', this.players)
          console.log(
            `Player ${id} disconnected, wsMap size: ${this.wsMap.size}`
          )
          this.broadcast({
            type: 'player-left',
            playerId: id,
            players: this.players,
          })
          await this.state.storage.setAlarm(
            Date.now() + this.DISCONNECT_TIMEOUT
          )
        }
        break
      }
    }
  }

  async webSocketError(ws: WebSocket, error: any) {
    console.error(`WebSocket error: ${error}`)
    for (const [id, sock] of this.wsMap.entries()) {
      if (sock === ws) {
        this.wsMap.delete(id)
        const pl = this.players.find((p) => p.id === id)
        if (pl) {
          pl.connected = false
          pl.lastSeen = Date.now()
          await this.state.storage.put('players', this.players)
          console.log(`Player ${id} errored, wsMap size: ${this.wsMap.size}`)
          this.broadcast({
            type: 'player-left',
            playerId: id,
            players: this.players,
          })
        }
        break
      }
    }
  }

  async alarm() {
    await this.state.storage.put('players', this.players)
    this.cleanupDisconnectedPlayers()
    this.state.storage.setAlarm(Date.now() + 60 * 1000)
  }

  private cleanupDisconnectedPlayers() {
    const cutoff = Date.now() - this.DISCONNECT_TIMEOUT
    const before = this.players.length
    this.players = this.players.filter(
      (p) => p.connected || p.lastSeen > cutoff
    )
    if (this.players.length !== before) {
      this.state.storage.put('players', this.players).then(() => {
        console.log(
          `Cleaned disconnected players, remaining: ${this.players.length}`
        )
        this.broadcast({ type: 'room-update', players: this.players })
      })
    }
  }

  private broadcast(msg: any) {
    const j = JSON.stringify(msg)
    console.log(`Broadcasting to ${this.wsMap.size} clients: ${j}`)
    for (const ws of this.wsMap.values()) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(j)
        } else {
          console.log(`Skipping closed WebSocket in broadcast`)
        }
      } catch (e) {
        console.error(`Broadcast error: ${e}`)
      }
    }
  }
}
