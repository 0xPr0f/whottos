'use client'

import type React from 'react'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  generateWhotCard,
  generateCircleCard,
  generateCrossCard,
  generateSquareCard,
  generateTriangleCard,
  generateStarCard,
} from '@/components/whot-card/card-svg-generation/generate-cards'

export type CardShape =
  | 'circle'
  | 'cross'
  | 'triangle'
  | 'square'
  | 'star'
  | 'whot'
export type CardValue =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 20

export interface WhotCardProps {
  id: string
  value: CardValue
  shape: CardShape
  faceUp?: boolean
  isPlayable?: boolean
  onClick?: (id: string) => void
  className?: string
  style?: React.CSSProperties
}

export default function WhotCard({
  id,
  value,
  shape,
  faceUp = true,
  isPlayable = false,
  onClick,
  className,
  style,
}: WhotCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleClick = () => {
    if (isPlayable && onClick) {
      onClick(id)
    }
  }

  const renderCard = () => {
    if (!faceUp) {
      return generateWhotCard(0) // Back of card
    }

    switch (shape) {
      case 'circle':
        return generateCircleCard(Number(value))
      case 'cross':
        return generateCrossCard(Number(value))
      case 'triangle':
        return generateTriangleCard(Number(value))
      case 'square':
        return generateSquareCard(Number(value))
      case 'star':
        return generateStarCard(Number(value))
      case 'whot':
        return generateWhotCard(Number(value))
      default:
        return generateCircleCard(Number(value))
    }
  }

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        'relative cursor-default',
        isPlayable ? 'cursor-pointer' : '',
        className
      )}
      style={style}
      whileHover={isPlayable ? { y: -10, zIndex: 50 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      onClick={handleClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      layout
    >
      {renderCard()}

      {isPlayable && (
        <motion.div
          className="absolute inset-0 border-4 border-[#FFA7A6] rounded-lg pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.5,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: 'reverse',
          }}
        />
      )}
    </motion.div>
  )
}
