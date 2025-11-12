import type {
  ChatMessage,
  Player,
  WhotConfig,
  WhotGameState,
  LeaderboardEntry,
} from './game'

export type InboundMessageType =
  | 'room-update'
  | 'pong'
  | 'score-update'
  | 'player-left'
  | 'chat-message'
  | 'game-config'
  | 'start-game'
  | 'whot-game-update'
  | 'error'

export interface InboundWebSocketMessage {
  type: InboundMessageType
  players?: Player[]
  chatMessages?: ChatMessage[]
  config?: WhotConfig
  gameStarted?: boolean
  whotGame?: WhotGameState | null
  leaderboard?: LeaderboardEntry[]
  ranked?: boolean
  playerId?: string
  playerName?: string
  message?: string
  timestamp?: string
}

export function isChatMessage(value: unknown): value is ChatMessage {
  return (
    !!value &&
    typeof (value as any).playerId === 'string' &&
    typeof (value as any).playerName === 'string' &&
    typeof (value as any).message === 'string' &&
    typeof (value as any).timestamp === 'string'
  )
}
