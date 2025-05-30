import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toWebSocketURL(url: string): string {
  return url.replace(/^https?:\/\//i, (proto) =>
    proto.toLowerCase() === 'https://' ? 'wss://' : 'ws://'
  )
}

export const localWranglerHost = 'http://localhost:8787'
