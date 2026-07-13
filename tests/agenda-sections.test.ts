import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { AGENDA_TIMEZONE, getAgendaSections } from '../src/lib/agenda-sections'
import type { PublicEvent } from '../src/types/events'

describe('agenda sections', () => {
  it('groups events into every section whose displayed range they overlap', () => {
    const now = DateTime.fromISO('2026-07-11T10:00:00', { zone: AGENDA_TIMEZONE })
    const sections = getAgendaSections(
      [
        event({ id: 'today', start: '2026-07-11T12:00:00-07:00', end: '2026-07-11T13:00:00-07:00' }),
        event({ id: 'weekend', start: '2026-07-12T12:00:00-07:00', end: '2026-07-12T13:00:00-07:00' }),
        event({ id: 'upcoming', start: '2026-07-20T12:00:00-07:00', end: '2026-07-20T13:00:00-07:00' }),
      ],
      now,
    )

    expect(sections.map((section) => section.title)).toEqual(['Today', 'This Weekend', 'Upcoming'])
    expect(sections[0].events.map((item) => item.id)).toEqual(['today'])
    expect(sections[1].events.map((item) => item.id)).toEqual(['today', 'weekend'])
    expect(sections[2].events.map((item) => item.id)).toEqual(['today', 'weekend', 'upcoming'])
  })

  it('keeps an overlapping all-day multi-day event in each matching section', () => {
    const now = DateTime.fromISO('2026-07-11T10:00:00', { zone: AGENDA_TIMEZONE })
    const sections = getAgendaSections(
      [
        event({
          id: 'festival',
          start: '2026-07-10',
          end: '2026-07-13',
          allDay: true,
          multiDay: true,
        }),
      ],
      now,
    )

    expect(sections[0].events.map((item) => item.id)).toEqual(['festival'])
    expect(sections[1].events.map((item) => item.id)).toEqual(['festival'])
    expect(sections[2].events.map((item) => item.id)).toEqual(['festival'])
  })

  it('does not duplicate the same event within a single section', () => {
    const now = DateTime.fromISO('2026-07-11T10:00:00', { zone: AGENDA_TIMEZONE })
    const duplicate = event({ id: 'today', start: '2026-07-11T12:00:00-07:00', end: '2026-07-11T13:00:00-07:00' })

    const sections = getAgendaSections([duplicate, duplicate], now)

    expect(sections[0].events.map((item) => item.id)).toEqual(['today'])
  })
})

function event(overrides: Partial<PublicEvent>): PublicEvent {
  return {
    id: 'event',
    source: {
      provider: 'google-calendar',
      eventId: 'event',
    },
    title: 'Event',
    start: '2026-07-11T12:00:00-07:00',
    end: '2026-07-11T13:00:00-07:00',
    timezone: AGENDA_TIMEZONE,
    allDay: false,
    multiDay: false,
    status: 'confirmed',
    taxonomy: {
      primaryCategory: 'other',
      tags: [],
      audience: ['unknown'],
      priceType: 'unknown',
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
