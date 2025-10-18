import type { NextApiRequest, NextApiResponse } from 'next'
import { localWranglerHost } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE'])
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
      `${host}/matchmaking/leave?playerId=${encodeURIComponent(playerId)}`,
      {
        method: 'DELETE',
      }
    )

    const payload = await response.json()

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: payload?.error || 'Failed to leave queue' })
    }

    return res.status(200).json(payload)
  } catch (error) {
    console.error('Failed to leave matchmaking queue:', error)
    return res.status(500).json({ error: 'Unable to leave queue' })
  }
}
