import { NextResponse } from 'next/server'
import { localWranglerHost } from '@/lib/utils'

export async function GET() {
  const host = process.env.NEXT_PUBLIC_WHOT_AGENT_HOST || localWranglerHost

  try {
    const response = await fetch(`${host}/room/leaderboard`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Failed to load leaderboard from Durable Object', {
        status: response.status,
        statusText: response.statusText,
      })
      return NextResponse.json(
        { leaderboard: [], error: 'Failed to load leaderboard' },
        { status: 502 }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Unhandled error while fetching leaderboard:', error)
    return NextResponse.json(
      { leaderboard: [], error: 'Unable to load leaderboard' },
      { status: 500 }
    )
  }
}
