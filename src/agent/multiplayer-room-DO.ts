import { DurableObject } from 'cloudflare:workers'

interface Player {
  id: string
  name: string
  score: number
  connected: boolean
}

export class MultiplayerRoomDO extends DurableObject<Env> {
  private state: DurableObjectState
  private players: Player[] = []
  private wsMap = new Map<string, WebSocket>()
  private webSockets = new Map<string, void>()

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.state = state
    state.storage.get<Player[]>('players').then((stored) => {
      this.players = (stored || []).map((p) => ({
        ...p,
        connected: false,
      }))
      this.cleanupDisconnectedPlayers()
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

    const ws = this.state.acceptWebSocket(server, [roomId])

    this.webSockets.set(playerId, ws)
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketOpen(ws: WebSocket, request: Request) {
    this.cleanupClosedSockets()
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    let msg: any
    try {
      msg =
        typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(raw.toString())
    } catch {
      return
    }
    const { type, playerId, playerName, roomId } = msg

    const persistAndBroadcast = async (evt: string) => {
      await this.state.storage.put('players', this.players)
      this.broadcast({ type: evt, roomId, players: this.players })
    }

    if (type === 'join-room') {
      let pl = this.players.find((p) => p.id === playerId)
      if (!pl) {
        pl = {
          id: playerId,
          name: playerName,
          score: 0,
          connected: true,
        }
        this.players.push(pl)
      } else {
        pl.connected = true

        pl.name = playerName
      }
      this.wsMap.set(playerId, ws)
      await persistAndBroadcast('room-update')
    } else if (type === 'click-button') {
      const pl = this.players.find((p) => p.id === playerId)
      if (pl) {
        pl.score += 1

        await persistAndBroadcast('score-update')
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    for (const [id, sock] of this.wsMap.entries()) {
      if (sock === ws) {
        this.wsMap.delete(id)
        const pl = this.players.find((p) => p.id === id)
        if (pl) {
          pl.connected = false

          await this.state.storage.put('players', this.players)
          this.broadcast({
            type: 'player-left',
            playerId: id,
            players: this.players,
          })

          await this.state.storage.setAlarm(Date.now())
        }
        break
      }
    }
  }

  async alarm() {
    this.cleanupDisconnectedPlayers()
  }

  private cleanupClosedSockets() {
    for (const [id, ws] of this.wsMap.entries()) {
      if (ws.readyState !== WebSocket.OPEN) {
        this.wsMap.delete(id)
      }
    }
  }

  private async cleanupDisconnectedPlayers() {
    const before = this.players.length
    this.players = this.players.filter((p) => p.connected)
    if (this.players.length !== before) {
      await this.state.storage.put('players', this.players)
      this.broadcast({ type: 'room-update', players: this.players })
    }
  }

  private broadcast(msg: any) {
    const j = JSON.stringify(msg)
    for (const ws of this.wsMap.values()) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(j)
      } catch {}
    }
  }
}
