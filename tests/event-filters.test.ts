import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { AGENDA_TIMEZONE } from '../src/lib/agenda-sections'
import {
  DEFAULT_FILTERS,
  buildFilterOptions,
  filterEvents,
  getFilteredAgendaSections,
  parseFilters,
  serializeFilters,
  type FilterState,
} from '../src/lib/event-filters'
import type { PublicEvent } from '../src/types/events'

describe('event filters', () => {
  it('searches normalized public fields by token', () => {
    const events = [
      event({
        id: 'music',
        title: 'Jazz Night',
        venue: { name: 'Tower Theatre', city: 'Fresno', neighborhood: 'Tower District', online: false },
        taxonomy: { primaryCategory: 'music', tags: ['live music'], audience: ['21-plus'], priceType: 'paid' },
      }),
      event({ id: 'market', title: 'Saturday Market' }),
    ]

    expect(filterEvents(events, { ...DEFAULT_FILTERS, query: 'tower jazz' }).map((item) => item.id)).toEqual(['music'])
  })

  it('combines category, city, audience, and price filters', () => {
    const events = [
      event({
        id: 'match',
        venue: { city: 'Fresno', online: false },
        taxonomy: { primaryCategory: 'family', tags: [], audience: ['family-friendly'], priceType: 'free' },
      }),
      event({
        id: 'wrong-price',
        venue: { city: 'Fresno', online: false },
        taxonomy: { primaryCategory: 'family', tags: [], audience: ['family-friendly'], priceType: 'paid' },
      }),
    ]

    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      category: 'family',
      city: 'Fresno',
      audience: 'family-friendly',
      price: 'free',
    }

    expect(filterEvents(events, filters).map((item) => item.id)).toEqual(['match'])
  })

  it('serializes and parses URL query state', () => {
    const filters: FilterState = {
      query: 'tower music',
      view: 'this-weekend',
      category: 'music',
      city: 'Fresno',
      neighborhood: 'Tower District',
      audience: '21-plus',
      price: 'paid',
    }

    expect(parseFilters(serializeFilters(filters))).toEqual(filters)
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('')
  })

  it('builds filter options from available event data only', () => {
    const options = buildFilterOptions([
      event({
        venue: { city: 'Clovis', neighborhood: 'Old Town', online: false },
        taxonomy: { primaryCategory: 'markets', tags: [], audience: ['all-ages'], priceType: 'free' },
      }),
    ])

    expect(options).toMatchObject({
      categories: ['markets'],
      cities: ['Clovis'],
      neighborhoods: ['Old Town'],
      audiences: ['all-ages'],
      prices: ['free'],
    })
  })

  it('returns a single selected date-window section without duplicate all-view behavior', () => {
    const now = DateTime.fromISO('2026-07-11T10:00:00', { zone: AGENDA_TIMEZONE })
    const sections = getFilteredAgendaSections(
      [
        event({
          id: 'festival',
          start: '2026-07-10',
          end: '2026-07-13',
          allDay: true,
          multiDay: true,
        }),
      ],
      'this-weekend',
      now,
    )

    expect(sections).toHaveLength(1)
    expect(sections[0].title).toBe('This Weekend')
    expect(sections[0].events.map((item) => item.id)).toEqual(['festival'])
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
