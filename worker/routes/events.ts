import type { ApiErrorResponse, EventsResponse, PublicEvent } from '../../src/types/events'
import { validateRequestedRange } from '../lib/date-ranges'
import { fetchGoogleCalendarEvents, GoogleCalendarError } from '../services/google-calendar'
import { comparePublicEvents, normalizeGoogleEventOccurrences } from '../services/normalize-event'

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

  const url = new URL(request.url)
  const result = await loadEventsResponse(url.searchParams, env)

  if (!result.ok) {
    return jsonError(result.code, result.message, result.status)
  }

  return json(result.response)
}

export type EventsLoadResult =
  | { ok: true; response: EventsResponse }
  | { ok: false; code: string; message: string; status: number }

export async function loadEventsResponse(searchParams: URLSearchParams, env: Env): Promise<EventsLoadResult> {
  const calendarId = env.GOOGLE_CALENDAR_ID
  const apiKey = env.GOOGLE_CALENDAR_API_KEY
  const timezone = env.GOOGLE_CALENDAR_TIMEZONE || 'America/Los_Angeles'

  if (!calendarId || !apiKey) {
    return {
      ok: false,
      code: 'EVENT_SOURCE_NOT_CONFIGURED',
      message: 'Events are not configured for this environment.',
      status: 500,
    }
  }

  const rangeResult = validateRequestedRange(searchParams)

  if (!rangeResult.ok) {
    return rangeResult
  }

  try {
    const googleEvents = await fetchGoogleCalendarEvents({ calendarId, apiKey, timezone }, rangeResult.range)
    const events = googleEvents
      .flatMap((event) => normalizeGoogleEventOccurrences(event, rangeResult.range))
      .filter(isDisplayableEvent)
      .sort(comparePublicEvents)

    const response: EventsResponse = {
      events,
      range: rangeResult.range,
      generatedAt: new Date().toISOString(),
    }

    return { ok: true, response }
  } catch (error) {
    const status = error instanceof GoogleCalendarError && error.status >= 400 && error.status < 500 ? 502 : 503

    return {
      ok: false,
      code: 'EVENT_SOURCE_UNAVAILABLE',
      message: 'Events are temporarily unavailable.',
      status,
    }
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
