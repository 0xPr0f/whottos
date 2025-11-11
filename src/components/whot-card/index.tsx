'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Card } from '@/types/game'

type WhotCardProps = {
  card?: Card
  faceDown?: boolean
  className?: string
}

const shapes = {
  circle: { symbol: '●' },
  triangle: { symbol: '▲' },
  square: { symbol: '■' },
  star: { symbol: '★' },
  cross: { symbol: '✚' },
  whot: { symbol: 'W' },
}

export default function WhotCard({
  card,
  faceDown = false,
  className,
}: WhotCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Add a subtle animation on mount
    const timeout = setTimeout(() => {
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 500)
    }, 100)

    return () => clearTimeout(timeout)
  }, [])

  if (!card) return null

  const isWhot = card.type === 'whot'
  const cardSymbol = shapes[card.type]?.symbol || 'W'

  const generateCardBack = () => (
    <div className="absolute inset-0 bg-[#570000] border-2 border-white rounded-lg flex flex-col items-center justify-center overflow-hidden">
      <div className="text-white text-2xl font-bold">WHOT</div>
      <div className="text-white text-4xl font-bold mt-2">W</div>
    </div>
  )

  if (faceDown) {
    return (
      <div
        className={cn(
          'relative w-24 h-36 md:w-32 md:h-48 rounded-lg shadow-lg overflow-hidden transition-all duration-500 ease-in-out',
          className
        )}
      >
        {generateCardBack()}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative w-24 h-36 md:w-32 md:h-48 rounded-lg shadow-lg overflow-hidden transition-all duration-500 ease-in-out',
        isHovered && 'shadow-2xl scale-110 z-50',
        isAnimating && 'animate-pulse',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0 bg-white border-2 border-[#570000] rounded-lg flex flex-col items-center justify-center overflow-hidden">
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br from-white via-transparent to-transparent opacity-0 transition-opacity duration-500',
            isHovered && 'opacity-70'
          )}
          style={{
            transform: isHovered
              ? 'translateX(50%) translateY(-50%) rotate(30deg)'
              : 'translateX(-100%) translateY(-100%) rotate(30deg)',
            transition: 'transform 0.5s ease-out, opacity 0.5s ease-out',
          }}
        />

        {isWhot ? (
          <>
            <div
              className={cn(
                'text-[#570000] text-2xl md:text-4xl font-bold transition-transform duration-300',
                isHovered && 'scale-110'
              )}
            >
              WHOT
            </div>
            <div
              className={cn(
                'text-[#570000] text-5xl md:text-7xl font-bold mt-2 transition-transform duration-300',
                isHovered && 'scale-110 rotate-12'
              )}
            >
              W
            </div>
          </>
        ) : (
          <>
            <div className="absolute top-2 left-2 text-[#570000] text-xl md:text-2xl font-bold">
              {card.value}
            </div>
            <div className="absolute bottom-2 right-2 text-[#570000] text-xl md:text-2xl font-bold transform rotate-180">
              {card.value}
            </div>
            <div
              className={cn(
                'text-[#570000] text-4xl md:text-6xl transition-transform duration-300',
                isHovered && 'scale-125 rotate-12'
              )}
            >
              {cardSymbol}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
