import { NextResponse } from 'next/server'

export async function POST() {
  const roomId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return NextResponse.json({ roomId }, { status: 200 })
}

