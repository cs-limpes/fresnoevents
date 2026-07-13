# Current Working State

Last updated: 2026-07-13

## Implemented

- Google Calendar events are retrieved through the server-side Cloudflare Worker only.
- The public app renders a real event-discovery agenda using normalized Google Calendar data.
- Agenda sections are:
  - Today
  - This Weekend
  - Upcoming
- Upcoming means the remainder of the current month, unless fewer than seven days remain, then the next seven days.
- Recurring event instances are expanded by the Google Calendar API using `singleEvents=true` and rendered as individual occurrences.
- Canceled events are excluded from normal display.
- All-day and multi-day events are represented in the normalized event model and displayed with explicit labels.
- Event descriptions are reduced to safe plain text; upstream HTML is not injected into React.
- Structured metadata blocks are parsed from Google Calendar descriptions and removed from public descriptions.
- Public source links come only from explicit event metadata, not from the Google Calendar `htmlLink`.
- The current visual foundation includes:
  - temporary bold-serif `Fresno Events` wordmark
  - provisional palette using Elden Ring `#F28705` as the accent color
  - shared default date/category artwork
  - responsive event cards
  - mobile-first layout
- Public browsing filters are implemented client-side over the loaded event range:
  - keyword search
  - date window
  - category
  - city
  - neighborhood
  - audience
  - price
  - active filter chips
  - clear-all behavior
  - URL query state
- Event detail pages are implemented at stable `/events/:slug--encodedId` paths.
- Event detail pages include:
  - full plain-text event information
  - event date/time
  - venue and location details when provided
  - map links when enough location data exists
  - official, registration, and website links when provided
  - Add to Google Calendar link
  - downloadable `.ics`
  - copy/share controls
  - structured event data
  - client-side title, canonical, and Open Graph metadata updates
- The Worker serves event-detail app-shell responses with event-specific metadata when the event is present in the current feed.
- Automated tests currently cover:
  - metadata parsing
  - date range logic
  - event normalization
  - agenda section grouping
  - public filters
  - event detail helper behavior

## Current architecture

- Stack:
  - TypeScript
  - React
  - Vite
  - Luxon
  - Cloudflare Workers with Static Assets
  - Vitest
- Worker entry point:
  - `worker/index.ts`
- Static assets:
  - built into `dist/`
  - served through the `ASSETS` binding
  - `wrangler.jsonc` uses `run_worker_first: true` so the Worker can handle API and detail routes before falling through to assets
- Public event API:
  - `GET /api/events`
  - implemented in `worker/routes/events.ts`
  - validates bounded date ranges
  - fetches Google Calendar Events list data server-side
  - requests expanded recurring instances
  - handles pagination
  - normalizes events before returning JSON
- App-shell metadata route:
  - implemented in `worker/routes/app-shell.ts`
  - handles `/` and `/events/...`
  - injects basic title, description, canonical, and Open Graph tags into HTML responses
  - falls back to default site metadata when an event cannot be resolved
- Event fetching path:
  - browser calls `fetchEvents()` in `src/lib/events-api.ts`
  - `fetchEvents()` requests `/api/events`
  - Worker validates range, fetches Google Calendar, normalizes events, and returns the public event response
- Normalization path:
  - `worker/services/normalize-event.ts`
  - parses public descriptions and structured metadata
  - validates known metadata fields
  - removes metadata from public descriptions
  - creates stable occurrence identifiers
  - computes all-day and multi-day flags
  - maps unknown taxonomy values to documented fallbacks
- Date-range logic:
  - Worker range validation lives in `worker/lib/date-ranges.ts`
  - UI agenda grouping lives in `src/lib/agenda-sections.ts`
  - filter-aware section selection lives in `src/lib/event-filters.ts`
  - canonical timezone is always `America/Los_Angeles`
- Event detail helpers:
  - `src/lib/event-detail.ts`
  - builds stable detail paths
  - resolves event IDs from detail URLs
  - builds Google Calendar links
  - builds `.ics` content
  - builds map URLs
  - builds conservative structured event data

## Known issues

- Event detail pages can resolve only events included in the current default event feed. Old, expired, or out-of-range event URLs show the current "Event not found" state.
- Event-detail app-shell metadata currently requires loading the current default event feed to resolve a detail URL. This is acceptable for the current implementation but should be revisited before production traffic, likely with caching or a more targeted lookup.
- Production deployment, custom domain configuration, production secrets, and production cache policy have not been completed.
- Final brand identity, final logo, and final category-specific artwork are not complete.
- FullCalendar month/list calendar view has not been implemented.
- Event submissions, organizer accounts, newsletter integration, analytics, sponsorship tooling, payments, and database-backed editorial tooling have not been implemented.
- `docs/working-state.md` itself is currently a working-state reference and should be updated whenever a phase materially changes the implementation.

## Current task

- Current active task: keep `docs/working-state.md` accurate as a concise implementation snapshot.
- No new product feature slice is authorized by this document.
- The next roadmap phase after the current implemented work is Phase 5: Full calendar view, but it still requires explicit task authorization before implementation.

## Decisions already made

- America/Los_Angeles is the canonical timezone.
- Google Calendar is the current event source.
- Agenda browsing is a primary experience.
- Real calendar data is preferred over fictional public fixture data.
- Google Calendar credentials and calendar identifiers must remain server-side.
- The public UI must not invent missing event facts.
- Public source links must come from explicit event metadata, not Google Calendar internals.
- Upstream descriptions must not be rendered as raw HTML.
- The public browsing sections are Today, This Weekend, and Upcoming.
- Upcoming means the remainder of the current month, unless fewer than seven days remain, then the next seven days.
- Nonfunctional controls should remain concealed until their behavior is implemented.
- The temporary wordmark is text-based: `Fresno Events` in a bold serif style.
- The current palette is provisional and should remain easy to change.
- Detail route stability depends on the normalized event occurrence ID, not the title slug.
- Do not revisit these decisions unless new evidence creates a conflict.
