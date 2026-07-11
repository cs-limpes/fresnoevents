import type { ApiErrorResponse, EventsResponse, PublicEvent } from '../../src/types/events'
import { validateRequestedRange } from '../lib/date-ranges'
import { fetchGoogleCalendarEvents, GoogleCalendarError } from '../services/google-calendar'
import { comparePublicEvents, normalizeGoogleEvent } from '../services/normalize-event'

export type Env = {
  ASSETS: Fetcher
  GOOGLE_CALENDAR_ID?: string
  GOOGLE_CALENDAR_API_KEY?: string
  GOOGLE_CALENDAR_TIMEZONE?: string
}

export async function handleEventsRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonError('METHOD_NOT_ALLOWED', 'This endpoint only supports GET requests.', 405)
  }

  const calendarId = env.GOOGLE_CALENDAR_ID
  const apiKey = env.GOOGLE_CALENDAR_API_KEY
  const timezone = env.GOOGLE_CALENDAR_TIMEZONE || 'America/Los_Angeles'

  if (!calendarId || !apiKey) {
    return jsonError('EVENT_SOURCE_NOT_CONFIGURED', 'Events are not configured for this environment.', 500)
  }

  const url = new URL(request.url)
  const rangeResult = validateRequestedRange(url.searchParams)

  if (!rangeResult.ok) {
    return jsonError(rangeResult.code, rangeResult.message, rangeResult.status)
  }

  try {
    const googleEvents = await fetchGoogleCalendarEvents({ calendarId, apiKey, timezone }, rangeResult.range)
    const events = googleEvents
      .map(normalizeGoogleEvent)
      .filter(isDisplayableEvent)
      .sort(comparePublicEvents)

    const response: EventsResponse = {
      events,
      range: rangeResult.range,
      generatedAt: new Date().toISOString(),
    }

    return json(response)
  } catch (error) {
    const status = error instanceof GoogleCalendarError && error.status >= 400 && error.status < 500 ? 502 : 503

    return jsonError('EVENT_SOURCE_UNAVAILABLE', 'Events are temporarily unavailable.', status)
  }
}

function json(payload: EventsResponse | ApiErrorResponse, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function jsonError(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status)
}

function isDisplayableEvent(event: PublicEvent | null): event is PublicEvent {
  return Boolean(event && event.status !== 'cancelled')
}
