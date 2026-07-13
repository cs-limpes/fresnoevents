import { handleContactDraftRequest, type ContactEnv } from './routes/contact'
import { handleEventsRequest, type Env as EventsEnv } from './routes/events'
import { handleAppShellRequest } from './routes/app-shell'

type Env = EventsEnv & ContactEnv

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/events') {
      return handleEventsRequest(request, env)
    }

    if (url.pathname === '/api/contact-draft') {
      return handleContactDraftRequest(request, env)
    }

    if (isAppShellPath(url.pathname)) {
      return handleAppShellRequest(request, env)
    }

    return env.ASSETS.fetch(request)
  },
}

function isAppShellPath(pathname: string): boolean {
  return pathname === '/' || pathname === '/contact' || pathname === '/submit' || pathname.startsWith('/events/')
}
