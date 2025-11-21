'use client'

import { useEffect, useState } from 'react'

export type ThemeId = 'whot-classic' | 'whot-midnight' | 'whot-sunrise'

const STORAGE_KEY = 'whot-theme'
const DEFAULT_THEME: ThemeId = 'whot-classic'

function applyTheme(theme: ThemeId) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null
    const initial = stored ?? DEFAULT_THEME
    setThemeState(initial)
    applyTheme(initial)
  }, [])

  const setTheme = (next: ThemeId) => {
    setThemeState(next)
    if (typeof window !== 'undefined') {
      applyTheme(next)
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }

  const availableThemes: {
    id: ThemeId
    name: string
    description: string
    preview: { background: string; primary: string; accent: string }
  }[] = [
    {
      id: 'whot-classic',
      name: 'Classic Whot',
      description: 'Soft pink background with deep maroon accents.',
      preview: {
        background: '#FFA7A6',
        primary: '#570000',
        accent: '#FFA7A6',
      },
    },
    {
      id: 'whot-midnight',
      name: 'Midnight',
      description: 'Dark table feel with glowing pink highlights.',
      preview: {
        background: '#050214',
        primary: '#FF9190',
        accent: '#4ECDC4',
      },
    },
    {
      id: 'whot-sunrise',
      name: 'Sunrise',
      description: 'Lighter, warmer variant with rich reds.',
      preview: {
        background: '#FFF3E0',
        primary: '#FF6B6B',
        accent: '#FFD166',
      },
    },
  ]

  return {
    theme,
    setTheme,
    themes: availableThemes,
  }
}
