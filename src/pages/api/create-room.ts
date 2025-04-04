import { randomUUID } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const roomId = randomUUID()
    console.log(roomId)
    res.status(200).json({ roomId: roomId })
  } else {
    res.status(405).json({ message: 'Method Not Allowed' })
  }
}
