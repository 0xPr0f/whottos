'server only'

import { AgentNamespace, routeAgentRequest } from 'agents'
import { WhotGameAgent } from './whot-game-agent'

interface Env {
  MyAgent: AgentNamespace<WhotGameAgent>
}
export { WhotGameAgent }

export default {
  async fetch(request: any, env: any, ctx: any): Promise<Response> {
    // Routed addressing
    // Automatically routes HTTP requests and/or WebSocket connections to /agents/:agent/:name
    // Best for: connecting React apps directly to Agents using useAgent from agents/react
    return (
      (await routeAgentRequest(request, env)) ||
      Response.json({ msg: 'no agent here' }, { status: 404 })
    )
  },
}
