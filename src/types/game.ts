// Shared game-related TypeScript types used across UI components

export interface Player {
  id: string
  name: string
  score: number
  connected: boolean
  lastSeen?: number
}

export interface ChatMessage {
  playerId: string
  playerName: string
  message: string
  timestamp: string
}

export interface WhotConfig {
  pick2: boolean
  pick3: boolean
  whotEnabled: boolean
}

export interface Card {
  type: 'whot' | 'circle' | 'triangle' | 'cross' | 'square' | 'star'
  value: number
  whotChosenShape?: 'circle' | 'triangle' | 'cross' | 'square' | 'star' | null
}

export interface WhotPlayer {
  id: string
  name: string
  hand: Card[]
}

export interface MoveHistoryItem {
  player: 'player' | 'bot' | 'market' | string
  action: 'play' | 'draw'
  card?: Card
  timestamp: Date
}

export interface WhotGameState {
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

export interface GameState {
  players: Player[]
  chatMessages: ChatMessage[]
  gameConfig: WhotConfig
  gameStarted: boolean
  whotGame?: WhotGameState | null
  ranked?: boolean
}

export interface LeaderboardEntry {
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
