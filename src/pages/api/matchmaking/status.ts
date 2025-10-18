import type { NextApiRequest, NextApiResponse } from 'next'
import { localWranglerHost } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { playerId } = req.query
  if (typeof playerId !== 'string') {
    return res.status(400).json({ error: 'playerId is required' })
  }

  const host =
    process.env.WHOT_AGENT_HOST ||
    process.env.NEXT_PUBLIC_WHOT_AGENT_HOST ||
    localWranglerHost

  try {
    const response = await fetch(
      `${host}/matchmaking/status?playerId=${encodeURIComponent(playerId)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const payload = await response.json()

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: payload?.error || 'Failed to fetch queue status' })
    }

    return res.status(200).json(payload)
  } catch (error) {
    console.error('Failed to fetch matchmaking status:', error)
    return res.status(500).json({ error: 'Unable to fetch status' })
  }
}
