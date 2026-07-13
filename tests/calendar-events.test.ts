import { describe, expect, it } from 'vitest'
import { AGENDA_TIMEZONE } from '../src/lib/agenda-sections'
import { toFullCalendarEvents, uniqueEventsById } from '../src/lib/calendar-events'
import type { PublicEvent } from '../src/types/events'

describe('calendar events', () => {
  it('maps public events to FullCalendar inputs without changing date boundaries', () => {
    const events = [
      event({
        id: 'all-day-festival',
        title: 'All Day Festival',
        start: '2026-07-11',
        end: '2026-07-13',
        allDay: true,
        multiDay: true,
      }),
    ]

    const calendarEvents = toFullCalendarEvents(events, { getUrl: (item) => `/events/${item.id}` })

    expect(calendarEvents).toHaveLength(1)
    expect(calendarEvents[0]).toMatchObject({
      id: 'all-day-festival',
      title: 'All Day Festival',
      start: '2026-07-11',
      end: '2026-07-13',
      allDay: true,
      url: '/events/all-day-festival',
    })
    expect(calendarEvents[0].extendedProps.publicEvent).toBe(events[0])
    expect(calendarEvents[0].classNames).toContain('calendar-event-multi-day')
  })

  it('deduplicates repeated section events by public event id', () => {
    const duplicate = event({ id: 'duplicate' })
    const unique = event({ id: 'unique' })

    expect(uniqueEventsById([duplicate, duplicate, unique]).map((item) => item.id)).toEqual(['duplicate', 'unique'])
  })
})

function event(overrides: Partial<PublicEvent> = {}): PublicEvent {
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
