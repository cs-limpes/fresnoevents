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

## Phase 1: Static visual prototype

### Goal

Create a responsive, attractive static prototype using fixture data so the structure and visual direction can be reviewed before live integrations.

### Authorized

- Vite and React scaffold
- TypeScript
- basic repository scripts
- header
- introductory copy
- navigation presentation
- responsive event cards using fixture data
- category artwork or category-art placeholders
- Today, This Weekend, and Upcoming visual sections
- footer
- provisional design tokens
- realistic but fictional fixture events
- basic static accessibility
- build configuration required to run locally

### Not authorized

- Google Calendar API
- Cloudflare Worker API
- Cloudflare deployment
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
- production build succeeds
- layout works at 320px, 375px, 768px, 1024px, and 1440px
- no horizontal page scroll occurs at 320px
- fixture events render consistently
- long titles do not break the layout
- missing-image events look intentional
- keyboard focus is visible
- no future-phase dependencies have been installed
- no mocked control implies working functionality without clear prototype treatment
- Codex reports files changed and tests performed
- Codex stops

## Phase 2: Cloudflare application foundation

### Goal

Prepare the approved static prototype for one-project Cloudflare Workers with Static Assets deployment without connecting live event data.

### Authorized

- Wrangler configuration
- Worker entry point
- static asset serving
- local Cloudflare development command
- environment example file
- preview deployment configuration
- health endpoint
- documentation for local and preview environments

### Not authorized

- Google Calendar API
- real event API
- production deployment unless separately approved
- custom domain
- FullCalendar
- live filters
- event routes
- database
- analytics

### Completion means

- application runs through the Cloudflare local runtime
- static assets render correctly
- health endpoint returns documented JSON
- secrets are not committed
- preview deployment is possible
- existing Phase 1 visuals remain intact
- Codex stops

## Phase 3: Event normalization and metadata parser

### Goal

Implement and test normalization using local Google-like fixtures before contacting Google Calendar.

### Authorized

- normalized event TypeScript types
- metadata parser
- validation and fallback rules
- description separation
- safe excerpt generation
- date normalization helpers
- recurring-event fixture representation
- unit tests
- fixture API route if needed for testing

### Not authorized

- real Google credentials
- live calendar calls
- production event API
- FullCalendar
- functional public filters
- event detail routes
- database

### Completion means

- parser tests cover valid and invalid metadata
- all-day and timed events normalize correctly
- unknown categories fall back safely
- missing data does not crash the system
- metadata is not exposed in public description
- timezone-sensitive tests exist
- Codex stops

## Phase 4: Live Google Calendar integration

### Goal

Read a dedicated publishable Google Calendar through the Worker and return normalized public events.

### Authorized

- Google Calendar Events list integration
- server-side credentials or approved public access method
- pagination
- expanded recurring events
- bounded date-range validation
- normalized `/api/events`
- cache behavior
- upstream error handling
- integration tests with mocked upstream responses
- documentation for secrets and calendar configuration

### Not authorized

- public functional filtering beyond date range
- event detail routes
- FullCalendar
- submissions
- newsletter
- analytics
- database
- monetization

### Completion means

- live events load from the approved calendar
- no credentials appear in client code
- pagination works
- recurring instances are not duplicated
- canceled events are excluded
- all-day events display on correct dates
- API errors return JSON
- cache behavior is documented
- event range is bounded
- Codex stops

## Phase 5: Public browsing and filters

### Goal

Turn the live event feed into a useful discovery experience.

### Authorized

- Today view
- This Weekend view
- Next 7 Days view
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

## Phase 6: Event detail pages and sharing

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

## Phase 7: Full calendar view

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

## Phase 8: Editorial enhancements

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

## Phase 9: Event submissions

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

## Phase 10: Monetization

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
