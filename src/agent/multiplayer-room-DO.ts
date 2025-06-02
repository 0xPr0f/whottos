import { DurableObject } from 'cloudflare:workers'

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
  // more config later
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
  playerId: string
  action: 'play' | 'draw'
  card?: Card
  timestamp: Date
}

interface WhotGameState {
  whotPlayers: WhotPlayer[]
  deck: Card[]
  callCardPile: Card[]
  currentPlayerIndex: number
  gameStatus: 'waiting' | 'playing' | 'finished'
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

export class MultiplayerRoomDO extends DurableObject<Env> {
  private readonly DISCONNECT_TIMEOUT = 15 * 60 * 1000 // 15 minutes
  private readonly MAX_WHOT_PLAYERS = 5
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

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.state = state
    Promise.all([
      state.storage.get<Player[]>('players'),
      state.storage.get<ChatMessage[]>('chatMessages'),
      state.storage.get<WhotConfig>('gameConfig'),
      state.storage.get<boolean>('gameStarted'),
      state.storage.get<WhotGameState>('whotGame'),
    ])
      .then(([players, chatMessages, gameConfig, gameStarted, whotGame]) => {
        this.players = (players || []).map((p) => ({
          ...p,
          connected: false,
          lastSeen: p.lastSeen || Date.now(),
        }))
        this.chatMessages = chatMessages || []
        this.gameConfig = gameConfig || this.gameConfig
        this.gameStarted = gameStarted || false
        this.whotGame = whotGame || null

        console.log('State restored from storage:', {
          playerCount: this.players.length,
          chatMessageCount: this.chatMessages.length,
          gameConfig: this.gameConfig,
          gameStarted: this.gameStarted,
          whotGame: this.whotGame,
        })

        this.cleanupDisconnectedPlayers()
        this.state.storage.setAlarm(Date.now() + 60 * 1000)
      })
      .catch((error) => {
        console.error('Failed to initialize state from storage:', error)
      })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const roomId = url.pathname.split('/').pop()!
    const playerId = url.searchParams.get('playerId')!
    const playerName = url.searchParams.get('playerName')

    // Handle WebSocket connections
    if (request.headers.get('Upgrade') === 'websocket') {
      if (!playerId || !playerName) {
        return new Response('Missing playerId or playerName', { status: 400 })
      }

      const { 0: client, 1: server } = new WebSocketPair()
      this.state.acceptWebSocket(server, [roomId])
      this.wsMap.set(playerId, server)
      console.log(
        `Accepted WebSocket for playerId: ${playerId}, wsMap size: ${this.wsMap.size}`
      )

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
      return new Response(JSON.stringify(state), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method Not Allowed', { status: 405 })
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

    const persistAndBroadcast = async (evt: string, additionalData = {}) => {
      try {
        await Promise.all([
          this.state.storage.put('players', this.players),
          this.state.storage.put('chatMessages', this.chatMessages),
          this.state.storage.put('gameConfig', this.gameConfig),
          this.state.storage.put('gameStarted', this.gameStarted),
          this.state.storage.put('whotGame', this.whotGame),
        ])
        console.log(`Persisted state for event ${evt}`, {
          playerCount: this.players.length,
          chatMessageCount: this.chatMessages.length,
          gameConfig: this.gameConfig,
          gameStarted: this.gameStarted,
          whotGame: this.whotGame,
        })

        this.broadcast({
          type: evt,
          roomId,
          players: this.players,
          chatMessages: this.chatMessages,
          config: this.gameConfig,
          gameStarted: this.gameStarted,
          whotGame: this.whotGame,
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
      }
      this.wsMap.set(playerId, ws)
      console.log(
        `Player ${playerId} joined, connected: ${pl.connected}, name: ${pl.name}`
      )
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
      console.log(`Updated game config:`, this.gameConfig)
      await persistAndBroadcast('game-config', { config: this.gameConfig })
    } else if (type === 'start-game') {
      if (this.players[0]?.id === playerId && !this.gameStarted) {
        this.gameStarted = true
        console.log(`Game started by ${playerId} with config:`, this.gameConfig)
        await this.startWhotGame()
        await persistAndBroadcast('start-game', { config: this.gameConfig })
      }
    } else if (type === 'play-card') {
      if (this.whotGame && this.whotGame.gameStatus === 'playing') {
        const result = await this.playerPlayCard(
          playerId,
          msg.cardIndex,
          msg.whotChoosenShape
        )
        await persistAndBroadcast('whot-game-update', result)
      }
    } else if (type === 'draw-card') {
      if (this.whotGame && this.whotGame.gameStatus === 'playing') {
        const result = await this.playerDrawCard(playerId)
        await persistAndBroadcast('whot-game-update', result)
      }
    }
  }

  async webSocketClose(ws: WebSocket) {
    console.log('WebSocket closed, cleaning up')
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
      console.log(
        `Persisted players state after disconnect, wsMap size: ${this.wsMap.size}`
      )
      if (disconnectedPlayerId) {
        if (
          this.whotGame &&
          this.whotGame.whotPlayers.some((p) => p.id === disconnectedPlayerId)
        ) {
          const connectedPlayers = this.whotGame.whotPlayers.filter((p) =>
            this.players.find((pl) => pl.id === p.id && pl.connected)
          )
          if (connectedPlayers.length < 2) {
            this.whotGame.gameStatus = 'finished'
            this.whotGame.winner = undefined
            console.log('Whot game ended due to insufficient players')
          }
        }
        this.broadcast({
          type: 'player-left',
          playerId: disconnectedPlayerId,
          players: this.players,
          chatMessages: this.chatMessages,
          config: this.gameConfig,
          gameStarted: this.gameStarted,
          whotGame: this.whotGame,
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
      console.log(
        `Persisted players state after error, wsMap size: ${this.wsMap.size}`
      )
      if (disconnectedPlayerId) {
        if (
          this.whotGame &&
          this.whotGame.whotPlayers.some((p) => p.id === disconnectedPlayerId)
        ) {
          const connectedPlayers = this.whotGame.whotPlayers.filter((p) =>
            this.players.find((pl) => pl.id === p.id && pl.connected)
          )
          if (connectedPlayers.length < 2) {
            this.whotGame.gameStatus = 'finished'
            this.whotGame.winner = undefined
            console.log('Whot game ended due to insufficient players')
          }
        }
        this.broadcast({
          type: 'player-left',
          playerId: disconnectedPlayerId,
          players: this.players,
          chatMessages: this.chatMessages,
          config: this.gameConfig,
          gameStarted: this.gameStarted,
          whotGame: this.whotGame,
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
      console.log('Persisted players state during alarm')
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
        console.log(
          `Cleaned disconnected players, remaining: ${this.players.length}`
        )
        this.broadcast({
          type: 'room-update',
          players: this.players,
          chatMessages: this.chatMessages,
          config: this.gameConfig,
          gameStarted: this.gameStarted,
          whotGame: this.whotGame,
        })
      } catch (error) {
        console.error('Failed to persist players state during cleanup:', error)
      }
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

  private async startWhotGame() {
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
      playerId: 'market',
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

    console.log(`Whot game started with ${whotPlayers.length} players`)
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
  ) {
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
    if (!this.isValidMove(card)) {
      return {
        success: false,
        message: 'Card cannot be played on current discard',
      }
    }

    const playerHand = [...currentPlayer.hand]
    const playedCard = playerHand.splice(cardIndex, 1)[0]

    if (playedCard.type === 'whot' && whotChoosenShape) {
      playedCard.whotChoosenShape = whotChoosenShape
    }

    const moveHistoryItem: MoveHistoryItem = {
      playerId,
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
      return { success: true, gameOver: true, winner: playerId }
    }
    const specialCardPlayed = this.enforceCardProperties(playedCard)

    if (!specialCardPlayed) {
      this.advanceTurn()
    }

    return { success: true }
  }

  private async playerDrawCard(playerId: string) {
    if (!this.whotGame || this.whotGame.gameStatus !== 'playing') {
      return { success: false, message: 'Game not in progress' }
    }

    const currentPlayer =
      this.whotGame.whotPlayers[this.whotGame.currentPlayerIndex]
    if (currentPlayer.id !== playerId) {
      return { success: false, message: 'Not your turn' }
    }

    if (this.whotGame.deck.length === 0) {
      return this.endGameByCardCount()
    }

    const deck = [...this.whotGame.deck]
    const drawnCard = deck.pop()!

    const moveHistoryItem: MoveHistoryItem = {
      playerId,
      action: 'draw',
      timestamp: new Date(),
    }

    this.whotGame.deck = deck
    currentPlayer.hand.push(drawnCard)
    this.whotGame.lastAction = {
      playerId,
      action: 'draw',
    }
    this.whotGame.moveHistory.push(moveHistoryItem)

    this.advanceTurn()

    return { success: true }
  }

  private advanceTurn() {
    if (!this.whotGame) return

    let nextIndex =
      (this.whotGame.currentPlayerIndex + 1) % this.whotGame.whotPlayers.length

    while (
      !this.players.find(
        (p) => p.id === this.whotGame!.whotPlayers[nextIndex].id && p.connected
      )
    ) {
      nextIndex = (nextIndex + 1) % this.whotGame.whotPlayers.length
      if (nextIndex === this.whotGame.currentPlayerIndex) break
    }
    this.whotGame.currentPlayerIndex = nextIndex

    const currentPlayer =
      this.whotGame.whotPlayers[this.whotGame.currentPlayerIndex]
    const topCard =
      this.whotGame.callCardPile[this.whotGame.callCardPile.length - 1]
    const canPlay = currentPlayer.hand.some((card) =>
      this.isValidMove(card, topCard)
    )

    if (!canPlay && this.whotGame.deck.length > 0) {
      const deck = [...this.whotGame.deck]
      const drawnCard = deck.pop()!
      currentPlayer.hand.push(drawnCard)

      const moveHistoryItem: MoveHistoryItem = {
        playerId: currentPlayer.id,
        action: 'draw',
        timestamp: new Date(),
      }

      this.whotGame.deck = deck
      this.whotGame.lastAction = {
        playerId: currentPlayer.id,
        action: 'draw',
      }
      this.whotGame.moveHistory.push(moveHistoryItem)

      nextIndex =
        (this.whotGame.currentPlayerIndex + 1) %
        this.whotGame.whotPlayers.length
      while (
        !this.players.find(
          (p) =>
            p.id === this.whotGame!.whotPlayers[nextIndex].id && p.connected
        )
      ) {
        nextIndex = (nextIndex + 1) % this.whotGame.whotPlayers.length
        if (nextIndex === this.whotGame.currentPlayerIndex) break
      }
      this.whotGame.currentPlayerIndex = nextIndex
    }
  }

  private enforceCardProperties(card: Card): boolean {
    if (!this.whotGame) return false

    const numPlayers = this.whotGame.whotPlayers.length
    let nextPlayerIndex = (this.whotGame.currentPlayerIndex + 1) % numPlayers

    while (
      !this.players.find(
        (p) =>
          p.id === this.whotGame!.whotPlayers[nextPlayerIndex].id && p.connected
      )
    ) {
      nextPlayerIndex = (nextPlayerIndex + 1) % numPlayers
      if (nextPlayerIndex === this.whotGame.currentPlayerIndex) break
    }

    if (card.value === 1) {
      this.whotGame.currentPlayerIndex = (nextPlayerIndex + 1) % numPlayers
      while (
        !this.players.find(
          (p) =>
            p.id ===
              this.whotGame!.whotPlayers[this.whotGame!.currentPlayerIndex]
                .id && p.connected
        )
      ) {
        this.whotGame.currentPlayerIndex =
          (this.whotGame.currentPlayerIndex + 1) % numPlayers
      }
      return true
    } else if (card.value === 2 && this.whotGame.gameConfig.pick2) {
      const deck = [...this.whotGame.deck]
      const drawnCards: Card[] = []
      if (deck.length > 0) drawnCards.push(deck.pop()!)
      if (deck.length > 0) drawnCards.push(deck.pop()!)

      this.whotGame.deck = deck
      this.whotGame.whotPlayers[nextPlayerIndex].hand.push(...drawnCards)
      this.whotGame.currentPlayerIndex = (nextPlayerIndex + 1) % numPlayers
      while (
        !this.players.find(
          (p) =>
            p.id ===
              this.whotGame!.whotPlayers[this.whotGame!.currentPlayerIndex]
                .id && p.connected
        )
      ) {
        this.whotGame.currentPlayerIndex =
          (this.whotGame.currentPlayerIndex + 1) % numPlayers
      }
      return true
    } else if (card.value === 14) {
      const deck = [...this.whotGame.deck]
      for (let i = 0; i < numPlayers; i++) {
        if (i !== this.whotGame.currentPlayerIndex && deck.length > 0) {
          const drawnCard = deck.pop()!
          this.whotGame.whotPlayers[i].hand.push(drawnCard)
        }
      }
      this.whotGame.deck = deck
      this.whotGame.currentPlayerIndex = nextPlayerIndex
      return true
    }

    this.whotGame.currentPlayerIndex = nextPlayerIndex
    return false
  }

  private endGameByCardCount() {
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

    return { success: true, gameOver: true, winner: winnerId }
  }

  private isValidMove(card: Card, topCard?: Card): boolean {
    if (
      !this.whotGame ||
      !this.whotGame.callCardPile ||
      this.whotGame.callCardPile.length === 0
    ) {
      return false
    }

    topCard =
      topCard ||
      this.whotGame.callCardPile[this.whotGame.callCardPile.length - 1]

    if (topCard.type === 'whot' && this.whotGame.callCardPile.length === 1) {
      return true
    }

    if (card.value === 20 && topCard.value !== 20) {
      return true
    }

    if (topCard.value === 20 && topCard.whotChoosenShape) {
      return topCard.whotChoosenShape === card.type
    }

    return topCard.type === card.type || topCard.value === card.value
  }

  private createDeck(): Card[] {
    const deck: Card[] = []

    // Circles: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14
    for (const value of [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]) {
      deck.push({ type: 'circle', value, whotChoosenShape: null })
    }

    // Triangles: 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14
    for (const value of [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]) {
      deck.push({ type: 'triangle', value, whotChoosenShape: null })
    }

    // Crosses: 1, 2, 3, 5, 7, 10, 11, 13, 14
    for (const value of [1, 2, 3, 5, 7, 10, 11, 13, 14]) {
      deck.push({ type: 'cross', value, whotChoosenShape: null })
    }

    // Squares: 1, 2, 3, 5, 7, 10, 11, 13, 14
    for (const value of [1, 2, 3, 5, 7, 10, 11, 13, 14]) {
      deck.push({ type: 'square', value, whotChoosenShape: null })
    }

    // Stars: 1, 2, 3, 4, 5, 7, 8
    for (const value of [1, 2, 3, 4, 5, 7, 8]) {
      deck.push({ type: 'star', value, whotChoosenShape: null })
    }

    // 5 "Whot" cards numbered 20
    for (let i = 0; i < 5; i++) {
      deck.push({ type: 'whot', value: 20, whotChoosenShape: null })
    }

    return deck
  }

  private shuffleDeck(deck: Card[]): Card[] {
    let shuffled = [...deck]

    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Riffle shuffle simulation
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

    // Cut the deck
    const cutDeck = (cards: Card[]) => {
      const cutPoint = Math.floor(Math.random() * (cards.length - 5)) + 3
      return [...cards.slice(cutPoint), ...cards.slice(0, cutPoint)]
    }

    const numCuts = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < numCuts; i++) {
      shuffled = cutDeck(shuffled)
    }

    // Additional shuffle with timestamp entropy
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
