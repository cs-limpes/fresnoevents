# Fresno Events Development Phases

## Governing rule

The full roadmap is context, not authorization.

Codex may implement only the phase explicitly named in the current task.

Completing a phase does not authorize starting the next phase.

## Phase 0: Documentation and architecture review

### Goal

Establish shared product, architecture, data, design, and workflow guidance before application code exists.

### Authorized

- repository documentation
- decision logs
- architecture review
- risk identification
- questions requiring human decisions
- corrections to contradictions among documentation files

### Not authorized

- application scaffold
- package installation
- Cloudflare configuration
- Google Calendar integration
- visual prototype
- API code
- deployment

### Completion means

- all guidance files are populated
- contradictions are identified
- unresolved decisions are listed
- Codex provides a documentation-only assessment
- no application code is created

## Phase 1: Functional data foundation

### Goal

Create a minimal one-project application that proves Fresno Events can read the approved Google Calendar, normalize real event data, and render a plain usable public event list before visual polish is finalized.

This is a function-first walking skeleton. The purpose is to expose recurring events, all-day events, multi-day events, source descriptions, metadata, missing fields, and Flyer2Calendar quirks early so the design can respond to real data rather than fictional fixtures.

### Authorized

- Vite and React scaffold
- TypeScript
- basic repository scripts
- Cloudflare Workers with Static Assets local foundation
- Wrangler configuration required for local development
- Worker entry point
- static asset serving through the local Worker runtime
- environment example file with variable names only
- approved server-side Google Calendar access method
- Google Calendar Events list integration
- explicit `timeMin` and `timeMax`
- `singleEvents=true` and `orderBy=startTime`
- pagination through `nextPageToken`
- bounded event-range validation
- normalized `/api/events` or equivalent event-data route
- normalized public event TypeScript types
- metadata parser
- validation and fallback rules
- description separation
- safe excerpt generation
- minimal sanitization or reduction of any rendered upstream description
- recurring-event expansion and stable occurrence identifiers
- handling for all-day, multi-day, modified, tentative, and canceled events
- Today, This Weekend, and Upcoming date-range calculations
- minimal reader-facing list using real approved calendar data
- loading, empty, and error states
- unit tests for parser, normalization, timezone behavior, and date ranges
- integration tests with mocked Google Calendar responses
- basic static accessibility
- build configuration required to run locally

### Not authorized

- final visual design
- final logo
- final palette
- category-specific artwork
- polished card design beyond what is needed for readability
- FullCalendar
- public functional filtering beyond date range
- keyword search
- event detail routing
- newsletter integration
- event submission form
- analytics
- authentication
- database
- sponsorship system
- payments
- organizer accounts
- real event scraping
- production deployment
- custom domain configuration

### Completion means

- the application runs locally
- the application runs through the local Cloudflare Worker runtime
- production build succeeds
- secrets are not committed
- credentials and calendar identifiers are not exposed in client code
- live events load from the approved calendar through the server only
- pagination works
- recurring instances are expanded without duplicate rendering
- stable occurrence identifiers exist for recurring instances
- canceled events are excluded from normal display unless intentionally handled
- all-day events display on correct local dates
- multi-day events are represented clearly enough for the next visual phase
- Today, This Weekend, and Upcoming ranges are calculated in `America/Los_Angeles`
- Upcoming means the remainder of the current month, unless fewer than 7 days remain, then the next 7 days
- upstream descriptions are not injected directly into React
- metadata is not exposed in public descriptions
- API errors return controlled JSON
- loading, empty, and error states are visible in the plain UI
- event range is bounded
- no future-phase dependencies have been installed
- Codex reports files changed and tests performed
- Codex stops

## Phase 2: Reader-facing visual foundation

### Goal

Turn the real normalized event feed into a responsive, readable, visually coherent event-discovery experience.

Visual decisions should be informed by the data behavior proven in Phase 1.

### Authorized

- header
- temporary `Fresno Events` bold-serif wordmark
- introductory copy
- navigation placement, with nonfunctional controls concealed from users until implemented
- responsive event cards using real normalized event data
- default shared category artwork or category-art placeholders
- Today, This Weekend, and Upcoming visual sections
- footer
- provisional design tokens
- starting palette with Elden Ring `#F28705` as the primary/accent color
- maintainable design structure so colors, wordmark/logo treatment, graphics, and category artwork are easy to change
- basic static accessibility

### Not authorized

- major changes to the Phase 1 event API unless required to fix discovered data bugs
- final brand identity
- final logo
- final category artwork system
- FullCalendar
- live search
- functional filtering
- event detail routing
- newsletter integration
- event submission form
- analytics
- authentication
- database
- sponsorship system
- payments
- organizer accounts
- real event scraping
- production domain configuration

### Completion means

- the page runs locally
- the page uses real normalized event data from the Phase 1 API
- production build succeeds
- layout works at 320px, 375px, 768px, 1024px, and 1440px
- no horizontal page scroll occurs at 320px
- event cards render consistently
- long titles do not break the layout
- missing-image events look intentional
- all-day and multi-day events are understandable in cards
- recurring instances do not appear duplicated
- keyboard focus is visible
- nonfunctional controls are concealed from users until implemented
- no future-phase dependencies have been installed
- Codex reports files changed and tests performed
- Codex stops

## Phase 3: Public browsing and filters

### Goal

Turn the live event feed into a useful discovery experience.

### Authorized

- Today view
- This Weekend view
- Upcoming view
- keyword search
- category filters
- city filters
- neighborhood filters
- audience filters
- price filters
- URL query state
- clear-all behavior
- result counts
- filter empty states
- accessible mobile filter controls

### Not authorized

- event detail routing
- FullCalendar month grid
- newsletter provider
- submissions
- organizer accounts
- sponsorship sales system
- database unless a separate architecture decision authorizes it

### Completion means

- filters combine predictably
- URL reload reproduces state
- browser back and forward work
- keyboard navigation works
- mobile controls remain usable
- no-result states distinguish filters from lack of events
- Codex stops

## Phase 4: Event detail pages and sharing

### Goal

Create indexable, shareable event detail experiences.

### Authorized

- stable event routes
- event details
- sanitized descriptions
- map links
- source and registration links
- Add to Google Calendar
- `.ics` generation
- share controls
- Open Graph metadata
- event structured data when accurate
- expired event handling
- canonical URLs

### Not authorized

- organizer editing
- user accounts
- paid promotion
- payment processing
- event submissions

### Completion means

- detail links remain stable when titles change
- unsafe HTML is not rendered
- sharing metadata is correct
- calendar export works
- structured data validates
- expired events have intentional behavior
- Codex stops

## Phase 5: Full calendar view

### Goal

Add a traditional calendar option without making it the only discovery experience.

### Authorized

- FullCalendar installation
- month view
- list view
- date navigation
- responsive calendar behavior
- selected filters applied to calendar events
- accessible event interactions

### Not authorized

- premium scheduler features
- resource timelines
- organizer accounts
- submissions
- database solely to support the calendar grid

### Completion means

- calendar dates match list views
- all-day and multi-day rendering is correct
- mobile experience is reviewed
- keyboard use is possible
- no duplicate events appear
- Codex stops

## Phase 6: Editorial enhancements

### Goal

Support editorial curation and audience growth features.

Possible authorized items, only when individually approved:

- featured-event management
- curated weekend guide
- newsletter signup
- seasonal collections
- category landing pages
- neighborhood landing pages
- corrections contact flow
- privacy-conscious analytics

Each item requires its own scoped task and acceptance criteria.

## Phase 7: Event submissions

### Goal

Allow organizers or residents to propose events without directly publishing them.

Potential scope:

- submission form
- spam controls
- moderation queue
- editorial approval
- duplicate review
- confirmation email
- submission policies

This phase requires a new architecture decision regarding storage and moderation.

No submission should publish automatically in the initial implementation.

## Phase 8: Monetization

### Goal

Introduce revenue without degrading trust.

Potential scope:

- promoted events
- sponsorship placements
- newsletter sponsorships
- venue profiles
- advertising inventory
- payment handling
- reporting

Requirements:

- paid placement clearly labeled
- editorial and paid status stored separately
- no hidden pay-to-rank behavior
- privacy and disclosure review
- explicit product and technical specification before implementation

## Required prompt format for each Codex task

Every implementation prompt should include:

1. authorized phase
2. exact goal
3. files or areas in scope
4. explicit exclusions
5. acceptance criteria
6. tests required
7. instruction to stop after completion

## First Codex task

The first Codex task should be documentation-only:

```text
Read AGENTS.md and every file in docs/.

Do not create or modify application code.
Do not install packages.
Do not scaffold the app.

Review the documentation for contradictions, missing decisions, hidden dependencies, security risks, and implementation risks. Produce a written assessment containing:

1. Your understanding of the product.
2. The current authorized phase.
3. Contradictions or ambiguities.
4. Decisions that require human approval before Phase 1.
5. Risks likely to cause rework.
6. A proposed Phase 1 file plan.
7. Confirmation that you made no code changes.

Stop after the assessment.
```
