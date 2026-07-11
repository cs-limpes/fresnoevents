# Fresno Events Technical Architecture

## 1. Architecture summary

The planned production architecture is a single TypeScript application using:

- React
- Vite
- Cloudflare Workers with Static Assets
- a Worker API route for event data
- Google Calendar API as the initial upstream source
- FullCalendar only when the calendar-view phase authorizes it
- client-side event browsing for already-fetched ranges where appropriate
- Cloudflare caching for normalized event responses

The architecture should remain simple enough for one developer to understand and maintain.

## 2. Implementation sequencing

The current roadmap is function-first.

The first implementation phase should prove a thin vertical slice using real approved Google Calendar data before finalizing the visual design. This reduces rework by letting recurring events, all-day events, multi-day events, source descriptions, metadata, missing fields, and Flyer2Calendar quirks shape the user interface early.

The first live-data implementation should still remain narrow:

- one public event list
- bounded date ranges
- normalized server-owned event data
- plain, usable rendering
- clear loading, empty, and error states
- no production deployment unless separately authorized
- no search, filters, event detail routes, FullCalendar, submissions, analytics, database, or monetization

Visual polish should build on the real normalized data model rather than on fictional fixtures.

## 3. Why a single Cloudflare project

Use one Cloudflare Worker project that serves both:

- compiled static front-end assets
- server-side API routes

Benefits:

- one repository
- one deployment
- one local development command
- one configuration
- no cross-project CORS setup
- server-side access to secrets
- straightforward caching

Do not split the front end and API into separate Cloudflare projects unless a demonstrated requirement justifies it.

## 4. Proposed repository shape

The exact scaffold is authorized only in the appropriate phase.

```text
/
  AGENTS.md
  README.md
  package.json
  tsconfig.json
  vite.config.ts
  wrangler.jsonc
  public/
  src/
    app/
    components/
    features/
    fixtures/
    lib/
    styles/
    types/
    main.tsx
  worker/
    index.ts
    routes/
    services/
    types/
  tests/
  docs/
```

Do not create all directories preemptively. Create only what the current phase needs.

## 5. Runtime boundaries

### Browser responsibilities

The browser may:

- render UI
- manage current filters
- update shareable URL state
- request normalized event data
- display loading, empty, and error states
- perform lightweight filtering on already-loaded data
- handle accessible UI interactions

The browser must not:

- contain Google API secrets
- call private calendar endpoints with credentials
- parse unsafe raw HTML without sanitization
- make authoritative timezone assumptions based on device timezone
- become the only place where upstream event normalization occurs

### Worker responsibilities

The Worker owns live event-data responsibilities when a phase authorizes Google Calendar integration. Depending on the authorized phase, it will:

- validate API request parameters
- fetch Google Calendar events
- handle pagination
- request expanded recurring-event instances
- normalize upstream data
- parse structured metadata
- sanitize or reduce public descriptions
- cache responses when cache behavior is authorized
- return a stable public event schema
- provide controlled error responses
- keep credentials server-side

## 6. Google Calendar integration

Use the Google Calendar Events list endpoint.

Important expected request behavior:

- `singleEvents=true` to expand recurring events
- `orderBy=startTime` when using expanded events
- explicit `timeMin`
- explicit `timeMax`
- pagination through `nextPageToken`
- canonical timezone awareness
- exclusion or appropriate handling of canceled events
- support for all-day events whose start and end use date-only values

Calendar access strategy must be approved before implementation.

Preferred initial approach:

- dedicated calendar containing only publishable events
- server-side API access
- Calendar ID stored as configuration or secret as appropriate
- no personal calendar credentials in browser code

## 7. Public API shape

Proposed route:

```text
GET /api/events?start=<ISO>&end=<ISO>
```

Potential later parameters:

- category
- city
- neighborhood
- audience
- price
- query

The initial API should avoid premature filtering parameters if client-side filtering of a bounded event range is simpler.

Proposed response:

```json
{
  "events": [],
  "range": {
    "start": "2026-07-01T00:00:00-07:00",
    "end": "2026-08-01T00:00:00-07:00",
    "timezone": "America/Los_Angeles"
  },
  "generatedAt": "2026-07-10T20:00:00Z"
}
```

The exact event shape is defined in `event-data-model.md`.

## 8. Caching

The event API should eventually use Cloudflare caching.

Goals:

- reduce Google API calls
- improve response time
- tolerate brief upstream interruptions
- keep updates reasonably fresh

Initial proposed policy:

- cache by normalized date range
- short edge TTL, such as 5 to 15 minutes
- permit explicit cache bypass only for authenticated editorial tooling in a future phase
- avoid caching error responses for long periods
- use stale content carefully if implemented

Do not implement a cron refresh, KV, D1, Durable Objects, or queues unless a later requirement demonstrates the need.

## 9. Timezone handling

Canonical timezone:

```text
America/Los_Angeles
```

Rules:

- server date calculations must use the canonical timezone
- Today and This Weekend are calculated in the canonical timezone
- date-only Google Calendar values represent all-day events
- all-day end dates are exclusive
- event timestamps should retain their source offset when useful
- the public schema should include enough information to render dates correctly
- tests must cover daylight saving transitions

Do not rely on `new Date()` plus local machine assumptions for business logic.

Use a timezone-capable standard or library only when the relevant phase requires date logic. Because the roadmap now starts with real event data, timezone-capable handling is appropriate in the functional data foundation phase if built-in APIs are not sufficient.

## 10. Recurring events

Recurring-event support is required for the first live-data implementation, not deferred polish.

When live calendar data is fetched:

- retrieve expanded instances
- retain a stable instance identifier
- preserve the recurring series identifier when available
- treat modified instances independently
- exclude canceled instances from normal display
- avoid duplicate rendering

Tests should include:

- weekly recurring event
- modified occurrence
- canceled occurrence
- recurrence crossing daylight saving time

## 11. Description handling

Google Calendar descriptions may contain plain text, HTML, links, and structured metadata.

The server should:

1. separate the structured metadata block
2. parse and validate known fields
3. remove the metadata block from public description
4. sanitize any retained HTML
5. produce plain-text excerpts for cards
6. preserve safe links for detail views

Never inject upstream description HTML directly into React.

## 12. Security

Requirements:

- no secrets committed to Git
- use Cloudflare secrets for private credentials
- maintain `.dev.vars.example` or equivalent with names only
- validate query parameters
- constrain event-range requests
- sanitize descriptions
- avoid open proxy behavior
- use security headers
- do not expose private calendar data
- do not log secrets or full sensitive responses
- rate-limit only if actual abuse warrants it

## 13. Error behavior

The API should return JSON errors.

Example:

```json
{
  "error": {
    "code": "EVENT_SOURCE_UNAVAILABLE",
    "message": "Events are temporarily unavailable."
  }
}
```

Public error messages should be useful but not expose implementation details.

The UI should distinguish:

- loading
- no matching events
- upstream unavailable
- invalid request
- offline or network failure

## 14. Front-end state

When functional filtering is authorized:

- filter state should be represented in URL query parameters
- reloading should preserve the view
- sharing the URL should reproduce the view
- clearing filters should be obvious
- browser back and forward navigation should work

Do not introduce a global state library unless built-in React state and URL state become insufficient.

## 15. Routing

Routing is deferred until its phase.

Likely eventual routes:

```text
/
/events
/events/:slug-or-id
/calendar
/this-weekend
/category/:category
/location/:location
/about
/submit
```

Do not implement event detail routes during the functional data foundation phase unless explicitly authorized.

When event detail routing is implemented, identifiers must remain stable even if titles change.

## 16. FullCalendar

FullCalendar is planned for a later full-calendar view.

It should not determine the entire product architecture.

Use it for calendar mechanics, not as the default design system.

Do not install it before the phase that authorizes the real calendar view.

## 17. Testing strategy

### Functional data foundation phase

- local app and Worker start successfully
- build succeeds
- no secrets appear in client code or committed files
- approved calendar access works through the server only
- Google Calendar pagination is handled
- metadata parser unit tests
- date normalization tests
- timezone tests
- recurring-event fixture tests
- API response tests
- upstream error tests
- all-day, multi-day, canceled, modified, and recurring instances are covered
- unsafe upstream descriptions are not injected directly into React

### Reader-facing visual foundation phase

- build succeeds
- lint succeeds if linting exists
- visual checks at defined widths
- no future integrations beyond the already-approved event API
- long titles, missing images, all-day events, multi-day events, and recurring instances remain readable
- nonfunctional controls are concealed from users until implemented

### Interactive browsing phase

- filter combination tests
- URL-state tests
- keyboard navigation tests
- responsive interaction tests

### Production phase

- deployment smoke test
- security headers
- accessibility audit
- performance audit
- structured-data validation
- monitoring behavior

## 18. Observability

Initial observability should remain lightweight.

Potential later tools:

- Cloudflare request logs
- error logging
- privacy-conscious analytics

Do not add analytics or third-party monitoring until explicitly authorized and selected.

## 19. Deployment environments

Planned environments:

- local development
- preview deployment
- production

Environment-specific values should not be hard-coded.

Production deployment and domain configuration require explicit authorization.

## 20. Scalability

The initial design should scale through:

- static asset delivery at the edge
- cached API responses
- bounded event-range queries
- lightweight normalized JSON
- optimized images
- minimal client dependencies

Do not preemptively build distributed infrastructure for hypothetical scale.

If traffic or editorial complexity later requires a database, search index, queue, or separate service, introduce it based on measured need.

## 21. Architectural decision rule

When choosing between two implementations, prefer the one that:

- satisfies current requirements
- preserves documented future options
- has fewer moving parts
- is easier to test
- is easier for one developer to maintain
- avoids irreversible coupling
