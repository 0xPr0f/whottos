import { NextResponse, type NextRequest } from 'next/server'
import { localWranglerHost } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const playerId = req.nextUrl.searchParams.get('playerId')
  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
  }

  const host =
    process.env.WHOT_AGENT_HOST ||
    process.env.NEXT_PUBLIC_WHOT_AGENT_HOST ||
    localWranglerHost

  try {
    const response = await fetch(
      `${host}/matchmaking/status?playerId=${encodeURIComponent(playerId)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' }
    )

    const payload = (await response.json()) as unknown

    if (!response.ok) {
      const errorMsg =
        payload && typeof payload === 'object' && 'error' in payload
          ? (payload as { error?: string }).error || 'Failed to fetch queue status'
          : 'Failed to fetch queue status'
      return NextResponse.json({ error: errorMsg }, { status: response.status })
    }

    return NextResponse.json(payload as any, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch matchmaking status:', error)
    return NextResponse.json(
      { error: 'Unable to fetch status' },
      { status: 500 }
    )
  }
}

