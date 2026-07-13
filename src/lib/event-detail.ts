import type { PublicEvent } from '../types/events'

const DETAIL_SEPARATOR = '--'

export function getEventDetailPath(event: Pick<PublicEvent, 'id' | 'title'>): string {
  return `/events/${slugifyTitle(event.title)}${DETAIL_SEPARATOR}${encodeEventId(event.id)}`
}

export function getEventIdFromDetailPath(pathname: string): string | undefined {
  const [, eventSegment] = pathname.match(/^\/events\/([^/?#]+)\/?$/) ?? []

  if (!eventSegment) {
    return undefined
  }

  const separatorIndex = eventSegment.lastIndexOf(DETAIL_SEPARATOR)

  if (separatorIndex === -1) {
    return undefined
  }

  return decodeEventId(eventSegment.slice(separatorIndex + DETAIL_SEPARATOR.length))
}

export function findEventByDetailPath(events: PublicEvent[], pathname: string): PublicEvent | undefined {
  const eventId = getEventIdFromDetailPath(pathname)
  return eventId ? events.find((event) => event.id === eventId) : undefined
}

export function getEventCanonicalUrl(event: PublicEvent, origin: string): string {
  return `${origin}${getEventDetailPath(event)}`
}

export function getEventSummary(event: PublicEvent): string {
  return event.excerpt || event.description || `${event.title} on Fresno Events.`
}

export function buildGoogleCalendarUrl(event: PublicEvent, eventUrl?: string): string {
  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', event.title)
  url.searchParams.set('dates', buildGoogleCalendarDates(event))

  const details = [event.description, eventUrl ? `More details: ${eventUrl}` : undefined].filter(Boolean).join('\n\n')

  if (details) {
    url.searchParams.set('details', details)
  }

  const location = formatEventLocation(event)

  if (location) {
    url.searchParams.set('location', location)
  }

  return url.toString()
}

export function buildIcsContent(event: PublicEvent, eventUrl: string, generatedAt = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fresno Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(`${event.id}@fresnoevents`)}`,
    `DTSTAMP:${formatIcsDateTime(generatedAt.toISOString())}`,
    ...buildIcsDateLines(event),
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText([event.description || event.excerpt, eventUrl].filter(Boolean).join('\n\n'))}`,
    ...buildOptionalIcsLine('LOCATION', formatEventLocation(event)),
    ...buildOptionalIcsLine('URL', eventUrl),
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return `${lines.join('\r\n')}\r\n`
}

export function buildIcsDataUrl(event: PublicEvent, eventUrl: string): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcsContent(event, eventUrl))}`
}

export function buildMapUrl(event: PublicEvent): string | undefined {
  if (event.venue?.mapUrl) {
    return event.venue.mapUrl
  }

  const query = event.venue?.address || [event.venue?.name, event.venue?.city].filter(Boolean).join(', ')

  if (!query) {
    return undefined
  }

  const url = new URL('https://www.google.com/maps/search/')
  url.searchParams.set('api', '1')
  url.searchParams.set('query', query)
  return url.toString()
}

export function buildStructuredEventData(event: PublicEvent, eventUrl: string): Record<string, unknown> {
  const location = event.venue?.online
    ? {
        '@type': 'VirtualLocation',
        url: event.links.websiteUrl || event.links.registrationUrl || event.links.sourceUrl || eventUrl,
      }
    : event.venue
      ? {
          '@type': 'Place',
          name: event.venue.name || event.venue.address || event.venue.city,
          address: event.venue.address || event.venue.city,
        }
      : undefined

  return removeUndefinedValues({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description || event.excerpt,
    startDate: event.start,
    endDate: event.end,
    eventStatus:
      event.status === 'tentative' ? 'https://schema.org/EventScheduled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.venue?.online
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    image: event.media?.imageUrl,
    location,
    organizer: event.organizer?.name
      ? removeUndefinedValues({
          '@type': 'Organization',
          name: event.organizer.name,
          url: event.organizer.url,
        })
      : undefined,
    offers: buildStructuredOffer(event),
    url: eventUrl,
  })
}

export function formatEventLocation(event: PublicEvent): string | undefined {
  const parts = [
    event.venue?.name,
    event.venue?.address,
    event.venue?.neighborhood,
    event.venue?.city,
    event.venue?.online ? 'Online' : undefined,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : undefined
}

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'event'
}

function encodeEventId(value: string): string {
  return encodeURIComponent(value).replace(/%/g, '~')
}

function decodeEventId(value: string): string | undefined {
  try {
    return decodeURIComponent(value.replace(/~/g, '%'))
  } catch {
    return undefined
  }
}

function buildGoogleCalendarDates(event: PublicEvent): string {
  return event.allDay
    ? `${compactDate(event.start)}/${compactDate(event.end)}`
    : `${formatIcsDateTime(event.start)}/${formatIcsDateTime(event.end)}`
}

function buildIcsDateLines(event: PublicEvent): string[] {
  if (event.allDay) {
    return [`DTSTART;VALUE=DATE:${compactDate(event.start)}`, `DTEND;VALUE=DATE:${compactDate(event.end)}`]
  }

  return [`DTSTART:${formatIcsDateTime(event.start)}`, `DTEND:${formatIcsDateTime(event.end)}`]
}

function buildOptionalIcsLine(name: string, value?: string): string[] {
  return value ? [`${name}:${escapeIcsText(value)}`] : []
}

function formatIcsDateTime(value: string): string {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function compactDate(value: string): string {
  return value.replace(/-/g, '')
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function buildStructuredOffer(event: PublicEvent): Record<string, unknown> | undefined {
  if (event.taxonomy.priceType === 'unknown') {
    return undefined
  }

  return removeUndefinedValues({
    '@type': 'Offer',
    price: event.taxonomy.priceType === 'free' ? '0' : event.pricing?.minimum,
    priceCurrency: event.pricing?.currency || 'USD',
    url: event.links.registrationUrl || event.links.sourceUrl || event.links.websiteUrl,
    availability: 'https://schema.org/InStock',
  })
}

function removeUndefinedValues<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '')) as T
}
