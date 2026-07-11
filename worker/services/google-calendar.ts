import type { SerializedEventRange } from '../lib/date-ranges'
import type { GoogleCalendarEvent, GoogleCalendarEventsResponse } from '../types/google-calendar'

export type GoogleCalendarConfig = {
  calendarId: string
  apiKey: string
  timezone: string
}

export class GoogleCalendarError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'GoogleCalendarError'
  }
}

export async function fetchGoogleCalendarEvents(
  config: GoogleCalendarConfig,
  range: SerializedEventRange,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleCalendarEvent[]> {
  const events: GoogleCalendarEvent[] = []
  let pageToken: string | undefined
  let pageCount = 0

  do {
    const url = buildEventsUrl(config, range, pageToken)
    const response = await fetchImpl(url)

    if (!response.ok) {
      throw new GoogleCalendarError('Google Calendar returned an unsuccessful response.', response.status)
    }

    const payload = (await response.json()) as GoogleCalendarEventsResponse
    events.push(...(payload.items ?? []))
    pageToken = payload.nextPageToken
    pageCount += 1

    if (pageCount > 20) {
      throw new GoogleCalendarError('Google Calendar pagination exceeded the local safety limit.', 502)
    }
  } while (pageToken)

  return events
}

function buildEventsUrl(config: GoogleCalendarConfig, range: SerializedEventRange, pageToken?: string): string {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events`)

  url.searchParams.set('key', config.apiKey)
  url.searchParams.set('timeMin', range.start)
  url.searchParams.set('timeMax', range.end)
  url.searchParams.set('timeZone', config.timezone)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '2500')

  if (pageToken) {
    url.searchParams.set('pageToken', pageToken)
  }

  return url.toString()
}
