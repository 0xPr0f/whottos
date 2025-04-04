'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Circle, Triangle, X, Square, Star } from 'lucide-react'

interface ShapeSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectShape: (
    shape: 'circle' | 'triangle' | 'cross' | 'square' | 'star'
  ) => void
}

export function ShapeSelectorModal({
  isOpen,
  onClose,
  onSelectShape,
}: ShapeSelectorModalProps) {
  // Prevent background scrolling when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 pb-8"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="w-16 h-1 bg-gray-300 rounded-full mx-auto mb-6" />

            <h3 className="text-xl font-bold text-center text-[#570000] mb-6">
              Select a shape for your Whot card
            </h3>

            <div className="grid grid-cols-5 gap-4">
              <ShapeButton
                icon={<Circle className="w-8 h-8" />}
                label="Circle"
                color="#FF6B6B"
                onClick={() => onSelectShape('circle')}
              />
              <ShapeButton
                icon={<Triangle className="w-8 h-8" />}
                label="Triangle"
                color="#4ECDC4"
                onClick={() => onSelectShape('triangle')}
              />
              <ShapeButton
                icon={<X className="w-8 h-8" />}
                label="Cross"
                color="#FFD166"
                onClick={() => onSelectShape('cross')}
              />
              <ShapeButton
                icon={<Square className="w-8 h-8" />}
                label="Square"
                color="#6A0572"
                onClick={() => onSelectShape('square')}
              />
              <ShapeButton
                icon={<Star className="w-8 h-8" />}
                label="Star"
                color="#F8961E"
                onClick={() => onSelectShape('star')}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

interface ShapeButtonProps {
  icon: React.ReactNode
  label: string
  color: string
  onClick: () => void
}

function ShapeButton({ icon, label, color, onClick }: ShapeButtonProps) {
  return (
    <motion.button
      className="flex flex-col items-center justify-center"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
        style={{ backgroundColor: color, color: 'white' }}
      >
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  )
}
