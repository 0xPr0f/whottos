'use client'

import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)

    // Update the state initially
    setMatches(media.matches)

    // Set up the listener to update state
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add the listener
    media.addEventListener('change', listener)

    // Clean up
    return () => {
      media.removeEventListener('change', listener)
    }
  }, [query])

  return matches
}
