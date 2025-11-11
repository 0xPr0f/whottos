import { NextResponse, type NextRequest } from 'next/server'
import { localWranglerHost } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const host =
    process.env.WHOT_AGENT_HOST ||
    process.env.NEXT_PUBLIC_WHOT_AGENT_HOST ||
    localWranglerHost

  try {
    const body = await req.json()

    const response = await fetch(`${host}/matchmaking/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      cache: 'no-store',
    })

    const payload = (await response.json()) as unknown

    if (!response.ok) {
      const errorMsg =
        payload && typeof payload === 'object' && 'error' in payload
          ? (payload as { error?: string }).error || 'Failed to join queue'
          : 'Failed to join queue'
      return NextResponse.json({ error: errorMsg }, { status: response.status })
    }

    return NextResponse.json(payload as any, { status: 200 })
  } catch (error) {
    console.error('Failed to join matchmaking queue:', error)
    return NextResponse.json(
      { error: 'Unable to join queue' },
      { status: 500 }
    )
  }
}

