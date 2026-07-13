import { handleEventsRequest, type Env } from './routes/events'
import { handleAppShellRequest } from './routes/app-shell'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/events') {
      return handleEventsRequest(request, env)
    }

    if (url.pathname === '/' || url.pathname.startsWith('/events/')) {
      return handleAppShellRequest(request, env)
    }

    return env.ASSETS.fetch(request)
  },
}
