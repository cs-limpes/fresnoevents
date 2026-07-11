# Fresno Events Data Model

## 1. Purpose

This document defines the normalized public event model and the proposed structured metadata format stored in Google Calendar descriptions.

The goal is to separate upstream Google Calendar quirks from the public UI.

This model is implementation guidance for the functional data foundation phase once that phase is explicitly authorized.

The project should prove the model against real approved Google Calendar data early. Test fixtures remain useful for edge cases, but public UI work should not depend on fictional events unless a task explicitly authorizes that fallback.

## 2. Normalized event type

Proposed TypeScript shape:

```ts
export type PublicEvent = {
  id: string
  source: {
    provider: 'google-calendar'
    calendarId?: string
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
  status: 'confirmed' | 'tentative' | 'cancelled'

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
```

Fields may be refined during implementation. Changes must be documented rather than made silently.

## 3. Event identifier

The public `id` must uniquely identify an individual event occurrence.

For recurring events, the source event ID alone may not be sufficient.

A stable derived ID may combine:

- Google event ID
- original occurrence start

Do not derive the public identifier from title alone.

Recurring-event instance identity is required for the first live-data implementation. It should not be deferred until later visual or calendar-grid work.

## 4. Categories

Proposed enum:

```ts
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
```

Unknown or invalid category values normalize to `other`.

Category taxonomy must be reviewed against actual event inventory before filters go live.

## 5. Audience values

```ts
export type EventAudience =
  | 'all-ages'
  | 'family-friendly'
  | 'adults'
  | '18-plus'
  | '21-plus'
  | 'youth'
  | 'unknown'
```

Audience values must come from source information or explicit editorial metadata.

## 6. Price values

```ts
export type EventPriceType =
  | 'free'
  | 'paid'
  | 'donation'
  | 'registration-required'
  | 'unknown'
```

`registration-required` does not imply paid.

Specific price strings may be retained separately, such as `$10-$20`.

## 7. Description metadata format

The proposed metadata block begins after a delimiter line containing exactly:

```text
---
```

Everything before the delimiter is public description content.

Everything after it is metadata using one `key: value` entry per line.

Example:

```text
Join local musicians for an evening show in the Tower District.

---
category: music
tags: live music, local artists
city: Fresno
neighborhood: Tower District
venue: Example Venue
audience: 21+
price: paid
price_text: $12 advance / $15 door
featured: false
promoted: false
sponsored: false
image: https://example.com/event.jpg
image_alt: Musicians performing on stage
source: https://example.com/official-event
registration: https://example.com/tickets
organizer: Example Productions
```

## 8. Allowed metadata keys

Initial proposed keys:

- `category`
- `tags`
- `city`
- `neighborhood`
- `venue`
- `address`
- `online`
- `audience`
- `price`
- `price_text`
- `ticket_url`
- `featured`
- `promoted`
- `sponsored`
- `sponsor_name`
- `image`
- `image_alt`
- `flyer`
- `source`
- `registration`
- `website`
- `organizer`
- `organizer_url`
- `accessibility`

Unknown keys should be ignored and optionally logged in development.

## 9. Parsing rules

Proposed rules:

- keys are case-insensitive and normalized to lowercase
- surrounding whitespace is trimmed
- first delimiter only separates public description from metadata
- duplicate scalar keys use the last valid value and produce a development warning
- comma-separated lists are trimmed and deduplicated
- booleans accept `true`, `false`, `yes`, and `no`
- URLs must parse as HTTPS unless an explicit exception is approved
- invalid values fall back safely
- parser errors must not prevent the event from displaying
- raw metadata must never be shown publicly

## 10. Fallback rules

### Missing category

Use `other`.

### Missing image

Use category art.

### Missing description

Omit the description and excerpt.

### Missing venue

Display city or `Location not listed` only if product copy approves that phrase.

### Missing city

Do not infer it solely from the calendar name.

A documented venue-to-city mapping may be used later.

### Missing price

Use `unknown`, not `free`.

### Missing audience

Use `unknown`.

### Missing end time

Google Calendar normally provides an end. If malformed upstream data lacks one, reject or repair according to an explicit tested rule during implementation.

## 11. Date model

Timed event:

```json
{
  "start": "2026-07-10T19:00:00-07:00",
  "end": "2026-07-10T21:00:00-07:00",
  "allDay": false
}
```

All-day event:

```json
{
  "start": "2026-07-10",
  "end": "2026-07-11",
  "allDay": true
}
```

For all-day events, the end date is exclusive.

The normalized model may preserve date-only strings for all-day events to avoid timezone drift.

## 12. Multi-day rules

An event is multi-day when:

- a timed event crosses the local calendar-day boundary, or
- an all-day event spans more than one date

Display behavior is defined by the design and implementation phase.

## 13. Cancellation rules

Canceled events should not normally appear in public browsing.

A future feature may display recently canceled events with a cancellation notice when editorially useful.

Do not silently present canceled events as active.

## 14. Duplicate handling

Potential duplicates may arise from:

- repeated calendar entries
- recurring instances
- imported events
- organizer corrections

Initial rule:

- only exact source occurrence duplicates should be automatically collapsed
- title-and-time similarity alone should not delete events
- fuzzy duplicate detection is a future editorial tool, not an initial public API responsibility

## 15. Slugs

Event-detail URLs may eventually use a readable slug plus stable identifier.

Example:

```text
/events/moonlight-market-abc123
```

The stable identifier remains authoritative.

Changing a title should not make the event unreachable.

## 16. Test fixture requirements

Test fixtures should include Google-like source records and normalized public records for:

- timed event
- all-day event
- multi-day event
- recurring instance
- free event
- paid event
- unknown-price event
- event without image
- event with flyer
- event without venue
- long title
- long description
- 21+ event
- family-friendly event
- online event
- featured event

Fixtures are for automated tests, parser development, and rare offline debugging. Public reader-facing views should use real approved calendar data once the functional data foundation phase is authorized.
