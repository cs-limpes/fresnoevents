import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { DateTime } from 'luxon'
import { EventCalendarView } from './components/event-calendar-view'
import type { AgendaSection } from './lib/agenda-sections'
import { uniqueEventsById } from './lib/calendar-events'
import {
  buildGoogleCalendarUrl,
  buildIcsDataUrl,
  buildMapUrl,
  buildStructuredEventData,
  findEventByDetailPath,
  formatEventLocation,
  getEventCanonicalUrl,
  getEventDetailPath,
  getEventSummary,
  slugifyTitle,
} from './lib/event-detail'
import {
  buildFilterOptions,
  DATE_VIEW_OPTIONS,
  DEFAULT_FILTERS,
  filterCalendarEvents,
  filterEvents,
  formatFilterLabel,
  getActiveFilterCount,
  getFilteredAgendaSections,
  hasActiveFilters,
  parseFilters,
  serializeFilters,
  type FilterOptions,
  type FilterState,
} from './lib/event-filters'
import { fetchEvents } from './lib/events-api'
import type { ContactDraftRequest, ContactDraftResponse, ContactErrorResponse, ContactIntent } from './types/contact'
import type { EventsResponse, PublicEvent } from './types/events'
import './styles.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; data: EventsResponse }
  | { status: 'empty'; data: EventsResponse }
  | { status: 'error'; message: string }

type AppRoute =
  | { kind: 'browse'; pathname: string }
  | { kind: 'event-detail'; pathname: string }
  | { kind: 'contact'; pathname: string }
type ActiveFilterKey = Exclude<keyof FilterState, 'display'>

const DISPLAY_MODE_OPTIONS: Array<{ value: FilterState['display']; label: string }> = [
  { value: 'agenda', label: 'Agenda' },
  { value: 'calendar', label: 'Calendar' },
]

export function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const route = useAppRoute()
  const detailEvent =
    state.status === 'loaded' && route.kind === 'event-detail'
      ? findEventByDetailPath(state.data.events, route.pathname)
      : undefined

  usePageMetadata(route, detailEvent)

  useEffect(() => {
    if (route.kind === 'contact') {
      return
    }

    let cancelled = false

    fetchEvents()
      .then((data) => {
        if (cancelled) return
        setState(data.events.length > 0 ? { status: 'loaded', data } : { status: 'empty', data })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Events are temporarily unavailable.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [route.kind])

  const pageHeading = getPageHeading(route, detailEvent)
  const pageIntro = getPageIntro(route, detailEvent)

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="masthead">
          <a className="wordmark" href="/">
            Fresno Events
          </a>
          <p className="eyebrow">Today, This Weekend, and Upcoming</p>
        </div>
        <h1>{pageHeading}</h1>
        <p className="intro">{pageIntro}</p>
      </header>

      {route.kind === 'contact' ? (
        <ContactPage />
      ) : (
        <>
          {state.status === 'loading' && <StatusMessage title="Loading events" body="Checking the calendar now." />}

          {state.status === 'error' && (
            <StatusMessage title="Events are unavailable" body={state.message} tone="error" />
          )}

          {state.status === 'empty' && (
            <StatusMessage
              title="No events found"
              body={`No events were returned for ${formatRange(state.data.range.start, state.data.range.end)}.`}
            />
          )}

          {state.status === 'loaded' &&
            (route.kind === 'event-detail' ? (
              <EventDetailPage data={state.data} pathname={route.pathname} />
            ) : (
              <AgendaSections data={state.data} />
            ))}
        </>
      )}

      <footer className="site-footer">
        <nav aria-label="Fresno Events links">
          <a href="/contact">Send a correction or event lead</a>
        </nav>
        <p>Fresno Events is in early development. Event facts come from the approved editorial calendar.</p>
      </footer>
    </main>
  )
}

function getPageHeading(route: AppRoute, detailEvent?: PublicEvent): string {
  if (detailEvent) {
    return detailEvent.title
  }

  if (route.kind === 'contact') {
    return 'Send a correction or event lead.'
  }

  return 'Find what is happening around Fresno.'
}

function getPageIntro(route: AppRoute, detailEvent?: PublicEvent): string {
  if (detailEvent) {
    return formatEventDateTime(detailEvent)
  }

  if (route.kind === 'contact') {
    return 'Help keep Fresno Events accurate with a correction, missing detail, or new event for editorial review.'
  }

  return 'A live local agenda for Fresno, Clovis, and nearby Central Valley communities.'
}

function EventDetailPage({ data, pathname }: { data: EventsResponse; pathname: string }) {
  const event = findEventByDetailPath(data.events, pathname)

  if (!event) {
    return <EventNotFound />
  }

  return <EventDetail event={event} />
}

function EventDetail({ event }: { event: PublicEvent }) {
  const [shareStatus, setShareStatus] = useState('')
  const eventUrl = getEventCanonicalUrl(event, window.location.origin)
  const mapUrl = buildMapUrl(event)
  const eventLinks = getEventLinks(event)
  const calendarUrl = buildGoogleCalendarUrl(event, eventUrl)
  const icsUrl = buildIcsDataUrl(event, eventUrl)
  const location = formatEventLocation(event)
  const structuredData = buildStructuredEventData(event, eventUrl)

  async function copyEventLink() {
    if (!navigator.clipboard?.writeText) {
      setShareStatus('Copy the page URL from the address bar.')
      return
    }

    await navigator.clipboard.writeText(eventUrl)
    setShareStatus('Link copied.')
  }

  async function shareEvent() {
    const share = (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share

    if (!share) {
      await copyEventLink()
      return
    }

    await share({
      title: event.title,
      text: getEventSummary(event),
      url: eventUrl,
    })
    setShareStatus('Share sheet opened.')
  }

  return (
    <article className="event-detail" aria-labelledby="event-detail-heading">
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>

      <a className="back-link" href={`/${window.location.search}`}>
        Back to events
      </a>

      <div className="event-detail-hero">
        <div className="event-visual event-detail-visual" aria-hidden="true">
          <span>{getDateBadge(event).month}</span>
          <strong>{getDateBadge(event).day}</strong>
        </div>
        <div>
          <div className="event-meta">
            <span>{formatCategory(event.taxonomy.primaryCategory)}</span>
            <span>{formatPrice(event.taxonomy.priceType)}</span>
            {event.taxonomy.audience.map((audience) => (
              <span key={audience}>{formatFilterLabel(audience)}</span>
            ))}
            {event.allDay && <span>All day</span>}
            {event.multiDay && <span>Multi-day</span>}
          </div>
          <h2 id="event-detail-heading">{event.title}</h2>
          <p className="event-time">{formatEventDateTime(event)}</p>
          {location && <p className="event-location">{location}</p>}
        </div>
      </div>

      <div className="event-detail-grid">
        <section className="event-detail-section" aria-labelledby="event-about-heading">
          <h3 id="event-about-heading">About</h3>
          {event.description ? (
            <p className="event-detail-description">{event.description}</p>
          ) : event.excerpt ? (
            <p className="event-detail-description">{event.excerpt}</p>
          ) : (
            <p className="event-detail-muted">No public description is listed yet.</p>
          )}
        </section>

        <aside className="event-detail-actions" aria-label="Event actions">
          <a className="primary-action" href={calendarUrl} target="_blank" rel="noreferrer">
            Add to Google Calendar
          </a>
          <a className="secondary-button detail-action-link" href={icsUrl} download={`${slugifyTitle(event.title)}.ics`}>
            Download .ics
          </a>
          {mapUrl && (
            <a className="secondary-button detail-action-link" href={mapUrl} target="_blank" rel="noreferrer">
              Open map
            </a>
          )}
          {eventLinks.map((link) => (
            <a key={link.href} className="secondary-button detail-action-link" href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
          <button className="secondary-button" type="button" onClick={copyEventLink}>
            Copy link
          </button>
          <button className="secondary-button" type="button" onClick={shareEvent}>
            Share
          </button>
          {shareStatus && <p className="share-status" aria-live="polite">{shareStatus}</p>}
        </aside>
      </div>

      {(event.organizer?.name || event.accessibility?.text || event.editorial.sponsored || event.editorial.promoted) && (
        <section className="event-detail-section" aria-labelledby="event-notes-heading">
          <h3 id="event-notes-heading">Details</h3>
          <dl className="detail-list">
            {event.organizer?.name && (
              <>
                <dt>Organizer</dt>
                <dd>
                  {event.organizer.url ? (
                    <a href={event.organizer.url} target="_blank" rel="noreferrer">
                      {event.organizer.name}
                    </a>
                  ) : (
                    event.organizer.name
                  )}
                </dd>
              </>
            )}
            {event.accessibility?.text && (
              <>
                <dt>Accessibility</dt>
                <dd>{event.accessibility.text}</dd>
              </>
            )}
            {(event.editorial.sponsored || event.editorial.promoted) && (
              <>
                <dt>Disclosure</dt>
                <dd>
                  {event.editorial.sponsored
                    ? `Sponsored${event.editorial.sponsorName ? ` by ${event.editorial.sponsorName}` : ''}`
                    : 'Promoted'}
                </dd>
              </>
            )}
          </dl>
        </section>
      )}
    </article>
  )
}

function EventNotFound() {
  return (
    <section className="filter-empty-state" aria-labelledby="event-not-found-heading">
      <h2 id="event-not-found-heading">Event not found</h2>
      <p>This event is not available in the current Fresno Events feed. It may have expired or been removed.</p>
      <a className="secondary-button detail-action-link" href="/">
        Browse current events
      </a>
    </section>
  )
}

type ContactFormState = Required<ContactDraftRequest>

type ContactStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; mailtoUrl: string }
  | { kind: 'error'; message: string }

const DEFAULT_CONTACT_FORM: ContactFormState = {
  intent: 'correction',
  eventTitle: '',
  eventUrl: '',
  eventDate: '',
  venue: '',
  details: '',
  senderName: '',
  senderEmail: '',
}

const CONTACT_INTENT_OPTIONS: Array<{ value: ContactIntent; label: string; description: string }> = [
  {
    value: 'correction',
    label: 'Correct an event',
    description: 'Fix a date, time, location, link, price, or description.',
  },
  {
    value: 'submission',
    label: 'Send an event lead',
    description: 'Share a new public event for editorial review.',
  },
]

function ContactPage() {
  const [form, setForm] = useState<ContactFormState>(DEFAULT_CONTACT_FORM)
  const [status, setStatus] = useState<ContactStatus>({ kind: 'idle' })

  function updateField<K extends keyof ContactFormState>(field: K, value: ContactFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function openEmailDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus({ kind: 'loading' })

    try {
      const response = await fetch('/api/contact-draft', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        throw new Error(await readContactError(response))
      }

      const payload = (await response.json()) as ContactDraftResponse

      if (!payload.mailtoUrl.startsWith('mailto:')) {
        throw new Error('The email draft could not be prepared.')
      }

      setStatus({ kind: 'ready', mailtoUrl: payload.mailtoUrl })
      window.location.href = payload.mailtoUrl
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'The email draft could not be prepared.',
      })
    }
  }

  return (
    <section className="contact-page" aria-labelledby="contact-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Editorial inbox</p>
          <h2 id="contact-heading">Corrections and event leads</h2>
        </div>
        <p>New events are reviewed before appearing on the public calendar.</p>
      </div>

      <form className="contact-form" onSubmit={openEmailDraft}>
        <fieldset className="contact-intent-group">
          <legend>What are you sending?</legend>
          <div className="contact-intent-options">
            {CONTACT_INTENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`contact-intent-option${form.intent === option.value ? ' contact-intent-option-active' : ''}`}
              >
                <input
                  type="radio"
                  name="intent"
                  value={option.value}
                  checked={form.intent === option.value}
                  onChange={() => updateField('intent', option.value)}
                />
                <span>{option.label}</span>
                <small>{option.description}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="contact-grid">
          <label className="contact-field" htmlFor="contact-event-title">
            <span>Event title</span>
            <input
              id="contact-event-title"
              value={form.eventTitle}
              onChange={(event) => updateField('eventTitle', event.target.value)}
              maxLength={160}
            />
          </label>

          <label className="contact-field" htmlFor="contact-event-url">
            <span>Event page or source URL</span>
            <input
              id="contact-event-url"
              type="url"
              value={form.eventUrl}
              onChange={(event) => updateField('eventUrl', event.target.value)}
              maxLength={500}
              placeholder="https://"
            />
          </label>

          <label className="contact-field" htmlFor="contact-event-date">
            <span>Date and time</span>
            <input
              id="contact-event-date"
              value={form.eventDate}
              onChange={(event) => updateField('eventDate', event.target.value)}
              maxLength={120}
            />
          </label>

          <label className="contact-field" htmlFor="contact-venue">
            <span>Venue or location</span>
            <input
              id="contact-venue"
              value={form.venue}
              onChange={(event) => updateField('venue', event.target.value)}
              maxLength={240}
            />
          </label>
        </div>

        <label className="contact-field" htmlFor="contact-details">
          <span>Details</span>
          <textarea
            id="contact-details"
            value={form.details}
            onChange={(event) => updateField('details', event.target.value)}
            maxLength={2000}
            rows={7}
            required
          />
        </label>

        <div className="contact-grid">
          <label className="contact-field" htmlFor="contact-name">
            <span>Your name</span>
            <input
              id="contact-name"
              value={form.senderName}
              onChange={(event) => updateField('senderName', event.target.value)}
              maxLength={120}
            />
          </label>

          <label className="contact-field" htmlFor="contact-email">
            <span>Reply email</span>
            <input
              id="contact-email"
              type="email"
              value={form.senderEmail}
              onChange={(event) => updateField('senderEmail', event.target.value)}
              maxLength={160}
            />
          </label>
        </div>

        <div className="contact-actions">
          <button className="primary-action" type="submit" disabled={status.kind === 'loading'}>
            {status.kind === 'loading' ? 'Preparing draft' : 'Open email draft'}
          </button>
          {status.kind === 'ready' && (
            <a className="secondary-button detail-action-link" href={status.mailtoUrl}>
              Open draft again
            </a>
          )}
        </div>

        <p className="contact-status" aria-live="polite">
          {status.kind === 'ready'
            ? 'Email draft prepared. Review it in your email app before sending.'
            : status.kind === 'error'
              ? status.message
              : 'The public page does not display the editorial email address.'}
        </p>
      </form>
    </section>
  )
}

async function readContactError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ContactErrorResponse
    return payload.error?.message || 'The email draft could not be prepared.'
  } catch {
    return 'The email draft could not be prepared.'
  }
}

function AgendaSections({ data }: { data: EventsResponse }) {
  const [filters, setFilters] = useState<FilterState>(() => readFiltersFromUrl())
  const filterOptions = useMemo(() => buildFilterOptions(data.events), [data.events])
  const filteredEvents = useMemo(() => filterEvents(data.events, filters), [data.events, filters])
  const filteredCalendarEvents = useMemo(() => filterCalendarEvents(data.events, filters), [data.events, filters])
  const sections = useMemo(() => getFilteredAgendaSections(filteredEvents, filters.view), [filteredEvents, filters.view])
  const unfilteredSections = useMemo(() => getFilteredAgendaSections(data.events, 'all'), [data.events])
  const visibleEvents = useMemo(() => uniqueEventsById(sections.flatMap((section) => section.events)), [sections])
  const calendarEvents = useMemo(() => uniqueEventsById(filteredCalendarEvents), [filteredCalendarEvents])
  const unfilteredVisibleEvents = useMemo(
    () => uniqueEventsById(unfilteredSections.flatMap((section) => section.events)),
    [unfilteredSections],
  )
  const totalEvents = filters.display === 'calendar' ? calendarEvents.length : visibleEvents.length
  const unfilteredTotal = filters.display === 'calendar' ? data.events.length : unfilteredVisibleEvents.length
  const activeFilterCount = getActiveFilterCount(filters)

  useEffect(() => {
    const handlePopState = () => {
      setFilters(readFiltersFromUrl())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function updateFilters(nextFilters: FilterState, mode: 'push' | 'replace' = 'push') {
    setFilters(nextFilters)
    writeFiltersToUrl(nextFilters, mode)
  }

  function patchFilters(patch: Partial<FilterState>, mode: 'push' | 'replace' = 'push') {
    updateFilters({ ...filters, ...patch }, mode)
  }

  function removeFilter(key: keyof FilterState) {
    patchFilters({ [key]: DEFAULT_FILTERS[key] }, 'push')
  }

  function clearFilters() {
    updateFilters({ ...DEFAULT_FILTERS, display: filters.display }, 'push')
  }

  return (
    <section className="agenda" aria-labelledby="agenda-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Live agenda</p>
          <h2 id="agenda-heading">Browse Events</h2>
        </div>
        <p>
          {totalEvents} of {unfilteredTotal} {unfilteredTotal === 1 ? 'event' : 'events'} from{' '}
          {formatRange(data.range.start, data.range.end)}
        </p>
      </div>

      <FilterPanel
        activeFilterCount={activeFilterCount}
        filters={filters}
        onChange={patchFilters}
        onClear={clearFilters}
        onRemove={removeFilter}
        options={filterOptions}
        resultCount={totalEvents}
        totalCount={unfilteredTotal}
      />

      <DisplayModeToggle display={filters.display} onChange={(display) => patchFilters({ display }, 'push')} />

      {totalEvents > 0 ? (
        filters.display === 'calendar' ? (
          <EventCalendarView events={calendarEvents} currentSearch={window.location.search} />
        ) : (
          sections.map((section) => <AgendaSectionView key={section.id} section={section} />)
        )
      ) : (
        <FilterEmptyState filters={filters} onClear={clearFilters} />
      )}
    </section>
  )
}

function DisplayModeToggle({
  display,
  onChange,
}: {
  display: FilterState['display']
  onChange: (display: FilterState['display']) => void
}) {
  return (
    <fieldset className="display-mode-toggle">
      <legend>Browse view</legend>
      <div className="segmented-control">
        {DISPLAY_MODE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`segmented-option${display === option.value ? ' segmented-option-active' : ''}`}
          >
            <input
              type="radio"
              name="display"
              value={option.value}
              checked={display === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function FilterPanel({
  activeFilterCount,
  filters,
  onChange,
  onClear,
  onRemove,
  options,
  resultCount,
  totalCount,
}: {
  activeFilterCount: number
  filters: FilterState
  onChange: (patch: Partial<FilterState>, mode?: 'push' | 'replace') => void
  onClear: () => void
  onRemove: (key: keyof FilterState) => void
  options: FilterOptions
  resultCount: number
  totalCount: number
}) {
  return (
    <details className="filters-panel" open>
      <summary>
        <span>Search and filter</span>
        <span>{activeFilterCount > 0 ? `${activeFilterCount} active` : 'All events'}</span>
      </summary>

      <form className="filters-form" onSubmit={(event) => event.preventDefault()}>
        {filters.display === 'agenda' && (
          <>
            <div className="search-field">
              <label htmlFor="event-search">Search events</label>
              <input
                id="event-search"
                name="q"
                type="search"
                value={filters.query}
                onChange={(event) => onChange({ query: event.target.value }, 'replace')}
                placeholder="Title, venue, city, category"
              />
            </div>

            <fieldset className="date-filter">
              <legend>Date window</legend>
              <div className="segmented-control">
                {DATE_VIEW_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`segmented-option${filters.view === option.value ? ' segmented-option-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="view"
                      value={option.value}
                      checked={filters.view === option.value}
                      onChange={() => onChange({ view: option.value }, 'push')}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <div className="facet-grid">
          <FilterSelect
            id="category-filter"
            label="Category"
            value={filters.category}
            options={options.categories}
            onChange={(category) => onChange({ category: category as FilterState['category'] }, 'push')}
          />
          <FilterSelect
            id="city-filter"
            label="City"
            value={filters.city}
            options={options.cities}
            onChange={(city) => onChange({ city }, 'push')}
          />
          <FilterSelect
            id="neighborhood-filter"
            label="Neighborhood"
            value={filters.neighborhood}
            options={options.neighborhoods}
            onChange={(neighborhood) => onChange({ neighborhood }, 'push')}
          />
          <FilterSelect
            id="audience-filter"
            label="Audience"
            value={filters.audience}
            options={options.audiences}
            onChange={(audience) => onChange({ audience: audience as FilterState['audience'] }, 'push')}
          />
          <FilterSelect
            id="price-filter"
            label="Price"
            value={filters.price}
            options={options.prices}
            onChange={(price) => onChange({ price: price as FilterState['price'] }, 'push')}
          />
        </div>

        <div className="filter-actions">
          <p aria-live="polite">
            Showing {resultCount} of {totalCount} {totalCount === 1 ? 'event' : 'events'}
          </p>
          {hasActiveFilters(filters) && (
            <button className="secondary-button" type="button" onClick={onClear}>
              Clear all
            </button>
          )}
        </div>

        <ActiveFilterChips filters={filters} onRemove={onRemove} />
      </form>
    </details>
  )
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="filter-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Any {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatFilterLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function ActiveFilterChips({
  filters,
  onRemove,
}: {
  filters: FilterState
  onRemove: (key: ActiveFilterKey) => void
}) {
  const chips = getActiveFilterChips(filters)

  if (chips.length === 0) {
    return null
  }

  return (
    <div className="active-filter-list" aria-label="Active filters">
      {chips.map((chip) => (
        <button key={chip.key} className="active-filter-chip" type="button" onClick={() => onRemove(chip.key)}>
          <span>{chip.label}</span>
          <span aria-hidden="true">x</span>
          <span className="sr-only">Remove {chip.label}</span>
        </button>
      ))}
    </div>
  )
}

function FilterEmptyState({ filters, onClear }: { filters: FilterState; onClear: () => void }) {
  return (
    <section className="filter-empty-state" aria-live="polite">
      <h3>{hasActiveFilters(filters) ? 'No events match these filters' : 'No events found'}</h3>
      <p>
        {hasActiveFilters(filters)
          ? 'No events in the current feed match the selected search and filters.'
          : 'No events were returned for this date range.'}
      </p>
      {hasActiveFilters(filters) && (
        <button className="secondary-button" type="button" onClick={onClear}>
          Clear all
        </button>
      )}
    </section>
  )
}

function AgendaSectionView({ section }: { section: AgendaSection }) {
  return (
    <section className="event-section" aria-labelledby={`${section.id}-heading`}>
      <div className="agenda-section-heading">
        <div>
          <h3 id={`${section.id}-heading`}>{section.title}</h3>
          <p>{formatDateTimeRange(section.range.start, section.range.end)}</p>
        </div>
        <p className="section-count">
          {section.events.length} {section.events.length === 1 ? 'event' : 'events'}
        </p>
      </div>

      {section.events.length > 0 ? (
        <ul className="event-list">
          {section.events.map((event) => (
            <EventListItem key={event.id} event={event} />
          ))}
        </ul>
      ) : (
        <p className="empty-section">No events in this window.</p>
      )}
    </section>
  )
}

function EventListItem({ event }: { event: PublicEvent }) {
  const location = formatLocation(event)
  const dateTime = formatEventDateTime(event)
  const eventLinks = getEventLinks(event)
  const dateBadge = getDateBadge(event)
  const detailPath = `${getEventDetailPath(event)}${window.location.search}`

  return (
    <li className="event-item">
      <article>
        <div className="event-card-layout">
          <div className="event-visual" aria-hidden="true">
            <span>{dateBadge.month}</span>
            <strong>{dateBadge.day}</strong>
          </div>
          <div className="event-content">
            <div className="event-meta">
              <span>{formatCategory(event.taxonomy.primaryCategory)}</span>
              <span>{formatPrice(event.taxonomy.priceType)}</span>
              {event.allDay && <span>All day</span>}
              {event.multiDay && <span>Multi-day</span>}
            </div>
            <h4>
              <a className="event-title-link" href={detailPath}>
                {event.title}
              </a>
            </h4>
            <p className="event-time">{dateTime}</p>
            {location && <p className="event-location">{location}</p>}
            {event.excerpt && <p className="event-description">{event.excerpt}</p>}
            {(eventLinks.length > 0 || detailPath) && (
              <div className="event-links" aria-label={`${event.title} links`}>
                <a className="event-link" href={detailPath}>
                  Details
                </a>
                {eventLinks.map((link) => (
                  <a key={link.href} className="event-link" href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>
    </li>
  )
}

function StatusMessage({ title, body, tone = 'neutral' }: { title: string; body: string; tone?: 'neutral' | 'error' }) {
  return (
    <section className={`status-message status-message-${tone}`} aria-live="polite">
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  )
}

function formatRange(start: string, end: string): string {
  return `${formatDate(start)} through ${formatDate(end)}`
}

function formatDateTimeRange(start: DateTime<boolean>, end: DateTime<boolean>): string {
  return `${formatDateTime(start)} through ${formatDateTime(end)}`
}

function formatDateTime(value: DateTime<boolean>): string {
  return value.toLocaleString({
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatEventDateTime(event: PublicEvent): string {
  if (event.allDay) {
    return event.multiDay
      ? `${formatDate(event.start)} through ${formatDate(subtractOneDay(event.end))}`
      : formatDate(event.start)
  }

  return `${formatDate(event.start)} at ${formatTime(event.start)}`
}

function formatDate(value: string): string {
  const date = isDateOnly(value) ? dateOnlyToSafeDate(value) : new Date(value)

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function getDateBadge(event: PublicEvent): { month: string; day: string } {
  const date = isDateOnly(event.start) ? dateOnlyToSafeDate(event.start) : new Date(event.start)

  return {
    month: new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short',
    }).format(date),
    day: new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      day: 'numeric',
    }).format(date),
  }
}

function formatCategory(value: string): string {
  return formatFilterLabel(value)
}

function formatPrice(value: string): string {
  return formatCategory(value)
}

function formatLocation(event: PublicEvent): string | undefined {
  const parts = [event.venue?.name, event.venue?.neighborhood, event.venue?.city, event.venue?.online ? 'Online' : undefined].filter(Boolean)

  return parts.length > 0 ? parts.join(' - ') : undefined
}

function getEventLinks(event: PublicEvent): Array<{ label: string; href: string }> {
  return [
    event.links.sourceUrl ? { label: 'Official event', href: event.links.sourceUrl } : undefined,
    event.links.registrationUrl ? { label: 'Registration', href: event.links.registrationUrl } : undefined,
    event.links.websiteUrl ? { label: 'Website', href: event.links.websiteUrl } : undefined,
  ].filter((link): link is { label: string; href: string } => Boolean(link))
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function dateOnlyToSafeDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

function subtractOneDay(value: string): string {
  if (!isDateOnly(value)) {
    return value
  }

  const date = dateOnlyToSafeDate(value)
  date.setUTCDate(date.getUTCDate() - 1)

  return date.toISOString().slice(0, 10)
}

function readFiltersFromUrl(): FilterState {
  return parseFilters(new URLSearchParams(window.location.search))
}

function writeFiltersToUrl(filters: FilterState, mode: 'push' | 'replace'): void {
  const params = serializeFilters(filters)
  const url = new URL(window.location.href)
  const search = params.toString()
  url.search = search ? `?${search}` : ''

  window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url)
}

function getActiveFilterChips(filters: FilterState): Array<{ key: ActiveFilterKey; label: string }> {
  const chips: Array<{ key: ActiveFilterKey; label: string } | undefined> = [
    filters.display === 'agenda' && filters.query
      ? { key: 'query' as const, label: `Search: ${filters.query}` }
      : undefined,
    filters.display === 'agenda' && filters.view !== 'all'
      ? { key: 'view' as const, label: `Date: ${DATE_VIEW_OPTIONS.find((option) => option.value === filters.view)?.label}` }
      : undefined,
    filters.category ? { key: 'category' as const, label: `Category: ${formatFilterLabel(filters.category)}` } : undefined,
    filters.city ? { key: 'city' as const, label: `City: ${filters.city}` } : undefined,
    filters.neighborhood ? { key: 'neighborhood' as const, label: `Neighborhood: ${filters.neighborhood}` } : undefined,
    filters.audience ? { key: 'audience' as const, label: `Audience: ${formatFilterLabel(filters.audience)}` } : undefined,
    filters.price ? { key: 'price' as const, label: `Price: ${formatFilterLabel(filters.price)}` } : undefined,
  ]

  return chips.filter((chip): chip is { key: ActiveFilterKey; label: string } => Boolean(chip))
}

function useAppRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() => readAppRoute())

  useEffect(() => {
    const handlePopState = () => {
      setRoute(readAppRoute())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return route
}

function readAppRoute(): AppRoute {
  const pathname = window.location.pathname

  if (pathname === '/contact' || pathname === '/submit') {
    return { kind: 'contact', pathname }
  }

  return pathname.startsWith('/events/') ? { kind: 'event-detail', pathname } : { kind: 'browse', pathname }
}

function usePageMetadata(route: AppRoute, event?: PublicEvent): void {
  useEffect(() => {
    const title = event
      ? `${event.title} | Fresno Events`
      : route.kind === 'event-detail'
        ? 'Event not found | Fresno Events'
        : route.kind === 'contact'
          ? 'Send Event Updates | Fresno Events'
          : 'Fresno Events'
    const description = event
      ? getEventSummary(event)
      : route.kind === 'contact'
        ? 'Send Fresno Events a correction or a new event lead for editorial review.'
        : 'A live local agenda for Fresno, Clovis, and nearby Central Valley communities.'
    const url = event ? getEventCanonicalUrl(event, window.location.origin) : `${window.location.origin}${route.pathname}`

    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', event ? 'article' : 'website')
    upsertMeta('property', 'og:url', url)
    upsertMeta('name', 'twitter:card', 'summary')
    upsertCanonical(url)
  }, [event, route.kind, route.pathname])
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }

  element.content = content
}

function upsertCanonical(href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (!element) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.appendChild(element)
  }

  element.href = href
}
