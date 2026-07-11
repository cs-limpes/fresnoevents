import type { ApiErrorResponse, EventsResponse } from '../types/events'

export async function fetchEvents(): Promise<EventsResponse> {
  const response = await fetch('/api/events', {
    headers: {
      accept: 'application/json',
    },
  })

  const payload = (await response.json()) as EventsResponse | ApiErrorResponse

  if (!response.ok || 'error' in payload) {
    const message = 'error' in payload ? payload.error.message : 'Events are temporarily unavailable.'
    throw new Error(message)
  }

  return payload
}
