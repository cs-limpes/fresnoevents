import { describe, expect, it } from 'vitest'
import { normalizeGoogleEvent, normalizeGoogleEventOccurrences } from '../worker/services/normalize-event'
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
    expect(event?.links.sourceUrl).toBe('https://example.com/event')
    expect(event?.source.htmlLink).toBe('https://calendar.google.com/event?eid=abc123')
    expect(event?.multiDay).toBe(true)
  })

  it('does not expose the Google Calendar htmlLink as a public source link', () => {
    const source: GoogleCalendarEvent = {
      id: 'calendar-only-link',
      summary: 'Calendar Link Only',
      htmlLink: 'https://calendar.google.com/event?eid=calendar-only-link',
      start: { dateTime: '2026-07-11T19:00:00-07:00' },
      end: { dateTime: '2026-07-11T20:00:00-07:00' },
      status: 'confirmed',
    }

    const event = normalizeGoogleEvent(source)

    expect(event?.links.sourceUrl).toBeUndefined()
    expect(event?.source.htmlLink).toBe('https://calendar.google.com/event?eid=calendar-only-link')
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

  it('expands explicit weekly recurrence-note events into individual occurrences', () => {
    const source: GoogleCalendarEvent = {
      id: 'soul-medicine',
      summary: 'Soul Medicine Teen Circle',
      description: `A weekly heart-centered experience for ages 13-18.

Type: recurring_event
Category: Youth Teen Program
Organizer: The Vibe Tribe
Cost/tickets: $22 DROP-IN, $44 MONTHLY MEMBERSHIP
URL/contact: www.TheVibeTribe.tv
Recurrence note: Wednesdays weekly, 4:30-6:00 PM`,
      location: 'The Vibe Tribe, Fresno, CA',
      start: { dateTime: '2026-07-01T16:30:00-07:00' },
      end: { dateTime: '2026-07-22T18:00:00-07:00' },
      status: 'confirmed',
    }

    const events = normalizeGoogleEventOccurrences(source)

    expect(events.map((event) => event.start)).toEqual([
      '2026-07-01T16:30:00-07:00',
      '2026-07-08T16:30:00-07:00',
      '2026-07-15T16:30:00-07:00',
      '2026-07-22T16:30:00-07:00',
    ])
    expect(events.map((event) => event.end)).toEqual([
      '2026-07-01T18:00:00-07:00',
      '2026-07-08T18:00:00-07:00',
      '2026-07-15T18:00:00-07:00',
      '2026-07-22T18:00:00-07:00',
    ])
    expect(events[0]).toMatchObject({
      title: 'Soul Medicine Teen Circle',
      multiDay: false,
      venue: { city: 'Fresno' },
      taxonomy: {
        primaryCategory: 'family',
        audience: ['youth'],
        priceType: 'paid',
      },
      organizer: { name: 'The Vibe Tribe' },
      links: { websiteUrl: 'https://www.thevibetribe.tv/' },
    })
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length)
  })

  it('clips expanded recurrence-note occurrences to the requested range', () => {
    const source: GoogleCalendarEvent = {
      id: 'soul-medicine',
      summary: 'Soul Medicine Teen Circle',
      description: `A weekly heart-centered experience for ages 13-18.

Type: recurring_event
Category: Youth Teen Program
Recurrence note: Wednesdays weekly, 4:30-6:00 PM`,
      start: { dateTime: '2026-07-01T16:30:00-07:00' },
      end: { dateTime: '2026-07-29T18:00:00-07:00' },
      status: 'confirmed',
    }

    const events = normalizeGoogleEventOccurrences(source, {
      start: '2026-07-12T00:00:00-07:00',
      end: '2026-07-26T00:00:00-07:00',
      timezone: 'America/Los_Angeles',
    })

    expect(events.map((event) => event.start)).toEqual([
      '2026-07-15T16:30:00-07:00',
      '2026-07-22T16:30:00-07:00',
    ])
  })

  it('returns null for malformed events without usable dates', () => {
    expect(normalizeGoogleEvent({ id: 'missing-dates', summary: 'Broken event' })).toBeNull()
  })
})
