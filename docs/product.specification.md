# Fresno Events Product Specification

## 1. Product summary

Fresno Events is a polished, public event-discovery website serving Fresno and nearby communities. It transforms a curated Google Calendar into a more attractive, readable, searchable, filterable, and shareable local events destination.

The product should feel like a local editorial publication with excellent calendar functionality, not like an embedded Google Calendar.

## 2. Primary goals

The site should:

- Help residents quickly discover worthwhile local events.
- Present event information clearly on mobile and desktop.
- Support browsing by date, category, location, audience, and price.
- Maintain a cohesive visual identity even when source flyers are inconsistent.
- Make ongoing event publishing manageable through Google Calendar.
- Prove real event-data behavior early so recurring events, all-day events, multi-day events, metadata, and source quirks inform the interface before visual polish is finalized.
- Keep reader usability, ease of understanding, and data correctness ahead of decorative design.
- Provide a foundation for future audience growth, sponsorships, newsletters, promoted events, and organizer submissions.
- Remain inexpensive to operate during early growth.
- Scale without requiring a full rewrite if traffic becomes substantial.

## 3. Initial geographic scope

Primary:

- Fresno
- Clovis

Secondary, when editorially relevant:

- Madera
- Sanger
- Selma
- Reedley
- Kerman
- nearby Central Valley communities

The site may eventually support a broader regional scope, but the initial identity should remain Fresno-centered.

## 4. Audience

Primary users include:

- Fresno-area residents looking for things to do
- families
- artists and makers
- music and nightlife audiences
- community members
- tourists and recent arrivals
- organizers and venues
- local businesses and potential sponsors

The site should work well for people who arrive with either a specific intent or no plan at all.

Examples:

- "What is happening tonight?"
- "What can I do this weekend?"
- "Are there any free family events?"
- "Show me art events in Tower District."
- "What is coming up soon?"

## 5. Product voice

The voice should be:

- welcoming
- useful
- locally aware
- lively without being breathless
- polished without sounding municipal or corporate
- editorial rather than bureaucratic
- concise where people are scanning

Avoid generic tourism copy, excessive hype, and AI-flavored filler.

## 6. Information architecture

The eventual public site may include:

- Home
- Events
- Full Calendar
- Event detail pages
- Categories
- Neighborhoods or cities
- This Weekend
- Submit an Event
- Newsletter
- About
- Contact
- Sponsor or Advertise

Only the pages authorized in the current development phase should be implemented.

## 7. Homepage concept

The mature homepage should support:

- branded header and navigation
- logo
- short introductory copy
- prominent event search
- Today
- This Weekend
- Upcoming
- featured events
- category browsing
- upcoming event cards
- newsletter signup
- submission link
- sponsor placements
- footer with about, contact, and policy links

The homepage should prioritize immediate discovery over explaining the platform.

## 8. Core browsing modes

### 8.1 Today

Shows events occurring during the current calendar day in `America/Los_Angeles`.

All-day events appear before timed events unless a later design decision specifies otherwise.

### 8.2 This Weekend

Default definition:

- Friday at 4:00 PM through Sunday at 11:59:59 PM
- calculated in `America/Los_Angeles`

Events beginning earlier but continuing into the weekend should be included when their active time overlaps the window.

This definition may be revised later, but it must remain explicit and tested.

### 8.3 Upcoming

Default definition:

- the remainder of the current calendar month, calculated in `America/Los_Angeles`
- if the remainder of the month is less than 7 days, use the next 7 days instead

The window should include events whose active time overlaps the range, including all-day, multi-day, and recurring instances.

This definition may be revised later, but it must remain explicit and tested.

### 8.4 Full Calendar

A calendar-oriented view for users who prefer date navigation.

The product should not require the calendar grid to serve as the default homepage experience.

### 8.5 Search

Search should eventually cover normalized public fields such as:

- title
- description
- venue
- city
- neighborhood
- category
- organizer

Search behavior must be clearly documented before implementation.

## 9. Event cards

Cards should remain visually consistent even when source events vary.

Typical card content:

- category visual or selected event image
- title
- date
- start time or all-day label
- venue
- city or neighborhood
- category
- free or paid indicator when known
- audience indicator when useful
- featured or sponsored disclosure when applicable

Cards must not imply unavailable information.

Cards should be designed for fast scanning and touch interaction.

## 10. Event detail experience

The eventual event detail view should support:

- title
- date and time
- all-day or multi-day treatment
- venue and address
- map link
- description
- event image or flyer when available
- category and tags
- price information
- organizer
- source or official event link
- Add to Google Calendar
- downloadable `.ics`
- sharing
- accessibility information when provided
- clear sponsored or promoted disclosure

Event details must preserve useful formatting while sanitizing unsafe HTML.

## 11. Categories

Initial category taxonomy should be editorially manageable rather than exhaustive.

Proposed primary categories:

- Art
- Music
- Food & Drink
- Markets
- Festivals
- Family
- Community
- Classes & Workshops
- Nightlife
- Outdoors
- Sports
- Wellness
- Spiritual
- Theater & Film
- Other

An event may have one primary category and multiple secondary tags.

The final taxonomy should be reviewed against real calendar data before live filtering is implemented.

## 12. Location model

Location filtering may eventually include:

- city
- neighborhood or district
- venue
- online
- location unknown

Potential Fresno-area neighborhood labels include:

- Tower District
- Downtown Fresno
- River Park
- Fig Garden
- Woodward Park
- Sunnyside
- Clovis
- other editorially useful districts

Neighborhood should not be guessed from incomplete data unless a documented mapping system is implemented.

## 13. Price model

Possible public values:

- Free
- Paid
- Donation
- Registration required
- Price unknown

Do not treat "registration required" as equivalent to paid.

## 14. Audience model

Possible values:

- All ages
- Family-friendly
- Adults
- 18+
- 21+
- Youth
- Audience unknown

Do not infer age restrictions unless the source provides them.

## 15. Images and visual consistency

The site should not depend on every event having a usable image.

Default strategy:

- consistent category-based visual system on browsing pages
- optional flyer or event image on event detail pages
- selective use of attractive event imagery for featured placements
- safe cropping and aspect-ratio handling
- intentional fallback art

This prevents the page from becoming visually chaotic while still preserving original flyers where useful.

## 16. Featured and promoted events

Featured events may be editorially selected.

Promoted or sponsored events may eventually be paid placements.

Paid placement must always be clearly labeled and must not be presented as neutral editorial selection.

The data model must distinguish:

- featured
- promoted
- sponsored
- ordinary

Monetization functionality is not authorized until a future phase explicitly includes it.

## 17. Event source and editorial workflow

Initial source:

- a dedicated Google Calendar containing publishable Fresno-area events

Google Calendar remains the initial editorial management interface.

The public website reads and normalizes calendar data. It does not expose private calendars or private event information.

The initial implementation should use real data from the approved dedicated Google Calendar through server-side access, unless a later task explicitly authorizes static or fictional public fixtures. Data behavior should inform design decisions rather than being retrofitted after visual polish.

Future workflow may include:

- Flyer2Calendar
- event submissions
- moderation
- organizer accounts
- direct publishing tools

These are future possibilities, not current authorization.

## 18. Metadata strategy

Google Calendar lacks a complete public event taxonomy.

The initial system may parse a structured metadata block from event descriptions.

Example:

```text
Public event description.

---
category: music
tags: live music, local
city: Fresno
neighborhood: Tower District
audience: 21+
price: paid
featured: false
image: https://example.com/image.jpg
source: https://example.com/event
```

The metadata block should be removed from the public description after parsing.

The final syntax, validation rules, and fallback behavior are defined in `event-data-model.md`.

## 19. Accessibility

The site should target WCAG 2.2 AA practices.

Requirements include:

- keyboard navigation
- visible focus states
- semantic headings
- meaningful link text
- sufficient contrast
- labels for controls
- non-color indicators
- screen-reader-friendly dates
- reduced-motion support where relevant
- touch targets appropriate for mobile
- no essential information embedded only inside images

## 20. Mobile behavior

Mobile is the primary layout.

The site must remain usable on narrow screens without horizontal scrolling.

Filters should be easy to open, understand, apply, and clear.

Date, time, venue, and event title should remain legible without requiring expansion.

Calendar-grid behavior on mobile must be reviewed carefully rather than assumed.

## 21. SEO and sharing

Future production requirements include:

- indexable event detail pages
- semantic metadata
- Open Graph metadata
- canonical URLs
- event structured data where accurate
- descriptive page titles
- shareable filtered URLs
- sitemap
- robots configuration
- graceful handling of expired events

SEO implementation belongs to the phase where routing and event details become real.

## 22. Performance

Target experience:

- fast initial render
- responsive interaction on mid-range mobile devices
- optimized images
- cached event responses
- minimal JavaScript and dependencies
- graceful loading and error states

Performance should be measured rather than assumed.

## 23. Trust and editorial integrity

The site must:

- clearly label sponsored content
- avoid inventing missing facts
- provide source links when available
- display cancellation or status information when known
- avoid exposing private event data
- explain submission and correction processes once those exist

## 24. Future monetization possibilities

Potential future revenue:

- promoted event placements
- newsletter sponsorships
- sponsored weekend guides
- venue profiles
- local business advertising
- affiliate ticket links
- paid organizer tools
- premium submission options

These are strategic context only. No monetization system should be built without explicit authorization.

## 25. Product success indicators

Early indicators:

- events published reliably
- event data is correct
- visitors can find relevant events quickly
- mobile usability is strong
- repeat visits increase
- newsletter signups begin
- organizers request inclusion
- local users share event pages

Later indicators:

- meaningful local search traffic
- direct traffic and repeat usage
- organizer adoption
- sponsorship interest
- monetization without harming trust

## 26. Explicit non-goals for the initial product

The initial product is not:

- a ticketing platform
- a social network
- a general-purpose calendar app
- an organizer CRM
- a private scheduling tool
- a replacement for Google Calendar editorial management
- a user-account platform
- a payment processor
- a fully automated scraping system
