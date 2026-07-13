import {
  findEventByDetailPath,
  getEventCanonicalUrl,
  getEventSummary,
} from '../../src/lib/event-detail'
import type { PublicEvent } from '../../src/types/events'
import { loadEventsResponse, type Env } from './events'

export async function handleAppShellRequest(request: Request, env: Env): Promise<Response> {
  const indexResponse = await env.ASSETS.fetch(request)

  if (!isHtmlResponse(indexResponse)) {
    return indexResponse
  }

  const html = await indexResponse.text()
  const url = new URL(request.url)
  const event = url.pathname.startsWith('/events/')
    ? await findEventForShell(url.pathname, url.origin, env)
    : undefined
  const metadata = event
    ? buildEventMetadata(event, url.origin)
    : isContactPath(url.pathname)
      ? buildContactMetadata(url)
      : buildDefaultMetadata(url)

  return new Response(injectMetadata(html, metadata), {
    status: indexResponse.status,
    headers: indexResponse.headers,
  })
}

type PageMetadata = {
  title: string
  description: string
  url: string
  type: string
}

async function findEventForShell(pathname: string, origin: string, env: Env): Promise<PublicEvent | undefined> {
  const result = await loadEventsResponse(new URLSearchParams(), env)

  if (!result.ok) {
    return undefined
  }

  return findEventByDetailPath(result.response.events, new URL(pathname, origin).pathname)
}

function buildEventMetadata(event: PublicEvent, origin: string): PageMetadata {
  return {
    title: `${event.title} | Fresno Events`,
    description: getEventSummary(event),
    url: getEventCanonicalUrl(event, origin),
    type: 'article',
  }
}

function buildDefaultMetadata(url: URL): PageMetadata {
  return {
    title: 'Fresno Events',
    description: 'A live local agenda for Fresno, Clovis, and nearby Central Valley communities.',
    url: `${url.origin}${url.pathname}`,
    type: 'website',
  }
}

function buildContactMetadata(url: URL): PageMetadata {
  return {
    title: 'Send Event Updates | Fresno Events',
    description: 'Send Fresno Events a correction or a new event lead for editorial review.',
    url: `${url.origin}${url.pathname}`,
    type: 'website',
  }
}

function isContactPath(pathname: string): boolean {
  return pathname === '/contact' || pathname === '/submit'
}

function injectMetadata(html: string, metadata: PageMetadata): string {
  const escapedTitle = escapeHtml(metadata.title)
  const tags = [
    `<title>${escapedTitle}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`,
    `<meta property="og:title" content="${escapedTitle}" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta property="og:type" content="${escapeHtml(metadata.type)}" />`,
    `<meta property="og:url" content="${escapeHtml(metadata.url)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<link rel="canonical" href="${escapeHtml(metadata.url)}" />`,
  ].join('\n    ')

  const withoutTitle = html.replace(/<title>[\s\S]*?<\/title>/i, '')
  return withoutTitle.replace('</head>', `    ${tags}\n  </head>`)
}

function isHtmlResponse(response: Response): boolean {
  return response.headers.get('content-type')?.includes('text/html') ?? false
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
