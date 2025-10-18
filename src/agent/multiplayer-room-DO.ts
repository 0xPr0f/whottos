import {
  DurableObject,
  DurableObjectId,
  DurableObjectNamespace,
} from 'cloudflare:workers'

interface Env {
  MultiplayerRoomDO: DurableObjectNamespace
}

interface Player {
  id: string
  name: string
  score: number
  connected: boolean
  lastSeen: number
}

interface ChatMessage {
  playerId: string
  playerName: string
  message: string
  timestamp: string
}

interface WhotConfig {
  pick2: boolean
  pick3: boolean
  whotEnabled: boolean
}

interface Card {
  type: 'whot' | 'circle' | 'triangle' | 'cross' | 'square' | 'star'
  value: number
  whotChoosenShape?: 'circle' | 'triangle' | 'cross' | 'square' | 'star' | null
}

interface WhotPlayer {
  id: string
  name: string
  hand: Card[]
}

interface MoveHistoryItem {
  player: string
  action: 'play' | 'draw'
  card?: Card
  timestamp: Date
}

interface WhotGameState {
  whotPlayers: WhotPlayer[]
  deck: Card[]
  callCardPile: Card[]
  currentPlayerIndex: number
  gameStatus: 'waiting' | 'playing' | 'paused' | 'finished'
  winner?: string
  lastAction?: {
    playerId: string
    action: 'play' | 'draw'
    card?: Card
  }
  moveHistory: MoveHistoryItem[]
  gameConfig: WhotConfig
}

interface GameState {
  players: Player[]
  chatMessages: ChatMessage[]
  gameConfig: WhotConfig
  gameStarted: boolean
  whotGame?: WhotGameState
}

interface LeaderboardEntry {
  playerId: string
  name: string
  wins: number
  lastWin: string
}

export class MultiplayerRoomDO extends DurableObject<Env> {
  private readonly DISCONNECT_TIMEOUT = 15 * 60 * 1000 // 15 minutes
  private readonly MAX_WHOT_PLAYERS = 5
  private readonly MIN_WHOT_PLAYERS = 2

  private state: DurableObjectState
  private players: Player[] = []
  private wsMap = new Map<string, WebSocket>()
  private chatMessages: ChatMessage[] = []
  private gameConfig: WhotConfig = {
    pick2: true,
    pick3: false,
    whotEnabled: true,
  }
  private gameStarted: boolean = false
  private whotGame: WhotGameState | null = null
  private leaderboard: LeaderboardEntry[] = []
  private env: Env
  private leaderboardObjectId: DurableObjectId
  private isGlobalLeaderboard: boolean

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.state = state
    this.env = env
    this.leaderboardObjectId = env.MultiplayerRoomDO.idFromName('leaderboard')
    this.isGlobalLeaderboard =
      state.id.toString() === this.leaderboardObjectId.toString()
    Promise.all([
      state.storage.get<Player[]>('players'),
      state.storage.get<ChatMessage[]>('chatMessages'),
      state.storage.get<WhotConfig>('gameConfig'),
      state.storage.get<boolean>('gameStarted'),
      state.storage.get<WhotGameState>('whotGame'),
      state.storage.get<LeaderboardEntry[]>('leaderboard'),
    ])
      .then(
        ([
          players,
          chatMessages,
          gameConfig,
          gameStarted,
          whotGame,
          leaderboard,
        ]) => {
          this.players = (players || []).map((p) => ({
            ...p,
            connected: false,
            lastSeen: p.lastSeen || Date.now(),
          }))
          this.chatMessages = chatMessages || []
          this.gameConfig = gameConfig || this.gameConfig
          this.gameStarted = gameStarted || false
          this.whotGame = whotGame || null
          this.leaderboard = leaderboard || []
          this.cleanupDisconnectedPlayers()
          this.state.storage.setAlarm(Date.now() + 60 * 1000)
        }
      )
      .catch((error) => {
        console.error('Failed to initialize state from storage:', error)
      })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const lastSegment = pathSegments[pathSegments.length - 1]

    if (lastSegment === 'leaderboard') {
      if (request.method === 'POST') {
        try {
          const payload = await request.json()
          const entry = payload.entry as LeaderboardEntry | undefined
          if (!entry || !entry.playerId) {
            return new Response('Invalid payload', { status: 400 })
          }

          this.upsertLeaderboardEntry({ ...entry })
          await this.state.storage.put('leaderboard', this.leaderboard)

          return new Response(null, { status: 204 })
        } catch (error) {
          console.error('Failed to update leaderboard:', error)
          return new Response('Failed to update leaderboard', { status: 500 })
        }
      }

      return new Response(JSON.stringify({ leaderboard: this.leaderboard }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const roomId = lastSegment!
    const playerId = url.searchParams.get('playerId')!
    const playerName = url.searchParams.get('playerName')

    if (request.headers.get('Upgrade') === 'websocket') {
      if (!playerId || !playerName) {
        return new Response('Missing playerId or playerName', { status: 400 })
      }

      const { 0: client, 1: server } = new WebSocketPair()
      this.state.acceptWebSocket(server, [roomId])
      this.wsMap.set(playerId, server)

      return new Response(null, { status: 101, webSocket: client })
    }

    if (request.method === 'GET') {
      const state: GameState = {
        players: this.players,
        chatMessages: this.chatMessages,
        gameConfig: this.gameConfig,
        gameStarted: this.gameStarted,
        whotGame: this.whotGame || undefined,
      }
      return new Response(JSON.stringify({ ...state, leaderboard: this.leaderboard }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method Not Allowed', { status: 405 })
  }

  async webSocketOpen(_ws: WebSocket, _request: Request) {}

  async webSocketMessage(
    ws: WebSocket,
    raw: string | ArrayBuffer
  ): Promise<void> {
    let msg: any
    try {
      msg =
        typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(raw.toString())
    } catch {
      return
    }
    const { type, playerId, playerName, roomId } = msg

    let pl = this.players.find((p) => p.id === playerId)
    if (pl) {
      pl.connected = true
      pl.lastSeen = Date.now()
      this.wsMap.set(playerId, ws)
    }

    const persistAndBroadcast = async (
      evt: string,
      additionalData: Record<string, unknown> = {}
    ) => {
      try {
        await Promise.all([
          this.state.storage.put('players', this.players),
          this.state.storage.put('chatMessages', this.chatMessages),
          this.state.storage.put('gameConfig', this.gameConfig),
          this.state.storage.put('gameStarted', this.gameStarted),
          this.state.storage.put('whotGame', this.whotGame),
          this.state.storage.put('leaderboard', this.leaderboard),
        ])
        console.log(
          `Persisted state for event ${evt}`,
          this.whotGame
            ? {
                whotPlayers: this.whotGame!.whotPlayers,
                currentPlayerIndex: this.whotGame!.currentPlayerIndex,
              }
            : undefined
        )

        this.broadcast({
          type: evt,
          roomId,
          players: this.players,
          chatMessages: this.chatMessages,
          config: this.gameConfig,
          gameStarted: this.gameStarted,
          whotGame: this.whotGame,
          leaderboard: this.leaderboard,
          ...additionalData,
        })
      } catch (error) {
        console.error(`Failed to persist state for event ${evt}:`, error)
      }
    }

    if (type === 'join-room') {
      if (!pl) {
        pl = {
          id: playerId,
          name: playerName || `Player-${playerId.slice(-7)}`,
          score: 0,
          connected: true,
          lastSeen: Date.now(),
        }
        this.players.push(pl)
      } else {
        pl.name = playerName || pl.name
        pl.connected = true
        pl.lastSeen = Date.now()
      }
      this.wsMap.set(playerId, ws)

      if (
        this.whotGame &&
        this.whotGame.whotPlayers.some((p) => p.id === playerId)
      ) {
        const connectedPlayers = this.whotGame.whotPlayers.filter((p) =>
          this.players.find((pl) => pl.id === p.id && pl.connected)
        )
        if (
          connectedPlayers.length >= this.MIN_WHOT_PLAYERS &&
          this.whotGame.gameStatus === 'paused'
        ) {
          this.whotGame.gameStatus = 'playing'
          console.log('Game resumed due to sufficient connected players:', {
            connectedPlayers: connectedPlayers.length,
            playerId,
            timestamp: new Date().toISOString(),
          })
          await this.state.storage.put('whotGame', this.whotGame)
        }
      }

      await persistAndBroadcast('room-update')
    } else if (type === 'click-button') {
      if (pl) {
        pl.score += 1
        await persistAndBroadcast('score-update')
      }
    } else if (type === 'ping') {
      if (pl) {
        ws.send(JSON.stringify({ type: 'pong' }))
      }
    } else if (type === 'chat-message') {
      const chatMessage: ChatMessage = {
        playerId,
        playerName: pl?.name || 'Unknown',
        message: msg.message,
        timestamp: msg.timestamp,
      }
      this.chatMessages.push(chatMessage)
      await persistAndBroadcast('chat-message', chatMessage)
    } else if (type === 'game-config') {
      const newConfig: WhotConfig = {
        pick2: msg.config.pick2 ?? this.gameConfig.pick2,
        pick3: msg.config.pick3 ?? this.gameConfig.pick3,
        whotEnabled: msg.config.whotEnabled ?? this.gameConfig.whotEnabled,
      }
      this.gameConfig = newConfig
      if (this.whotGame) {
        this.whotGame.gameConfig = this.gameConfig
      }
      await persistAndBroadcast('game-config', { config: this.gameConfig })
    } else if (type === 'start-game') {
      if (
        this.players[0]?.id === playerId &&
        (!this.gameStarted || this.whotGame?.gameStatus === 'finished')
      ) {
        const result = await this.startWhotGame()

        if (result.success) {
          await persistAndBroadcast('start-game', { config: this.gameConfig })
        } else {
          ws.send(JSON.stringify({ type: 'error', message: result.message }))
        }
      }
    } else if (type === 'play-card') {
      if (this.whotGame && this.whotGame.gameStatus === 'playing') {
        const result = await this.playerPlayCard(
          playerId,
          msg.cardIndex,
          msg.whotChoosenShape
        )
        if (result.success) {
          await persistAndBroadcast('whot-game-update', result)
        } else {
          ws.send(JSON.stringify({ type: 'error', message: result.message }))
        }
      }
    } else if (type === 'draw-card') {
      if (this.whotGame && this.whotGame.gameStatus === 'playing') {
        const result = await this.playerDrawCard(playerId)
        if (result.success) {
          await persistAndBroadcast('whot-game-update', result)
        } else {
          ws.send(JSON.stringify({ type: 'error', message: result.message }))
        }
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    let disconnectedPlayerId: string | null = null
    for (const [id, sock] of this.wsMap.entries()) {
      if (sock === ws) {
        this.wsMap.delete(id)
        const pl = this.players.find((p) => p.id === id)
        if (pl) {
          pl.connected = false
          pl.lastSeen = Date.now()
          disconnectedPlayerId = id
        }
        break
      }
    }

    try {
      await this.state.storage.put('players', this.players)

      if (disconnectedPlayerId && this.whotGame) {
        const connectedPlayers = this.whotGame.whotPlayers.filter((p) =>
          this.players.find((pl) => pl.id === p.id && pl.connected)
        )
        if (
          connectedPlayers.length === 0 &&
          this.whotGame.gameStatus === 'playing'
        ) {
          this.whotGame.gameStatus = 'paused'
          console.log('Game paused due to no connected players:', {
            disconnectedPlayerId,
            timestamp: new Date().toISOString(),
          })
          await this.state.storage.put('whotGame', this.whotGame)
        }
        this.broadcast({
          type: 'player-left',
          playerId: disconnectedPlayerId,
          players: this.players,
          chatMessages: this.chatMessages,
          config: this.gameConfig,
          gameStarted: this.gameStarted,
          whotGame: this.whotGame,
          leaderboard: this.leaderboard,
        })
        await this.state.storage.setAlarm(Date.now() + this.DISCONNECT_TIMEOUT)
      }
    } catch (error) {
      console.error(
        'Failed to persist players state on WebSocket close:',
        error
      )
    }
  }

  async webSocketError(ws: WebSocket, error: any) {
    console.error(`WebSocket error: ${error}`)
    let disconnectedPlayerId: string | null = null
    for (const [id, sock] of this.wsMap.entries()) {
      if (sock === ws) {
        this.wsMap.delete(id)
        const pl = this.players.find((p) => p.id === id)
        if (pl) {
          pl.connected = false
          pl.lastSeen = Date.now()
          disconnectedPlayerId = id
        }
        break
      }
    }

    try {
      await this.state.storage.put('players', this.players)

      if (disconnectedPlayerId && this.whotGame) {
        const connectedPlayers = this.whotGame.whotPlayers.filter((p) =>
          this.players.find((pl) => pl.id === p.id && pl.connected)
        )
        if (
          connectedPlayers.length === 0 &&
          this.whotGame.gameStatus === 'playing'
        ) {
          this.whotGame.gameStatus = 'paused'
          console.log('Game paused due to WebSocket error:', {
            disconnectedPlayerId,
            timestamp: new Date().toISOString(),
          })
          await this.state.storage.put('whotGame', this.whotGame)
        }
        this.broadcast({
          type: 'player-left',
          playerId: disconnectedPlayerId,
          players: this.players,
          chatMessages: this.chatMessages,
          config: this.gameConfig,
          gameStarted: this.gameStarted,
          whotGame: this.whotGame,
          leaderboard: this.leaderboard,
        })
      }
    } catch (error) {
      console.error(
        'Failed to persist players state on WebSocket error:',
        error
      )
    }
  }

  async alarm() {
    try {
      await this.state.storage.put('players', this.players)
      this.cleanupDisconnectedPlayers()
      this.state.storage.setAlarm(Date.now() + 60 * 1000)
    } catch (error) {
      console.error('Failed to persist players state during alarm:', error)
    }
  }

  private async cleanupDisconnectedPlayers() {
    const cutoff = Date.now() - this.DISCONNECT_TIMEOUT
    const before = this.players.length
    this.players = this.players.filter(
      (p) => p.connected || p.lastSeen > cutoff
    )

    if (this.players.length !== before) {
      try {
        await this.state.storage.put('players', this.players)

        if (this.whotGame) {
          const remainingGamePlayers = this.whotGame.whotPlayers.filter((p) =>
            this.players.find((pl) => pl.id === p.id)
          )
          if (remainingGamePlayers.length < this.MIN_WHOT_PLAYERS) {
            this.whotGame.gameStatus = 'finished'
            this.whotGame.winner = undefined
            console.log(
              'Game ended due to insufficient players after cleanup:',
              {
                remainingPlayers: remainingGamePlayers.length,
                timestamp: new Date().toISOString(),
              }
            )
            await this.state.storage.put('whotGame', this.whotGame)
          }
        }

        this.broadcast({
          type: 'room-update',
          players: this.players,
          chatMessages: this.chatMessages,
          config: this.gameConfig,
          gameStarted: this.gameStarted,
          whotGame: this.whotGame,
          leaderboard: this.leaderboard,
        })
      } catch (error) {
        console.error('Failed to persist players state during cleanup:', error)
      }
    }
  }

  private broadcast(msg: any) {
    const j = JSON.stringify(msg)
    for (const ws of this.wsMap.values()) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(j)
        }
      } catch (e) {
        console.error(`Broadcast error: ${e}`)
      }
    }
  }

  private async startWhotGame(): Promise<{
    success: boolean
    message?: string
  }> {
    if (this.players.length < this.MIN_WHOT_PLAYERS) {
      return { success: false, message: 'Not enough players to start game' }
    }

    this.gameStarted = true
    const whotPlayers: WhotPlayer[] = this.players
      .slice(0, this.MAX_WHOT_PLAYERS)
      .map((player) => ({
        id: player.id,
        name: player.name,
        hand: [],
      }))

    const deck = this.createDeck()
    const shuffledDeck = this.shuffleDeck(deck)

    for (const whotPlayer of whotPlayers) {
      whotPlayer.hand = shuffledDeck.splice(0, 5)
    }

    const callCardPile = [shuffledDeck.pop()!]

    const moveHistoryItem: MoveHistoryItem = {
      player: 'market',
      action: 'play',
      card: callCardPile[0],
      timestamp: new Date(),
    }

    this.whotGame = {
      whotPlayers,
      deck: shuffledDeck,
      callCardPile,
      currentPlayerIndex: 0,
      gameStatus: 'playing',
      winner: undefined,
      lastAction: undefined,
      moveHistory: [moveHistoryItem],
      gameConfig: this.gameConfig,
    }
    return { success: true }
  }

  private async playerPlayCard(
    playerId: string,
    cardIndex: number,
    whotChoosenShape?:
      | 'circle'
      | 'triangle'
      | 'cross'
      | 'square'
      | 'star'
      | null
  ): Promise<{
    success: boolean
    message?: string
    gameOver?: boolean
    winner?: string
  }> {
    if (!this.whotGame || this.whotGame.gameStatus !== 'playing') {
      return { success: false, message: 'Game not in progress' }
    }

    const currentPlayer =
      this.whotGame.whotPlayers[this.whotGame.currentPlayerIndex]
    if (currentPlayer.id !== playerId) {
      return { success: false, message: 'Not your turn' }
    }

    if (cardIndex >= currentPlayer.hand.length) {
      return { success: false, message: 'Invalid card index' }
    }

    const card = currentPlayer.hand[cardIndex]
    console.log('Card Played', card, this.isValidMove(card))

    if (!this.isValidMove(card)) {
      return {
        success: false,
        message: 'Card cannot be played on current discard',
      }
    }

    if (
      card.value === 20 &&
      (!whotChoosenShape ||
        !['circle', 'triangle', 'cross', 'square', 'star'].includes(
          whotChoosenShape
        ))
    ) {
      return {
        success: false,
        message: 'Whot card requires a valid shape selection',
      }
    }

    const playerHand = [...currentPlayer.hand]
    const playedCard = playerHand.splice(cardIndex, 1)[0]

    if (playedCard.value === 20 && whotChoosenShape) {
      playedCard.whotChoosenShape = whotChoosenShape
    }

    const moveHistoryItem: MoveHistoryItem = {
      player: currentPlayer.name,
      action: 'play',
      card: playedCard,
      timestamp: new Date(),
    }

    this.whotGame.whotPlayers[this.whotGame.currentPlayerIndex].hand =
      playerHand
    this.whotGame.callCardPile.push(playedCard)
    this.whotGame.lastAction = {
      playerId,
      action: 'play',
      card: playedCard,
    }
    this.whotGame.moveHistory.push(moveHistoryItem)

    if (playerHand.length === 0) {
      this.whotGame.gameStatus = 'finished'
      this.whotGame.winner = playerId
      console.log(this.whotGame.moveHistory)
      await this.recordWin(playerId)
      return { success: true, gameOver: true, winner: playerId }
    }

    this.enforceCardProperties(playedCard)

    ///@note when enforcing card properties, the turn is advanced
    /* if (!specialCardPlayed) {
      this.advanceTurn()
    }*/

    return { success: true }
  }

  private async playerDrawCard(playerId: string): Promise<{
    success: boolean
    message?: string
    gameOver?: boolean
    winner?: string
  }> {
    if (!this.whotGame || this.whotGame.gameStatus !== 'playing') {
      return { success: false, message: 'Game not in progress' }
    }

    const currentPlayer =
      this.whotGame.whotPlayers[this.whotGame.currentPlayerIndex]
    if (currentPlayer.id !== playerId) {
      return { success: false, message: 'Not your turn' }
    }

    if (this.whotGame.deck.length === 0) {
      return await this.endGameByCardCount()
    }

    const deck = [...this.whotGame.deck]
    const drawnCard = deck.pop()!

    const moveHistoryItem: MoveHistoryItem = {
      player: currentPlayer.name,
      action: 'draw',
      card: drawnCard,
      timestamp: new Date(),
    }

    this.whotGame.deck = deck
    currentPlayer.hand.push(drawnCard)
    this.whotGame.lastAction = {
      playerId,
      action: 'draw',
      card: drawnCard,
    }
    this.whotGame.moveHistory.push(moveHistoryItem)

    this.advanceTurn()

    return { success: true }
  }

  private advanceTurn() {
    if (!this.whotGame) return

    const numPlayers = this.whotGame.whotPlayers.length
    this.whotGame.currentPlayerIndex =
      (this.whotGame.currentPlayerIndex + 1) % numPlayers
  }

  private enforceCardProperties(card: Card): boolean {
    if (!this.whotGame) return false

    const numPlayers = this.whotGame.whotPlayers.length
    const nextPlayerIndex = (this.whotGame.currentPlayerIndex + 1) % numPlayers

    if (card.value === 1) {
      this.whotGame.currentPlayerIndex = (nextPlayerIndex + 1) % numPlayers

      /*this.whotGame.currentPlayerIndex =
          (this.whotGame.currentPlayerIndex + 1) % numPlayers */

      return true
    } else if (card.value === 2 /*&& this.whotGame.gameConfig.pick2*/) {
      const deck = [...this.whotGame.deck]
      const drawnCards: Card[] = []
      if (deck.length > 0) drawnCards.push(deck.pop()!)
      if (deck.length > 0) drawnCards.push(deck.pop()!)

      this.whotGame.deck = deck
      this.whotGame.whotPlayers[nextPlayerIndex].hand.push(...drawnCards)

      /* const moveHistoryItem: MoveHistoryItem = {
        player: this.whotGame.whotPlayers[nextPlayerIndex].name,
        action: 'draw',
        card: drawnCards.length > 0 ? drawnCards[0] : undefined,
        timestamp: new Date(),
      }
      this.whotGame.moveHistory.push(moveHistoryItem)
*/
      if (drawnCards.length > 1) {
        this.whotGame.moveHistory.push({
          player: this.whotGame.whotPlayers[nextPlayerIndex].id,
          action: 'draw',
          card: drawnCards[1],
          timestamp: new Date(),
        })
      }

      this.whotGame.currentPlayerIndex = (nextPlayerIndex + 1) % numPlayers
      return true
    } else if (card.value === 14) {
      const deck = [...this.whotGame.deck]
      for (let i = 0; i < numPlayers; i++) {
        if (i !== this.whotGame.currentPlayerIndex && deck.length > 0) {
          const drawnCard = deck.pop()!
          this.whotGame.whotPlayers[i].hand.push(drawnCard)
          /*
          const moveHistoryItem: MoveHistoryItem = {
            player: this.whotGame.whotPlayers[i].name,
            action: 'draw',
            card: drawnCard,
            timestamp: new Date(),
          }
          this.whotGame.moveHistory.push(moveHistoryItem)
*/
        }
      }

      this.whotGame.deck = deck
      this.whotGame.currentPlayerIndex = this.whotGame.currentPlayerIndex
      return true
    }

    this.whotGame.currentPlayerIndex = nextPlayerIndex
    return false
  }

  private async endGameByCardCount(): Promise<{
    success: boolean
    message?: string
    gameOver?: boolean
    winner?: string
  }> {
    if (!this.whotGame)
      return { success: false, message: 'Game not in progress' }

    const calculateTotalCardValue = (hand: Card[]): number => {
      return hand.reduce((total, card) => total + card.value, 0)
    }

    let winnerId: string | undefined
    let lowestValue = Infinity
    for (const whotPlayer of this.whotGame.whotPlayers) {
      const totalValue = calculateTotalCardValue(whotPlayer.hand)
      if (totalValue < lowestValue) {
        lowestValue = totalValue
        winnerId = whotPlayer.id
      }
    }

    this.whotGame.gameStatus = 'finished'
    this.whotGame.winner = winnerId

    console.log('Game ended by card count:', {
      winnerId,
      lowestValue,
      timestamp: new Date().toISOString(),
    })

    await this.recordWin(winnerId)

    return { success: true, gameOver: true, winner: winnerId }
  }

  private async recordWin(winnerId: string | undefined) {
    if (!winnerId) return

    const player =
      this.players.find((p) => p.id === winnerId) ||
      this.whotGame?.whotPlayers.find((p) => p.id === winnerId)

    if (!player) return

    const now = new Date().toISOString()
    const entry: LeaderboardEntry = {
      playerId: winnerId,
      name: player.name,
      wins: 1,
      lastWin: now,
    }

    this.upsertLeaderboardEntry(entry)

    try {
      await this.state.storage.put('leaderboard', this.leaderboard)
    } catch (error) {
      console.error('Failed to persist leaderboard:', error)
    }

    if (!this.isGlobalLeaderboard) {
      await this.forwardLeaderboardEntry(entry)
    }
  }

  private upsertLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry {
    const existing = this.leaderboard.find(
      (item) => item.playerId === entry.playerId
    )

    if (existing) {
      existing.wins += entry.wins
      existing.name = entry.name
      existing.lastWin = entry.lastWin
    } else {
      this.leaderboard.push({ ...entry })
    }

    this.leaderboard.sort((a, b) => {
      if (b.wins !== a.wins) {
        return b.wins - a.wins
      }
      return new Date(b.lastWin).getTime() - new Date(a.lastWin).getTime()
    })
    if (this.leaderboard.length > 50) {
      this.leaderboard = this.leaderboard.slice(0, 50)
    }

    return existing ?? entry
  }

  private async forwardLeaderboardEntry(entry: LeaderboardEntry) {
    if (this.isGlobalLeaderboard) return

    try {
      const stub = this.env.MultiplayerRoomDO.get(this.leaderboardObjectId)
      await stub.fetch('https://leaderboard.internal/room/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry }),
      })

      const response = await stub.fetch(
        'https://leaderboard.internal/room/leaderboard'
      )
      if (response.ok) {
        const payload = (await response.json()) as {
          leaderboard?: LeaderboardEntry[]
        }
        if (Array.isArray(payload.leaderboard)) {
          this.leaderboard = payload.leaderboard
          await this.state.storage.put('leaderboard', this.leaderboard)
        }
      }
    } catch (error) {
      console.error('Failed to forward leaderboard entry:', error)
    }
  }

  private isValidMove(card: Card, topCard?: Card): boolean {
    if (!topCard && this.whotGame) {
      if (
        !this.whotGame!.callCardPile ||
        this.whotGame.callCardPile.length === 0
      ) {
        return false
      }
      topCard =
        this.whotGame.callCardPile[this.whotGame.callCardPile.length - 1]
    }
    if (!topCard || !this.whotGame) return false
    if (topCard.type === 'whot' && this.whotGame.callCardPile.length === 1) {
      return true
    }

    if (card.value === 20 && topCard.value !== 20) {
      return true
    }
    if (topCard.value === 20) {
      return topCard.whotChoosenShape === card.type
    }

    return topCard.type === card.type || topCard.value === card.value
  }

  private createDeck(): Card[] {
    const deck: Card[] = []

    for (const value of [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]) {
      deck.push({ type: 'circle', value, whotChoosenShape: null })
    }

    for (const value of [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]) {
      deck.push({ type: 'triangle', value, whotChoosenShape: null })
    }

    for (const value of [1, 2, 3, 5, 7, 10, 11, 13, 14]) {
      deck.push({ type: 'cross', value, whotChoosenShape: null })
    }

    for (const value of [1, 2, 3, 5, 7, 10, 11, 13, 14]) {
      deck.push({ type: 'square', value, whotChoosenShape: null })
    }

    for (const value of [1, 2, 3, 4, 5, 7, 8]) {
      deck.push({ type: 'star', value, whotChoosenShape: null })
    }

    for (let i = 0; i < 5; i++) {
      deck.push({ type: 'whot', value: 20, whotChoosenShape: null })
    }

    return deck
  }

  private shuffleDeck(deck: Card[]): Card[] {
    let shuffled = [...deck]

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    const performRiffleShuffle = (cards: Card[]) => {
      const half = Math.floor(cards.length / 2)
      const firstHalf = cards.slice(0, half)
      const secondHalf = cards.slice(half)
      const result: Card[] = []

      while (firstHalf.length > 0 && secondHalf.length > 0) {
        if (Math.random() < 0.5) {
          result.push(firstHalf.shift()!)
          if (firstHalf.length > 0 && Math.random() < 0.2) {
            result.push(firstHalf.shift()!)
          }
        } else {
          result.push(secondHalf.shift()!)
          if (secondHalf.length > 0 && Math.random() < 0.2) {
            result.push(secondHalf.shift()!)
          }
        }
      }

      return result.concat(firstHalf, secondHalf)
    }

    for (let i = 0; i < 3; i++) {
      shuffled = performRiffleShuffle(shuffled)
    }

    const cutDeck = (cards: Card[]) => {
      const cutPoint = Math.floor(Math.random() * (cards.length - 5)) + 3
      return [...cards.slice(cutPoint), ...cards.slice(0, cutPoint)]
    }

    const numCuts = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < numCuts; i++) {
      shuffled = cutDeck(shuffled)
    }

    const timestamp = Date.now()
    const entropyFactor = timestamp % 10
    for (let i = 0; i < entropyFactor; i++) {
      const idx1 = Math.floor(Math.random() * shuffled.length)
      const idx2 = Math.floor(Math.random() * shuffled.length)
      ;[shuffled[idx1], shuffled[idx2]] = [shuffled[idx2], shuffled[idx1]]
    }

    return shuffled
  }
}
