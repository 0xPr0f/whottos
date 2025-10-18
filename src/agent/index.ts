import { AgentNamespace, routeAgentRequest } from 'agents'
import { WhotGameAgent } from './whot-game-agent'
import { MultiplayerRoomDO } from './multiplayer-room-DO'
import type { DurableObjectNamespace } from './durable-object-types'

interface Env {
  MyWhotAgent: AgentNamespace<WhotGameAgent>
  MultiplayerRoomDO: DurableObjectNamespace
}

export { WhotGameAgent, MultiplayerRoomDO }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (path.startsWith('/room/')) {
      const roomId = path.split('/').pop()
      if (!roomId) {
        console.log('Room ID missing')
        return new Response('Room ID is required', { status: 400 })
      }
      try {
        const id = env.MultiplayerRoomDO.idFromName(roomId)
        const roomObject = env.MultiplayerRoomDO.get(id)
        return await roomObject.fetch(request)
      } catch (e) {
        console.error('Error routing to MultiplayerRoomDO:', e)
        return new Response('Server error', { status: 500 })
      }
    }

    if (path.startsWith('/agents/')) {
      return (
        (await routeAgentRequest(request, env)) ||
        Response.json({ msg: 'no agent here' }, { status: 404 })
      )
    }

    console.log('Invalid route:', path)
    return new Response('Invalid route', { status: 404 })
  },
}
