'use client'
import React, { useMemo, memo } from 'react'
import {
  Circle,
  Triangle,
  X,
  Square,
  Star,
  RotateCw,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Settings,
  Info,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ICard {
  type: 'whot' | 'circle' | 'triangle' | 'cross' | 'square' | 'star'
  value: number
  whotChoosenShape?: 'circle' | 'triangle' | 'cross' | 'square' | 'star' | null
}

interface MoveHistoryItem {
  player: 'player' | 'bot'
  card?: ICard // Make card optional
  timestamp: Date
  action: 'play' | 'draw' | 'pass'
}

interface MovesHistorySidebarProps {
  moves: MoveHistoryItem[]
  className?: string
  onNewGame?: () => void
  onRematch?: () => void
}

export function MovesHistorySidebar({
  moves,
  className = '',
  onNewGame,
  onRematch,
}: MovesHistorySidebarProps) {
  // Memoized analysis to prevent unnecessary recalculations
  const gameAnalysis = useMemo(() => {
    const specialCardCount = {
      pickTwo: 0,
      generalMarket: 0,
      holdOn: 0,
      whot: 0,
      draw: 0,
    }

    const strategicInsights: string[] = []

    moves.forEach((move) => {
      switch (move.action) {
        case 'draw':
          specialCardCount.draw++
          break
        case 'play':
          if (move.card) {
            if (move.card.value === 2) specialCardCount.pickTwo++
            if (move.card.value === 14) specialCardCount.generalMarket++
            if (move.card.value === 1) specialCardCount.holdOn++
            if (move.card.type === 'whot') specialCardCount.whot++
          }
          break
      }
    })

    // Generate strategic insights
    if (specialCardCount.draw > 3) {
      strategicInsights.push(
        'Frequent market draws suggest difficulty matching cards.'
      )
    }

    if (specialCardCount.pickTwo > 2) {
      strategicInsights.push(
        "Multiple 'Pick 2' plays detected. Card accumulation strategy in play."
      )
    }

    return { specialCardCount, strategicInsights }
  }, [moves])

  return (
    <div
      className={cn(
        'bg-white h-full w-full flex flex-col shadow-xl overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="bg-[#570000] text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Bot className="h-6 w-6 mr-3 text-white" />
          <h2 className="text-lg font-bold">Whot Game Insights</h2>
        </div>
        <Button variant="ghost" size="icon" className="text-white">
          <Info className="h-5 w-5" />
        </Button>
      </div>

      {/* Strategic Insights */}
      {gameAnalysis.strategicInsights.length > 0 && (
        <div className="bg-[#FFF3E0] p-3 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-3 text-[#FF9800]" />
          <div>
            {gameAnalysis.strategicInsights.map((insight, index) => (
              <p key={index} className="text-sm text-[#333333] mb-1">
                {insight}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Special Card Analytics */}
      <div className="p-4 bg-[#F5F5F5] grid grid-cols-2 gap-3">
        {Object.entries(gameAnalysis.specialCardCount).map(([key, count]) => (
          <div
            key={key}
            className="bg-white rounded-lg p-3 shadow-sm flex items-center"
          >
            <div className="w-8 h-8 bg-[#570000] rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">{count}</span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[#333333] capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </h4>
            </div>
          </div>
        ))}
      </div>

      {/* Moves List */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b">
              <th className="p-2 text-left font-medium text-gray-500 w-10">
                #
              </th>
              <th className="p-2 text-left font-medium text-gray-500">
                Player
              </th>
              <th className="p-2 text-left font-medium text-gray-500">Bot</th>
            </tr>
          </thead>
          <tbody>
            {moves.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  No moves yet. Let the game begin!
                </td>
              </tr>
            ) : (
              moves.map((move, index) => (
                <MoveRow key={index} move={move} index={index} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-[#F5F5F5] grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="bg-white border-[#570000] text-[#570000] hover:bg-[#570000] hover:text-white"
          onClick={onNewGame}
        >
          <RotateCw className="mr-2 h-4 w-4" /> New Game
        </Button>
        <Button
          variant="outline"
          className="bg-white border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50] hover:text-white"
          onClick={onRematch}
        >
          <RotateCw className="mr-2 h-4 w-4" /> Rematch
        </Button>
      </div>
    </div>
  )
}

// Memoized move row to prevent unnecessary re-renders
const MoveRow = memo(
  ({ move, index }: { move: MoveHistoryItem; index: number }) => (
    <tr className={`${index % 2 === 0 ? 'bg-[#F9F9F9]' : 'bg-white'}`}>
      <td className="p-2 text-gray-500">{index + 1}.</td>
      <td className="p-2">
        <MoveDisplay move={move} />
      </td>
    </tr>
  )
)

// Memoized move display
const MoveDisplay = memo(({ move }: { move: MoveHistoryItem }) => {
  // Handle draw scenario with no card
  if (move.action === 'draw') {
    return (
      <div className="flex items-center text-yellow-600">
        <Download className="h-4 w-4 mr-2" />
        Drew from market
      </div>
    )
  }

  if (move.action === 'pass') {
    return (
      <div className="flex items-center text-red-600">
        <AlertTriangle className="h-4 w-4 mr-2" />
        Passed turn
      </div>
    )
  }

  // Only render card if it exists
  if (!move.card) return null

  return (
    <div className="flex items-center">
      {getCardIcon(move.card)}
      <span className="ml-2">
        {move.card.type === 'whot'
          ? `Whot (${move.card.whotChoosenShape || 'Wild'})`
          : `${move.card.type} ${move.card.value}`}
      </span>
    </div>
  )
})

// Helper function to get the appropriate icon for a card
function getCardIcon(card: ICard) {
  const iconClass = 'h-5 w-5'

  switch (card.type) {
    case 'circle':
      return <Circle className={`${iconClass} text-[#FF6B6B]`} />
    case 'triangle':
      return <Triangle className={`${iconClass} text-[#4ECDC4]`} />
    case 'cross':
      return <X className={`${iconClass} text-[#FFD166]`} />
    case 'square':
      return <Square className={`${iconClass} text-[#6A0572]`} />
    case 'star':
      return <Star className={`${iconClass} text-[#F8961E]`} />
    case 'whot':
      if (card.whotChoosenShape) {
        // If a shape was chosen for the Whot card, show that shape
        return getShapeIcon(card.whotChoosenShape)
      }
      return <div className={`${iconClass} font-bold text-[#570000]`}>W</div>
  }
}

// Helper function to get icon for a chosen shape
function getShapeIcon(
  shape: 'circle' | 'triangle' | 'cross' | 'square' | 'star'
) {
  const iconClass = 'h-5 w-5'

  switch (shape) {
    case 'circle':
      return <Circle className={`${iconClass} text-[#FF6B6B]`} />
    case 'triangle':
      return <Triangle className={`${iconClass} text-[#4ECDC4]`} />
    case 'cross':
      return <X className={`${iconClass} text-[#FFD166]`} />
    case 'square':
      return <Square className={`${iconClass} text-[#6A0572]`} />
    case 'star':
      return <Star className={`${iconClass} text-[#F8961E]`} />
  }
}

// Bot icon component
function Bot({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="10" x="3" y="11" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" x2="8" y1="16" y2="16" />
      <line x1="16" x2="16" y1="16" y2="16" />
    </svg>
  )
}
