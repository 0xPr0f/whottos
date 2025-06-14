'server only'

import { Agent, type Connection, type WSMessage } from 'agents'
import Anthropic from '@anthropic-ai/sdk'

interface Card {
  type: 'whot' | 'circle' | 'triangle' | 'cross' | 'square' | 'star'
  value: number
  whotChoosenShape?: 'circle' | 'triangle' | 'cross' | 'square' | 'star' | null
}

interface MoveHistoryItem {
  player?: 'player' | 'bot' | 'market'
  card?: Card
  timestamp: Date
  action?: 'play' | 'draw'
}

interface WhotGameState {
  gameId: string
  deck: Card[]
  playerHand: Card[]
  botHand: Card[]
  callCardPile: Card[]
  currentPlayer: 'player' | 'bot'
  gameStatus: 'waiting' | 'playing' | 'finished'
  winner?: 'player' | 'bot'
  lastAction?: {
    player: 'player' | 'bot'
    action: 'play' | 'draw'
    card?: Card
  }
  moveHistory: MoveHistoryItem[]
}

type Env = {
  ANTHROPIC_API_KEY?: string
  AI_GATEWAY_TOKEN?: string
  AI_GATEWAY_ACCOUNT_ID?: string
  AI_GATEWAY_ID?: string
  AI?: Ai
}

export class WhotGameAgent extends Agent<Env, WhotGameState> {
  initialState: WhotGameState = {
    gameId: '',
    deck: [],
    playerHand: [],
    botHand: [],
    callCardPile: [],
    currentPlayer: 'player',
    gameStatus: 'waiting',
    moveHistory: [],
  }

  anthropic: Anthropic | null = null
  ai: boolean = true

  async onStart() {
    if (this.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: this.env.ANTHROPIC_API_KEY,
      })
      console.log('Anthropic initialized')
    }
    console.log('Whot Game Agent started with state:', this.state)
  }

  async onConnect(connection: Connection) {
    console.log('Player connected to Whot game')
    connection.send(
      JSON.stringify({
        type: 'gameState',
        state: this.getPlayerView(),
      })
    )
  }

  async onMessage(connection: Connection, message: WSMessage) {
    if (typeof message !== 'string') return

    try {
      const data = JSON.parse(message)
      console.log('onMessage', data)
      let result

      switch (data.action) {
        case 'start_game':
          result = await this.startGame()
          break

        case 'play_card': {
          if (
            this.isValidMove(this.getPlayerView().playerHand[data.cardIndex])
          ) {
            result = await this.playerPlayCard(
              data.cardIndex,
              data.whotChoosenShape
            )
          }
          break
        }
        case 'draw_card':
          result = await this.playerDrawCard()
          break
      }

      connection.send(
        JSON.stringify({
          type: 'gameState',
          state: this.getPlayerView(),
          result,
        })
      )
    } catch (e) {
      console.log(e)
      connection.send(
        JSON.stringify({
          type: 'error',
          message: e,
        })
      )
    }
  }

  getPlayerView() {
    return {
      deckCount: this.state.deck.length,
      playerHand: this.state.playerHand,
      botHandCount: this.state.botHand.length,
      callCardPile: this.state.callCardPile,
      currentPlayer: this.state.currentPlayer,
      gameStatus: this.state.gameStatus,
      winner: this.state.winner,
      lastAction: this.state.lastAction,
      moveHistory: this.state.moveHistory,
    }
  }

  async startGame() {
    const deck = this.createDeck()
    const shuffledDeck = this.shuffleDeck(deck)

    const playerHand = shuffledDeck.splice(0, 5)
    const botHand = shuffledDeck.splice(0, 5)
    const callCardPile = [shuffledDeck.pop()!]

    const moveHistoryItem: MoveHistoryItem = {
      player: 'market',
      action: 'play',
      card: callCardPile[0],
      timestamp: new Date(),
    }

    this.setState({
      ...this.state,
      deck: shuffledDeck,
      playerHand,
      botHand,
      callCardPile,
      currentPlayer: 'player',
      gameStatus: 'playing',
      winner: undefined,
      lastAction: undefined,
      moveHistory: [moveHistoryItem],
    })

    return { success: true }
  }

  async playerPlayCard(
    cardIndex: number,
    whotChoosenShape?:
      | 'circle'
      | 'triangle'
      | 'cross'
      | 'square'
      | 'star'
      | null
  ) {
    if (
      this.state.currentPlayer !== 'player' ||
      this.state.gameStatus !== 'playing' ||
      cardIndex >= this.state.playerHand.length
    ) {
      console.log('Player Invalid move')
      return { success: false, message: 'Invalid move' }
    }

    const card = this.state.playerHand[cardIndex]

    if (!this.isValidMove(card)) {
      return {
        success: false,
        message: 'Card cannot be played on current discard',
      }
    }

    const playerHand = [...this.state.playerHand]
    const playedCard = playerHand.splice(cardIndex, 1)[0]

    if (playedCard.type === 'whot') {
      playedCard.whotChoosenShape = whotChoosenShape
    }

    const moveHistoryItem: MoveHistoryItem = {
      player: 'player',
      action: 'play',
      card: playedCard,
      timestamp: new Date(),
    }

    this.setState({
      ...this.state,
      playerHand,
      callCardPile: [...this.state.callCardPile, playedCard],
      lastAction: {
        player: 'player',
        action: 'play',
        card: playedCard,
      },
      moveHistory: [...this.state.moveHistory, moveHistoryItem],
    })

    if (playerHand.length === 0) {
      this.setState({
        ...this.state,
        gameStatus: 'finished',
        winner: 'player',
      })

      return { success: true, gameOver: true, winner: 'player' }
    }
    const specialCardPlayed = this.enforceCardProperties(playedCard)

    if (!specialCardPlayed) {
      await this.schedule(2, 'botMove')
    }
    this.broadcast(
      JSON.stringify({
        type: 'gameState',
        state: this.getPlayerView(),
      })
    )
    return { success: true }
  }

  async playerDrawCard() {
    if (
      this.state.currentPlayer !== 'player' ||
      this.state.gameStatus !== 'playing'
    ) {
      return { success: false, message: 'Not your turn' }
    }

    if (this.state.deck.length === 0) {
      return this.endGameByCardCount()
    } else {
      const deck = [...this.state.deck]
      const drawnCard = deck.pop()

      const moveHistoryItem: MoveHistoryItem = {
        player: 'player',
        action: 'draw',
        timestamp: new Date(),
      }

      this.setState({
        ...this.state,
        deck,
        playerHand: [...this.state.playerHand!, drawnCard!],
        currentPlayer: 'bot',
        lastAction: {
          player: 'player',
          action: 'draw',
        },
        moveHistory: [...this.state.moveHistory, moveHistoryItem],
      })
    }

    await this.schedule(2, 'botMove')
    return { success: true }
  }

  async botMove() {
    if (
      this.state.currentPlayer !== 'bot' ||
      this.state.gameStatus !== 'playing'
    ) {
      return
    }
    let botPlayedMove
    try {
      if (this.ai) {
        botPlayedMove = await this.makeBotMoveWithAI()
      } else {
        botPlayedMove = await this.makeBotMoveBasic()
      }
    } catch (error) {
      botPlayedMove = await this.makeBotMoveBasic()
    }
    if (botPlayedMove) {
      this.enforceCardProperties(botPlayedMove)
    }

    if (this.state.deck.length === 0) {
      this.endGameByCardCount()
      return
    }
    this.broadcast(
      JSON.stringify({
        type: 'gameState',
        state: this.getPlayerView(),
      })
    )
    if (this.state.currentPlayer === 'bot') {
      await this.schedule(2, 'botMove')
    }
  }
  private async makeBotMoveBasic() {
    const validMoves = this.findBotValidMoves()

    if (validMoves.length > 0) {
      const bestMoveIndex = this.chooseBestMove(validMoves)
      const botHand = [...this.state.botHand]
      const playedCard = botHand.splice(bestMoveIndex, 1)[0]

      if (playedCard.type === 'whot') {
        const shapes = botHand.reduce((acc: Record<string, number>, card) => {
          if (card.type !== 'whot') {
            acc[card.type] = (acc[card.type] || 0) + 1
          }
          return acc
        }, {})

        const mostCommonShape = Object.entries(shapes).reduce(
          (max, [shape, count]) => (count > max[1] ? [shape, count] : max),
          ['circle', 0]
        )[0] as 'circle' | 'triangle' | 'cross' | 'square' | 'star'

        playedCard.whotChoosenShape = mostCommonShape
      }

      const moveHistoryItem: MoveHistoryItem = {
        player: 'bot',
        action: 'play',
        card: playedCard,
        timestamp: new Date(),
      }

      this.setState({
        ...this.state,
        botHand,
        callCardPile: [...this.state.callCardPile, playedCard],
        lastAction: {
          player: 'bot',
          action: 'play',
          card: playedCard,
        },
        moveHistory: [...this.state.moveHistory, moveHistoryItem],
      })

      if (botHand.length === 0) {
        this.setState({
          ...this.state,
          gameStatus: 'finished',
          winner: 'bot',
        })
      }
      return playedCard
    } else {
      if (this.state.deck.length > 0) {
        const deck = [...this.state.deck]
        const drawnCard = deck.pop()

        const moveHistoryItem: MoveHistoryItem = {
          player: 'bot',
          action: 'draw',
          timestamp: new Date(),
        }

        this.setState({
          ...this.state,
          deck,
          botHand: [...this.state.botHand!, drawnCard!],
          currentPlayer: 'player',
          lastAction: {
            player: 'bot',
            action: 'draw',
          },
          moveHistory: [...this.state.moveHistory, moveHistoryItem],
        })
      }
    }
  }
  private async cloudflareHostedBot(gameState: any) {
    const response = await this.env.AI!.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      {
        messages: [
          {
            role: 'system' as const,
            content: this.messagePrompt(gameState).system,
          },
          {
            role: 'user' as const,
            content: this.messagePrompt(gameState).message,
          },
        ],
      }
    )
    return response
  }
  private async anthropicAIBotMove(gameState: any) {
    if (!this.anthropic) return new Error('No anthropic instance')
    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: this.messagePrompt(gameState).system,
      messages: [
        {
          role: 'user' as const,
          content: this.messagePrompt(gameState).message,
        },
      ],
    })
    return response
  }
  private async makeBotMoveWithAI() {
    if (!this.ai) return this.makeBotMoveBasic()
    let content
    try {
      const gameState = {
        botHand: this.state.botHand,
        topCard: this.state.callCardPile[this.state.callCardPile.length - 1],
        playerHandSize: this.state.playerHand.length,
        deckSize: this.state.deck.length,
        validMoves: this.findBotValidMoves().map((i) => this.state.botHand[i]),
      }
      const response = await this.cloudflareHostedBot(gameState)

      content = JSON.stringify((response as any).response)
      console.log(content)
      let strategy

      if (content.startsWith('```json')) {
        content = content.replace(/```json\n/, '').replace(/\n```$/, '')
      } else if (content.startsWith('```')) {
        content = content.replace(/```\n/, '').replace(/\n```$/, '')
      }

      const strat_parse = JSON.parse(content)
      strategy = strat_parse

      console.log(
        'makeBotMoveWithAI',
        `Top Pile Card: ${JSON.stringify(gameState.topCard, null, 2)}`,
        `Bot Hand: ${JSON.stringify(this.state.botHand, null, 2)}`,
        `Bot Moves: [${this.findBotValidMoves()}]`,
        strategy
      )
      if (strategy.action === 'play' && strategy.cardIndex !== undefined) {
        const botHand = [...this.state.botHand]
        const playedCard = botHand.splice(strategy.cardIndex, 1)[0]

        if (playedCard.type === 'whot') {
          playedCard.whotChoosenShape = strategy.whotChoosenShape
        }
        if (!this.isValidMove(playedCard)) {
          throw new Error('Card Played is not valid move')
        }

        const moveHistoryItem: MoveHistoryItem = {
          player: 'bot',
          action: 'play',
          card: playedCard,
          timestamp: new Date(),
        }

        this.setState({
          ...this.state,
          botHand,
          callCardPile: [...this.state.callCardPile, playedCard],
          lastAction: {
            player: 'bot',
            action: 'play',
            card: playedCard,
          },
          moveHistory: [...this.state.moveHistory, moveHistoryItem],
        })

        if (botHand.length === 0) {
          this.setState({
            ...this.state,
            gameStatus: 'finished',
            winner: 'bot',
          })
        }
        return playedCard
      } else {
        if (this.state.deck.length > 0) {
          const deck = [...this.state.deck]
          const drawnCard = deck.pop()

          const moveHistoryItem: MoveHistoryItem = {
            player: 'bot',
            action: 'draw',
            timestamp: new Date(),
          }

          this.setState({
            ...this.state,
            deck,
            botHand: [...this.state.botHand!, drawnCard!],
            currentPlayer: 'player',
            lastAction: {
              player: 'bot',
              action: 'draw',
            },
            moveHistory: [...this.state.moveHistory, moveHistoryItem],
          })
        }
      }
    } catch (error) {
      console.error('AI strategy failed:', error)
      console.log(JSON.parse(content))
      throw new Error('Failed to play AI move', error as any)
    }
  }

  private findBotValidMoves() {
    const validMoves = []
    for (let i = 0; i < this.state.botHand.length; i++) {
      const card = this.state.botHand[i]
      if (
        this.isValidMove(
          card,
          this.state.callCardPile[this.state.callCardPile.length - 1]
        )
      ) {
        validMoves.push(i as never)
      }
    }
    return validMoves
  }

  private endGameByCardCount():
    | Card
    | {
        success: boolean
        gameOver: boolean
        winner: 'player' | 'bot' | undefined
      } {
    const calculateTotalCardValue = (hand: Card[]): number => {
      return hand.reduce((total, card) => {
        return total + card.value
      }, 0)
    }

    const playerCardTotal = calculateTotalCardValue(this.state.playerHand)
    const botCardTotal = calculateTotalCardValue(this.state.botHand)

    this.setState({
      ...this.state,
      gameStatus: 'finished',
      winner:
        playerCardTotal < botCardTotal
          ? 'player'
          : botCardTotal < playerCardTotal
          ? 'bot'
          : undefined,
    })
    this.broadcast(
      JSON.stringify({
        type: 'gameState',
        state: this.getPlayerView(),
      })
    )
    return {
      success: true,
      gameOver: true,
      winner:
        playerCardTotal < botCardTotal
          ? 'player'
          : botCardTotal < playerCardTotal
          ? 'bot'
          : undefined,
    }
  }

  private chooseBestMove(validMoveIndices: number[]) {
    if (this.state.playerHand.length <= 2) {
      for (const index of validMoveIndices) {
        const card = this.state.botHand[index]
        if (card.value === 20 || card.value === 14 || card.value === 8) {
          return index
        }
      }
    }

    let bestIndex = validMoveIndices[0]
    let highestValue = this.state.botHand[validMoveIndices[0]].value

    for (const index of validMoveIndices) {
      const cardValue = this.state.botHand[index].value
      if (cardValue > highestValue) {
        highestValue = cardValue
        bestIndex = index
      }
    }

    return bestIndex
  }

  private enforceCardProperties(card: Card) {
    if (card.value === 2) {
      const nextPlayer =
        this.state.currentPlayer === 'player' ? 'bot' : 'player'
      const deck = [...this.state.deck]

      const drawnCards: Card[] = []
      if (deck.length > 0) drawnCards.push(deck.pop()!)
      if (deck.length > 0) drawnCards.push(deck.pop()!)

      this.setState({
        ...this.state,
        deck,
        playerHand:
          nextPlayer === 'player'
            ? [...this.state.playerHand, ...drawnCards]
            : this.state.playerHand,
        botHand:
          nextPlayer === 'bot'
            ? [...this.state.botHand, ...drawnCards]
            : this.state.botHand,
      })
      return true
    } else if (card.value === 1) {
      return true
    } else if (card.value === 14) {
      const deck = [...this.state.deck]

      if (deck.length > 0) {
        const drawnCard = deck.pop()!

        this.setState({
          ...this.state,
          deck,
          playerHand:
            this.state.currentPlayer === 'bot'
              ? [...this.state.playerHand, drawnCard]
              : this.state.playerHand,
          botHand:
            this.state.currentPlayer === 'player'
              ? [...this.state.botHand, drawnCard]
              : this.state.botHand,
          currentPlayer: this.state.currentPlayer,
        })
      }

      return true
    }
    this.setState({
      ...this.state,
      currentPlayer: this.state.currentPlayer === 'bot' ? 'player' : 'bot',
    })
    return false
  }

  private isValidMove(card: Card, topCard?: Card) {
    if (!topCard) {
      if (!this.state.callCardPile || this.state.callCardPile.length === 0) {
        return false
      }
      topCard = this.state.callCardPile[this.state.callCardPile.length - 1]
    }
    if (topCard.type === 'whot' && this.state.callCardPile.length === 1) {
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

  private createDeck() {
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

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
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

  private messagePrompt(gameState: any) {
    return {
      role: 'user',
      system: `YOU ARE AN AI PLAYING WHOT CARD GAME. YOUR CORE OBJECTIVE IS TO WIN BY STRATEGICALLY MANAGING YOUR CARDS.
FUNDAMENTAL GAME STRATEGY:
1. PRIMARY DECISION FRAMEWORK:
   - Reduce your hand size
   - Block opponent's winning potential
   - Preserve powerful cards
   - Draw if no valid moves possible

2. WHOT CARD MASTERY:
   - Whot card ('whot' type card) is your most flexible weapon
   - Choose shape strategically:
     * Favor shapes you have in hand
     * Disrupt opponent's strategy
     * Maximize your advantage

3. SPECIAL NUMBER CARD TACTICS:
   - Leverage powerful number cards:
     * Value 2: Force opponent to draw two cards
     * Value 14: Make others draw one card
     * Value 1: Skip next player's turn

4. CORE PLAY RULES:
   - Match cards by value or type
   - Whot cards play on any non-whot card
   - Shape choice affects next player's options

5. REASONING REQUIREMENTS:
   - Explain move clearly
   - Link reasoning to game state
   - Show strategic thinking

OUTPUT STRICT FORMAT:
{
  "action": "play" or "draw",
  "cardIndex": (if playing),
  "whotChoosenShape": (if whot card),
  "reasoning": "Strategic explanation"
}


CRITICAL CONSTRAINTS:
- Use only valid move indices
- Whot shape choice must be strategic
- Reasoning must be specific and logical`,

      message: `
YOU ARE AN AI PLAYING A WHOT CARD GAME. 
YOUR GOAL: Win by playing valid moves and managing your cards strategically.

GAME STATE:
- My Hand: ${JSON.stringify(gameState.botHand)}
- Top Discard Card: ${JSON.stringify(gameState.topCard)}
- Opponent's Cards: ${gameState.playerHandSize}
- Deck Remaining: ${gameState.deckSize}
- Valid Moves: ${JSON.stringify(gameState.validMoves)}
- Valid Move Indices: ${JSON.stringify(this.findBotValidMoves())}

CONSTRAINTS:
1. Output ONLY valid JSON in the exact format below, with NO extra text.
2. Must choose a valid cardIndex if action = "play".
3. If playing a Whot card, pick a shape that benefits your strategy, your Hand AND that you can realistically use.
4. Provide a concise "reasoning" string that explains your choice. 
5. If no valid moves, "draw" is acceptable.

JSON FORMAT (MUST MATCH EXACTLY):
\`\`\`json
{
  "action": "play" or "draw",
  "cardIndex": (integer if action=play),
  "whotChoosenShape": "circle" | "triangle" | "cross" | "square" | "star" (if whot),
  "reasoning": "Your short strategic explanation"
}
\`\`\`

MAKE YOUR STRATEGIC MOVE NOW.
    `,
    }
  }
}
