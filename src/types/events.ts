export type EventCategory =
  | 'art'
  | 'music'
  | 'food-drink'
  | 'markets'
  | 'festivals'
  | 'family'
  | 'community'
  | 'classes-workshops'
  | 'nightlife'
  | 'outdoors'
  | 'sports'
  | 'wellness'
  | 'spiritual'
  | 'theater-film'
  | 'other'

export type EventAudience =
  | 'all-ages'
  | 'family-friendly'
  | 'adults'
  | '18-plus'
  | '21-plus'
  | 'youth'
  | 'unknown'

export type EventPriceType =
  | 'free'
  | 'paid'
  | 'donation'
  | 'registration-required'
  | 'unknown'

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled'

export type PublicEvent = {
  id: string
  source: {
    provider: 'google-calendar'
    eventId: string
    recurringEventId?: string
    originalStartTime?: string
    htmlLink?: string
  }

  title: string
  slug?: string
  description?: string
  excerpt?: string

  start: string
  end: string
  timezone: 'America/Los_Angeles'
  allDay: boolean
  multiDay: boolean
  status: EventStatus

  venue?: {
    name?: string
    address?: string
    city?: string
    neighborhood?: string
    mapUrl?: string
    online: boolean
  }

  taxonomy: {
    primaryCategory: EventCategory
    tags: string[]
    audience: EventAudience[]
    priceType: EventPriceType
  }

  pricing?: {
    displayText?: string
    minimum?: number
    maximum?: number
    currency?: 'USD'
    ticketUrl?: string
  }

  organizer?: {
    name?: string
    url?: string
  }

  media?: {
    imageUrl?: string
    imageAlt?: string
    flyerUrl?: string
    categoryArtKey: string
  }

  links: {
    sourceUrl?: string
    registrationUrl?: string
    websiteUrl?: string
  }

  editorial: {
    featured: boolean
    promoted: boolean
    sponsored: boolean
    sponsorName?: string
  }

  accessibility?: {
    text?: string
  }

  updatedAt?: string
  createdAt?: string
}

export type EventsResponse = {
  events: PublicEvent[]
  range: {
    start: string
    end: string
    timezone: 'America/Los_Angeles'
  }
  generatedAt: string
}

export type ApiErrorResponse = {
  error: {
    code: string
    message: string
  }
}
