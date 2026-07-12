import { DateTime } from 'luxon'
import type { EventAudience, EventCategory, EventPriceType, EventStatus, PublicEvent } from '../../src/types/events'
import { CANONICAL_TIMEZONE } from '../lib/date-ranges'
import { parseBoolean, parseEventDescription, parseList, safeHttpsUrl } from '../lib/metadata'
import type { GoogleCalendarEvent } from '../types/google-calendar'

const CATEGORY_VALUES = new Set<EventCategory>([
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
])

export function normalizeGoogleEvent(source: GoogleCalendarEvent): PublicEvent | null {
  const eventId = source.id ?? source.iCalUID
  const startValue = source.start?.date ?? source.start?.dateTime
  const endValue = source.end?.date ?? source.end?.dateTime

  if (!eventId || !startValue || !endValue) {
    return null
  }

  const metadata = parseEventDescription(source.description)
  const allDay = Boolean(source.start?.date)
  const status = normalizeStatus(source.status)

  return {
    id: buildPublicEventId(eventId, source),
    source: {
      provider: 'google-calendar',
      eventId,
      recurringEventId: source.recurringEventId,
      originalStartTime: source.originalStartTime?.date ?? source.originalStartTime?.dateTime,
      htmlLink: safeHttpsUrl(source.htmlLink),
    },
    title: source.summary?.trim() || 'Untitled event',
    description: metadata.publicDescription,
    excerpt: makeExcerpt(metadata.publicDescription),
    start: startValue,
    end: endValue,
    timezone: CANONICAL_TIMEZONE,
    allDay,
    multiDay: isMultiDay(startValue, endValue, allDay),
    status,
    venue: buildVenue(source, metadata.fields),
    taxonomy: {
      primaryCategory: normalizeCategory(metadata.fields.category),
      tags: parseList(metadata.fields.tags),
      audience: normalizeAudience(metadata.fields.audience),
      priceType: normalizePrice(metadata.fields.price),
    },
    pricing: buildPricing(metadata.fields),
    organizer: buildOrganizer(metadata.fields),
    media: buildMedia(metadata.fields),
    links: {
      sourceUrl: safeHttpsUrl(metadata.fields.source),
      registrationUrl: safeHttpsUrl(metadata.fields.registration),
      websiteUrl: safeHttpsUrl(metadata.fields.website),
    },
    editorial: {
      featured: parseBoolean(metadata.fields.featured) ?? false,
      promoted: parseBoolean(metadata.fields.promoted) ?? false,
      sponsored: parseBoolean(metadata.fields.sponsored) ?? false,
      sponsorName: metadata.fields.sponsor_name || undefined,
    },
    accessibility: metadata.fields.accessibility ? { text: metadata.fields.accessibility } : undefined,
    updatedAt: source.updated,
    createdAt: source.created,
  }
}

export function comparePublicEvents(a: PublicEvent, b: PublicEvent): number {
  return eventStartMillis(a) - eventStartMillis(b)
}

function buildPublicEventId(eventId: string, source: GoogleCalendarEvent): string {
  const occurrenceStart = source.originalStartTime?.date ?? source.originalStartTime?.dateTime

  if (!source.recurringEventId || !occurrenceStart) {
    return eventId
  }

  return `${eventId}-${occurrenceStart.replace(/[^a-zA-Z0-9]/g, '')}`
}

function normalizeStatus(status?: string): EventStatus {
  if (status === 'tentative' || status === 'cancelled') {
    return status
  }

  return 'confirmed'
}

function normalizeCategory(value?: string): EventCategory {
  const normalized = value?.trim().toLowerCase().replace(/&/g, '').replace(/\s+/g, '-')

  if (normalized && CATEGORY_VALUES.has(normalized as EventCategory)) {
    return normalized as EventCategory
  }

  return 'other'
}

function normalizeAudience(value?: string): EventAudience[] {
  const values = parseList(value).map((item) => {
    const normalized = item.toLowerCase().trim()

    if (normalized === 'all ages' || normalized === 'all-ages') return 'all-ages'
    if (normalized === 'family' || normalized === 'family-friendly') return 'family-friendly'
    if (normalized === 'adult' || normalized === 'adults') return 'adults'
    if (normalized === '18+' || normalized === '18-plus') return '18-plus'
    if (normalized === '21+' || normalized === '21-plus') return '21-plus'
    if (normalized === 'youth') return 'youth'
    return 'unknown'
  })

  const unique = Array.from(new Set(values))
  return unique.length > 0 ? unique : ['unknown']
}

function normalizePrice(value?: string): EventPriceType {
  const normalized = value?.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')

  if (
    normalized === 'free' ||
    normalized === 'paid' ||
    normalized === 'donation' ||
    normalized === 'registration-required'
  ) {
    return normalized
  }

  return 'unknown'
}

function buildVenue(source: GoogleCalendarEvent, fields: Record<string, string>): PublicEvent['venue'] {
  const online = parseBoolean(fields.online) ?? false
  const name = fields.venue || undefined
  const address = fields.address || source.location || undefined
  const city = fields.city || undefined
  const neighborhood = fields.neighborhood || undefined

  if (!name && !address && !city && !neighborhood && !online) {
    return undefined
  }

  return {
    name,
    address,
    city,
    neighborhood,
    online,
  }
}

function buildPricing(fields: Record<string, string>): PublicEvent['pricing'] {
  const displayText = fields.price_text || undefined
  const ticketUrl = safeHttpsUrl(fields.ticket_url)

  if (!displayText && !ticketUrl) {
    return undefined
  }

  return {
    displayText,
    ticketUrl,
    currency: 'USD',
  }
}

function buildOrganizer(fields: Record<string, string>): PublicEvent['organizer'] {
  const name = fields.organizer || undefined
  const url = safeHttpsUrl(fields.organizer_url)

  if (!name && !url) {
    return undefined
  }

  return {
    name,
    url,
  }
}

function buildMedia(fields: Record<string, string>): PublicEvent['media'] {
  const imageUrl = safeHttpsUrl(fields.image)
  const flyerUrl = safeHttpsUrl(fields.flyer)

  return {
    imageUrl,
    imageAlt: fields.image_alt || undefined,
    flyerUrl,
    categoryArtKey: normalizeCategory(fields.category),
  }
}

function makeExcerpt(description?: string): string | undefined {
  if (!description) {
    return undefined
  }

  const singleLine = description.replace(/\s+/g, ' ').trim()
  return singleLine.length > 180 ? `${singleLine.slice(0, 177)}...` : singleLine
}

function isMultiDay(start: string, end: string, allDay: boolean): boolean {
  if (allDay) {
    const startDate = DateTime.fromISO(start, { zone: CANONICAL_TIMEZONE })
    const endDate = DateTime.fromISO(end, { zone: CANONICAL_TIMEZONE })
    return endDate.diff(startDate, 'days').days > 1
  }

  const startDateTime = DateTime.fromISO(start, { setZone: true }).setZone(CANONICAL_TIMEZONE)
  const endDateTime = DateTime.fromISO(end, { setZone: true }).setZone(CANONICAL_TIMEZONE)

  return startDateTime.toISODate() !== endDateTime.toISODate()
}

function eventStartMillis(event: PublicEvent): number {
  const start = event.allDay
    ? DateTime.fromISO(event.start, { zone: CANONICAL_TIMEZONE })
    : DateTime.fromISO(event.start, { setZone: true }).setZone(CANONICAL_TIMEZONE)

  return start.toMillis()
}
