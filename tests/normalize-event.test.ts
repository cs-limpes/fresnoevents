import { describe, expect, it } from 'vitest'
import { normalizeGoogleEvent } from '../worker/services/normalize-event'
import type { GoogleCalendarEvent } from '../worker/types/google-calendar'

describe('normalizeGoogleEvent', () => {
  it('normalizes recurring events without exposing calendar identifiers', () => {
    const source: GoogleCalendarEvent = {
      id: 'abc123',
      summary: 'Late Night Art Market',
      description: `Public description.

---
category: art
audience: 21+
price: paid
featured: yes
source: https://example.com/event`,
      htmlLink: 'https://calendar.google.com/event?eid=abc123',
      start: { dateTime: '2026-07-11T22:00:00-07:00' },
      end: { dateTime: '2026-07-12T01:00:00-07:00' },
      recurringEventId: 'series-1',
      originalStartTime: { dateTime: '2026-07-11T22:00:00-07:00' },
      status: 'confirmed',
    }

    const event = normalizeGoogleEvent(source)

    expect(event).not.toBeNull()
    expect(event?.id).toContain('20260711T2200000700')
    expect(event?.source).not.toHaveProperty('calendarId')
    expect(event?.description).toBe('Public description.')
    expect(event?.taxonomy.primaryCategory).toBe('art')
    expect(event?.taxonomy.audience).toEqual(['21-plus'])
    expect(event?.taxonomy.priceType).toBe('paid')
    expect(event?.editorial.featured).toBe(true)
    expect(event?.multiDay).toBe(true)
  })

  it('marks multi-day all-day events using exclusive end dates', () => {
    const source: GoogleCalendarEvent = {
      id: 'all-day-1',
      summary: 'Festival Weekend',
      start: { date: '2026-07-10' },
      end: { date: '2026-07-13' },
      status: 'confirmed',
    }

    const event = normalizeGoogleEvent(source)

    expect(event?.allDay).toBe(true)
    expect(event?.multiDay).toBe(true)
    expect(event?.start).toBe('2026-07-10')
    expect(event?.end).toBe('2026-07-13')
  })

  it('returns null for malformed events without usable dates', () => {
    expect(normalizeGoogleEvent({ id: 'missing-dates', summary: 'Broken event' })).toBeNull()
  })
})
