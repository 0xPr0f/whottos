import type { NextApiRequest, NextApiResponse } from 'next'
import { localWranglerHost } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const host =
    process.env.WHOT_AGENT_HOST ||
    process.env.NEXT_PUBLIC_WHOT_AGENT_HOST ||
    localWranglerHost

  try {
    const response = await fetch(`${host}/matchmaking/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    })

    const payload = await response.json()

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: payload?.error || 'Failed to join queue' })
    }

    return res.status(200).json(payload)
  } catch (error) {
    console.error('Failed to join matchmaking queue:', error)
    return res.status(500).json({ error: 'Unable to join queue' })
  }
}
