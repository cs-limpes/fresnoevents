import {
  eventOverlapsRange,
  getAgendaSections,
  getAgendaWindows,
  type AgendaSection,
  type AgendaSectionId,
} from './agenda-sections'
import type { DateTime } from 'luxon'
import type { EventAudience, EventCategory, EventPriceType, PublicEvent } from '../types/events'

export type DateViewFilter = 'all' | AgendaSectionId
export type DisplayMode = 'agenda' | 'calendar'

export type FilterState = {
  query: string
  display: DisplayMode
  view: DateViewFilter
  category: EventCategory | ''
  city: string
  neighborhood: string
  audience: EventAudience | ''
  price: EventPriceType | ''
}

export type FilterOptions = {
  categories: EventCategory[]
  cities: string[]
  neighborhoods: string[]
  audiences: EventAudience[]
  prices: EventPriceType[]
}

export const DEFAULT_FILTERS: FilterState = {
  query: '',
  display: 'agenda',
  view: 'all',
  category: '',
  city: '',
  neighborhood: '',
  audience: '',
  price: '',
}

export const DATE_VIEW_OPTIONS: Array<{ value: DateViewFilter; label: string }> = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'this-weekend', label: 'This Weekend' },
  { value: 'upcoming', label: 'Upcoming' },
]

const EVENT_CATEGORIES: EventCategory[] = [
  'art',
  'music',
  'food-drink',
  'markets',
  'festivals',
  'family',
  'community',
  'classes-workshops',
  'nightlife',
  'outdoors',
  'sports',
  'wellness',
  'spiritual',
  'theater-film',
  'other',
]

const EVENT_AUDIENCES: EventAudience[] = [
  'all-ages',
  'family-friendly',
  'adults',
  '18-plus',
  '21-plus',
  'youth',
  'unknown',
]

const EVENT_PRICE_TYPES: EventPriceType[] = ['free', 'paid', 'donation', 'registration-required', 'unknown']

const LABEL_OVERRIDES: Record<string, string> = {
  '18-plus': '18+',
  '21-plus': '21+',
  'all-ages': 'All ages',
  'classes-workshops': 'Classes & Workshops',
  'family-friendly': 'Family-friendly',
  'food-drink': 'Food & Drink',
  'registration-required': 'Registration required',
  'theater-film': 'Theater & Film',
}

export function parseFilters(params: URLSearchParams): FilterState {
  return {
    query: cleanQuery(params.get('q')),
    display: readDisplayMode(params.get('display')),
    view: readDateView(params.get('view')),
    category: readKnownValue(params.get('category'), EVENT_CATEGORIES),
    city: cleanFacet(params.get('city')),
    neighborhood: cleanFacet(params.get('neighborhood')),
    audience: readKnownValue(params.get('audience'), EVENT_AUDIENCES),
    price: readKnownValue(params.get('price'), EVENT_PRICE_TYPES),
  }
}

export function serializeFilters(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams()
  const query = cleanQuery(filters.query)

  if (query) params.set('q', query)
  if (filters.display !== DEFAULT_FILTERS.display) params.set('display', filters.display)
  if (filters.view !== DEFAULT_FILTERS.view) params.set('view', filters.view)
  if (filters.category) params.set('category', filters.category)
  if (filters.city) params.set('city', filters.city)
  if (filters.neighborhood) params.set('neighborhood', filters.neighborhood)
  if (filters.audience) params.set('audience', filters.audience)
  if (filters.price) params.set('price', filters.price)

  return params
}

export function getActiveFilterCount(filters: FilterState): number {
  return [
    filters.display === 'agenda' ? cleanQuery(filters.query) : '',
    filters.display === 'agenda' && filters.view !== DEFAULT_FILTERS.view ? filters.view : '',
    filters.category,
    filters.city,
    filters.neighborhood,
    filters.audience,
    filters.price,
  ].filter(Boolean).length
}

export function hasActiveFilters(filters: FilterState): boolean {
  return getActiveFilterCount(filters) > 0
}

export function filterEvents(events: PublicEvent[], filters: FilterState): PublicEvent[] {
  return events.filter((event) => eventMatchesFilters(event, filters))
}

export function filterCalendarEvents(events: PublicEvent[], filters: FilterState): PublicEvent[] {
  return events.filter((event) => eventMatchesFacetFilters(event, filters))
}

export function getFilteredAgendaSections(
  events: PublicEvent[],
  view: DateViewFilter,
  now?: DateTime<boolean>,
): AgendaSection[] {
  if (view === 'all') {
    return getAgendaSections(events, now)
  }

  const window = getAgendaWindows(now).find((item) => item.id === view)

  if (!window) {
    return getAgendaSections(events, now)
  }

  return [
    {
      ...window,
      events: events.filter((event) => eventOverlapsRange(event, window.range.start, window.range.end)),
    },
  ]
}

export function buildFilterOptions(events: PublicEvent[]): FilterOptions {
  return {
    categories: sortByLabel(unique(events.map((event) => event.taxonomy.primaryCategory))),
    cities: sortText(unique(events.map((event) => event.venue?.city))),
    neighborhoods: sortText(unique(events.map((event) => event.venue?.neighborhood))),
    audiences: sortByLabel(unique(events.flatMap((event) => event.taxonomy.audience))),
    prices: sortByLabel(unique(events.map((event) => event.taxonomy.priceType))),
  }
}

export function formatFilterLabel(value: string): string {
  if (LABEL_OVERRIDES[value]) {
    return LABEL_OVERRIDES[value]
  }

  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function eventMatchesFilters(event: PublicEvent, filters: FilterState): boolean {
  const query = cleanQuery(filters.query)

  if (query && !matchesQuery(event, query)) {
    return false
  }

  return eventMatchesFacetFilters(event, filters)
}

function eventMatchesFacetFilters(event: PublicEvent, filters: FilterState): boolean {
  if (filters.category && event.taxonomy.primaryCategory !== filters.category) {
    return false
  }

  if (filters.city && event.venue?.city !== filters.city) {
    return false
  }

  if (filters.neighborhood && event.venue?.neighborhood !== filters.neighborhood) {
    return false
  }

  if (filters.audience && !event.taxonomy.audience.includes(filters.audience)) {
    return false
  }

  if (filters.price && event.taxonomy.priceType !== filters.price) {
    return false
  }

  return true
}

function matchesQuery(event: PublicEvent, query: string): boolean {
  const tokens = normalizeSearchText(query).split(' ').filter(Boolean)
  const searchable = normalizeSearchText(
    [
      event.title,
      event.description,
      event.excerpt,
      event.venue?.name,
      event.venue?.address,
      event.venue?.city,
      event.venue?.neighborhood,
      event.taxonomy.primaryCategory,
      ...event.taxonomy.tags,
      event.organizer?.name,
    ]
      .filter(Boolean)
      .join(' '),
  )

  return tokens.every((token) => searchable.includes(token))
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function cleanQuery(value: string | null): string {
  return (value ?? '').trim().replace(/\s+/g, ' ')
}

function cleanFacet(value: string | null): string {
  return (value ?? '').trim()
}

function readDateView(value: string | null): DateViewFilter {
  return DATE_VIEW_OPTIONS.some((option) => option.value === value) ? (value as DateViewFilter) : DEFAULT_FILTERS.view
}

function readDisplayMode(value: string | null): DisplayMode {
  return value === 'calendar' ? 'calendar' : DEFAULT_FILTERS.display
}

function readKnownValue<T extends string>(value: string | null, allowed: T[]): T | '' {
  return allowed.includes(value as T) ? (value as T) : ''
}

function unique<T extends string>(values: Array<T | undefined>): T[] {
  return [...new Set(values.filter((value): value is T => Boolean(value)))]
}

function sortByLabel<T extends string>(values: T[]): T[] {
  return [...values].sort((left, right) => formatFilterLabel(left).localeCompare(formatFilterLabel(right)))
}

function sortText(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right))
}
