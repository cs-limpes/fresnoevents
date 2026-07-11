import { handleEventsRequest, type Env } from './routes/events'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/events') {
      return handleEventsRequest(request, env)
    }

    return env.ASSETS.fetch(request)
  },
}
