import { DateTime } from 'luxon'
import type { EventAudience, EventCategory, EventPriceType, EventStatus, PublicEvent } from '../../src/types/events'
import { CANONICAL_TIMEZONE, type SerializedEventRange } from '../lib/date-ranges'
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

const CITY_VALUES = [
  'Fresno',
  'Clovis',
  'Dinuba',
  'Shaver Lake',
  'Oakhurst',
  'Cutler',
  'Friant',
  'Madera',
  'Sanger',
  'Selma',
  'Visalia',
]

const NEIGHBORHOOD_VALUES = [
  'Tower District',
  'Old Town Clovis',
  'Downtown Fresno',
  'Harlan Ranch',
  'Roeding Park',
  'Woodward Park',
]

const WEEKDAY_VALUES: Record<string, number> = {
  monday: 1,
  mondays: 1,
  mon: 1,
  tuesday: 2,
  tuesdays: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wednesdays: 3,
  wed: 3,
  thursday: 4,
  thursdays: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fridays: 5,
  fri: 5,
  saturday: 6,
  saturdays: 6,
  sat: 6,
  sunday: 7,
  sundays: 7,
  sun: 7,
}

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
      audience: normalizeAudience(metadata.fields.audience, metadata.publicDescription, metadata.fields.category),
      priceType: normalizePrice(metadata.fields.price, metadata.fields.price_text),
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

export function normalizeGoogleEventOccurrences(source: GoogleCalendarEvent, range?: SerializedEventRange): PublicEvent[] {
  const event = normalizeGoogleEvent(source)

  if (!event) {
    return []
  }

  const metadata = parseEventDescription(source.description)
  const recurrence = parseWeeklyRecurrence(metadata.fields.recurrence_note)

  if (metadata.fields.type !== 'recurring_event' || !recurrence || source.recurringEventId) {
    return [event]
  }

  const seriesStart = DateTime.fromISO(source.start?.dateTime ?? source.start?.date ?? '', { setZone: true }).setZone(
    CANONICAL_TIMEZONE,
  )
  const seriesEnd = DateTime.fromISO(source.end?.dateTime ?? source.end?.date ?? '', { setZone: true }).setZone(
    CANONICAL_TIMEZONE,
  )

  if (!seriesStart.isValid || !seriesEnd.isValid || seriesEnd <= seriesStart) {
    return [event]
  }

  const rangeStart = range ? parseRangeBoundary(range.start) : undefined
  const rangeEnd = range ? parseRangeBoundary(range.end) : undefined
  const expanded = expandWeeklyEvent(event, recurrence, seriesStart, seriesEnd, rangeStart, rangeEnd)
  return expanded.length > 0 ? expanded : [event]
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

  const searchable = value?.toLowerCase() ?? ''

  if (searchable.includes('farmer') || searchable.includes('market')) return 'markets'
  if (searchable.includes('music') || searchable.includes('performance')) return 'music'
  if (searchable.includes('movie') || searchable.includes('film') || searchable.includes('theater')) return 'theater-film'
  if (searchable.includes('food') || searchable.includes('drink')) return 'food-drink'
  if (searchable.includes('festival') || searchable.includes('firework') || searchable.includes('fiesta')) return 'festivals'
  if (searchable.includes('craft') || searchable.includes('art')) return 'art'
  if (searchable.includes('youth') || searchable.includes('teen') || searchable.includes('family')) return 'family'
  if (searchable.includes('spiritual') || searchable.includes('pagan')) return 'spiritual'
  if (searchable.includes('wellness') || searchable.includes('medicine')) return 'wellness'
  if (searchable.includes('community') || searchable.includes('networking')) return 'community'
  if (searchable.includes('sport') || searchable.includes('competition')) return 'sports'
  if (searchable.includes('outdoor') || searchable.includes('astronomy') || searchable.includes('lake')) return 'outdoors'

  return 'other'
}

function normalizeAudience(value?: string, description?: string, category?: string): EventAudience[] {
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

  if (unique.length > 0) {
    return unique
  }

  const searchable = [description, category].filter(Boolean).join(' ').toLowerCase()

  if (/\b(ages?\s*)?13\s*[-–]\s*18\b/.test(searchable) || /\bteens?\b|\byouth\b/.test(searchable)) {
    return ['youth']
  }

  if (/\b21\s*\+/.test(searchable)) {
    return ['21-plus']
  }

  if (/\b18\s*\+/.test(searchable)) {
    return ['18-plus']
  }

  if (/\bfamily\b|\bkids?\b/.test(searchable)) {
    return ['family-friendly']
  }

  return ['unknown']
}

function normalizePrice(value?: string, displayText?: string): EventPriceType {
  const normalized = value?.trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')

  if (
    normalized === 'free' ||
    normalized === 'paid' ||
    normalized === 'donation' ||
    normalized === 'registration-required'
  ) {
    return normalized
  }

  const searchable = displayText?.toLowerCase() ?? ''

  if (/\bfree\b/.test(searchable)) {
    return 'free'
  }

  if (/\bdonation\b/.test(searchable)) {
    return 'donation'
  }

  if (/\bregister|registration|required\b/.test(searchable)) {
    return 'registration-required'
  }

  if (/\$\s*\d|\bpaid\b|\bticket\b|\bmonthly\b|\bdrop-in\b/.test(searchable)) {
    return 'paid'
  }

  return 'unknown'
}

function buildVenue(source: GoogleCalendarEvent, fields: Record<string, string>): PublicEvent['venue'] {
  const online = parseBoolean(fields.online) ?? false
  const name = fields.venue || undefined
  const address = fields.address || source.location || undefined
  const city = fields.city || inferKnownPlace(source.location, CITY_VALUES) || undefined
  const neighborhood = fields.neighborhood || inferKnownPlace(source.location, NEIGHBORHOOD_VALUES) || undefined

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

function inferKnownPlace(value: string | undefined, knownValues: string[]): string | undefined {
  const normalized = value?.toLowerCase()

  if (!normalized) {
    return undefined
  }

  return knownValues.find((knownValue) => normalized.includes(knownValue.toLowerCase()))
}

type WeeklyRecurrence = {
  weekday: number
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

function parseWeeklyRecurrence(note?: string): WeeklyRecurrence | undefined {
  const normalized = note?.toLowerCase()

  if (!normalized || !normalized.includes('weekly')) {
    return undefined
  }

  const weekday = Object.entries(WEEKDAY_VALUES).find(([name]) => normalized.includes(name))?.[1]
  const timeMatch = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)

  if (!weekday || !timeMatch) {
    return undefined
  }

  const endMeridiem = timeMatch[6]
  const startMeridiem = timeMatch[3] || endMeridiem
  const start = toTwentyFourHour(Number(timeMatch[1]), Number(timeMatch[2] ?? 0), startMeridiem)
  const end = toTwentyFourHour(Number(timeMatch[4]), Number(timeMatch[5] ?? 0), endMeridiem)

  if (!start || !end) {
    return undefined
  }

  return {
    weekday,
    startHour: start.hour,
    startMinute: start.minute,
    endHour: end.hour,
    endMinute: end.minute,
  }
}

function toTwentyFourHour(
  hour: number,
  minute: number,
  meridiem: string,
): { hour: number; minute: number } | undefined {
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return undefined
  }

  const normalizedHour = meridiem === 'am' ? hour % 12 : (hour % 12) + 12
  return { hour: normalizedHour, minute }
}

function expandWeeklyEvent(
  event: PublicEvent,
  recurrence: WeeklyRecurrence,
  seriesStart: DateTime<boolean>,
  seriesEnd: DateTime<boolean>,
  rangeStart?: DateTime<boolean>,
  rangeEnd?: DateTime<boolean>,
): PublicEvent[] {
  const occurrences: PublicEvent[] = []
  let cursor = seriesStart.startOf('day')

  while (cursor.weekday !== recurrence.weekday) {
    cursor = cursor.plus({ days: 1 })
  }

  while (cursor < seriesEnd) {
    let occurrenceStart = cursor.set({
      hour: recurrence.startHour,
      minute: recurrence.startMinute,
      second: 0,
      millisecond: 0,
    })

    if (occurrenceStart < seriesStart) {
      cursor = cursor.plus({ weeks: 1 })
      continue
    }

    let occurrenceEnd = cursor.set({
      hour: recurrence.endHour,
      minute: recurrence.endMinute,
      second: 0,
      millisecond: 0,
    })

    if (occurrenceEnd <= occurrenceStart) {
      occurrenceEnd = occurrenceEnd.plus({ days: 1 })
    }

    if (occurrenceStart >= seriesEnd) {
      break
    }

    if ((!rangeStart || occurrenceEnd > rangeStart) && (!rangeEnd || occurrenceStart < rangeEnd)) {
      const start = toIso(occurrenceStart)
      const end = toIso(occurrenceEnd)

      occurrences.push({
        ...event,
        id: `${event.source.eventId}-${start.replace(/[^a-zA-Z0-9]/g, '')}`,
        source: {
          ...event.source,
          recurringEventId: event.source.eventId,
          originalStartTime: start,
        },
        start,
        end,
        allDay: false,
        multiDay: occurrenceStart.toISODate() !== occurrenceEnd.toISODate(),
      })
    }

    cursor = cursor.plus({ weeks: 1 })
  }

  return occurrences
}

function toIso(value: DateTime<boolean>): string {
  return value.setZone(CANONICAL_TIMEZONE).toISO({ suppressMilliseconds: true }) ?? value.toISO() ?? ''
}

function parseRangeBoundary(value: string): DateTime<boolean> | undefined {
  const parsed = DateTime.fromISO(value, { setZone: true }).setZone(CANONICAL_TIMEZONE)
  return parsed.isValid ? parsed : undefined
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
