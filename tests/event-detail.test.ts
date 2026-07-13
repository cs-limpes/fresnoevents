import { describe, expect, it } from 'vitest'
import {
  buildGoogleCalendarUrl,
  buildIcsContent,
  buildMapUrl,
  buildStructuredEventData,
  findEventByDetailPath,
  getEventDetailPath,
} from '../src/lib/event-detail'
import type { PublicEvent } from '../src/types/events'

describe('event detail helpers', () => {
  it('keeps detail routes stable when titles change', () => {
    const first = event({ id: 'google-event_20260711T190000', title: 'Original Event Title' })
    const renamed = event({ id: first.id, title: 'Renamed Event Title' })
    const oldPath = getEventDetailPath(first)

    expect(oldPath).toContain('original-event-title')
    expect(findEventByDetailPath([renamed], oldPath)?.id).toBe(first.id)
  })

  it('builds Google Calendar links for timed events', () => {
    const url = new URL(buildGoogleCalendarUrl(event(), 'https://example.com/events/test'))

    expect(url.origin).toBe('https://calendar.google.com')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('text')).toBe('Fresno Event')
    expect(url.searchParams.get('dates')).toBe('20260711T190000Z/20260711T210000Z')
  })

  it('builds all-day ICS exports with exclusive end dates', () => {
    const ics = buildIcsContent(
      event({ allDay: true, start: '2026-07-11', end: '2026-07-13', multiDay: true }),
      'https://example.com/events/test',
      new Date('2026-07-10T12:00:00Z'),
    )

    expect(ics).toContain('DTSTART;VALUE=DATE:20260711')
    expect(ics).toContain('DTEND;VALUE=DATE:20260713')
    expect(ics).toContain('SUMMARY:Fresno Event')
  })

  it('builds map links from venue facts without inventing locations', () => {
    expect(buildMapUrl(event({ venue: undefined }))).toBeUndefined()
    expect(buildMapUrl(event({ venue: { address: '123 Fulton St', city: 'Fresno', online: false } }))).toContain(
      'query=123+Fulton+St',
    )
  })

  it('builds conservative structured event data', () => {
    const data = buildStructuredEventData(event(), 'https://example.com/events/test')

    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: 'Fresno Event',
      startDate: '2026-07-11T12:00:00-07:00',
      url: 'https://example.com/events/test',
    })
  })
})

function event(overrides: Partial<PublicEvent> = {}): PublicEvent {
  return {
    id: 'event-1',
    source: {
      provider: 'google-calendar',
      eventId: 'event-1',
    },
    title: 'Fresno Event',
    description: 'A public event description.',
    excerpt: 'A public event description.',
    start: '2026-07-11T12:00:00-07:00',
    end: '2026-07-11T14:00:00-07:00',
    timezone: 'America/Los_Angeles',
    allDay: false,
    multiDay: false,
    status: 'confirmed',
    venue: {
      name: 'Tower Theatre',
      address: '815 E Olive Ave',
      city: 'Fresno',
      neighborhood: 'Tower District',
      online: false,
    },
    taxonomy: {
      primaryCategory: 'music',
      tags: ['live music'],
      audience: ['all-ages'],
      priceType: 'free',
    },
    links: {},
    editorial: {
      featured: false,
      promoted: false,
      sponsored: false,
    },
    ...overrides,
  }
}
