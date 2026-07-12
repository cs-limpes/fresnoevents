import { useEffect, useMemo, useState } from 'react'
import type { DateTime } from 'luxon'
import type { AgendaSection } from './lib/agenda-sections'
import {
  buildFilterOptions,
  DATE_VIEW_OPTIONS,
  DEFAULT_FILTERS,
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
import type { EventsResponse, PublicEvent } from './types/events'
import './styles.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; data: EventsResponse }
  | { status: 'empty'; data: EventsResponse }
  | { status: 'error'; message: string }

export function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
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
  }, [])

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="masthead">
          <p className="wordmark">Fresno Events</p>
          <p className="eyebrow">Today, This Weekend, and Upcoming</p>
        </div>
        <h1>Find what is happening around Fresno.</h1>
        <p className="intro">A live local agenda for Fresno, Clovis, and nearby Central Valley communities.</p>
      </header>

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

      {state.status === 'loaded' && <AgendaSections data={state.data} />}

      <footer className="site-footer">
        <p>Fresno Events is in early development. Event facts come from the approved editorial calendar.</p>
      </footer>
    </main>
  )
}

function AgendaSections({ data }: { data: EventsResponse }) {
  const [filters, setFilters] = useState<FilterState>(() => readFiltersFromUrl())
  const filterOptions = useMemo(() => buildFilterOptions(data.events), [data.events])
  const filteredEvents = useMemo(() => filterEvents(data.events, filters), [data.events, filters])
  const sections = useMemo(() => getFilteredAgendaSections(filteredEvents, filters.view), [filteredEvents, filters.view])
  const unfilteredSections = useMemo(() => getFilteredAgendaSections(data.events, 'all'), [data.events])
  const totalEvents = sections.reduce((count, section) => count + section.events.length, 0)
  const unfilteredTotal = unfilteredSections.reduce((count, section) => count + section.events.length, 0)
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
    updateFilters(DEFAULT_FILTERS, 'push')
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

      {totalEvents > 0 ? (
        sections.map((section) => <AgendaSectionView key={section.id} section={section} />)
      ) : (
        <FilterEmptyState filters={filters} onClear={clearFilters} />
      )}
    </section>
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
  onRemove: (key: keyof FilterState) => void
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
            <h4>{event.title}</h4>
            <p className="event-time">{dateTime}</p>
            {location && <p className="event-location">{location}</p>}
            {event.excerpt && <p className="event-description">{event.excerpt}</p>}
            {eventLinks.length > 0 && (
              <div className="event-links" aria-label={`${event.title} links`}>
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
  const parts = [
    event.venue?.name,
    event.venue?.neighborhood,
    event.venue?.city,
    event.venue?.online ? 'Online' : undefined,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' - ') : event.venue?.address
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

function getActiveFilterChips(filters: FilterState): Array<{ key: keyof FilterState; label: string }> {
  return [
    filters.query ? { key: 'query' as const, label: `Search: ${filters.query}` } : undefined,
    filters.view !== 'all'
      ? { key: 'view' as const, label: `Date: ${DATE_VIEW_OPTIONS.find((option) => option.value === filters.view)?.label}` }
      : undefined,
    filters.category ? { key: 'category' as const, label: `Category: ${formatFilterLabel(filters.category)}` } : undefined,
    filters.city ? { key: 'city' as const, label: `City: ${filters.city}` } : undefined,
    filters.neighborhood ? { key: 'neighborhood' as const, label: `Neighborhood: ${filters.neighborhood}` } : undefined,
    filters.audience ? { key: 'audience' as const, label: `Audience: ${formatFilterLabel(filters.audience)}` } : undefined,
    filters.price ? { key: 'price' as const, label: `Price: ${formatFilterLabel(filters.price)}` } : undefined,
  ].filter((chip): chip is { key: keyof FilterState; label: string } => Boolean(chip))
}
