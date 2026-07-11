import { useEffect, useState } from 'react'
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
        <p className="eyebrow">Functional data foundation</p>
        <h1>Fresno Events</h1>
        <p className="intro">
          A plain local event list backed by the approved Google Calendar. This first pass is focused on data
          correctness before visual polish.
        </p>
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

      {state.status === 'loaded' && (
        <section className="event-section" aria-labelledby="events-heading">
          <div className="section-heading">
            <h2 id="events-heading">Current Event Feed</h2>
            <p>{formatRange(state.data.range.start, state.data.range.end)}</p>
          </div>

          <ul className="event-list">
            {state.data.events.map((event) => (
              <EventListItem key={event.id} event={event} />
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function EventListItem({ event }: { event: PublicEvent }) {
  const location = formatLocation(event)
  const dateTime = formatEventDateTime(event)

  return (
    <li className="event-item">
      <article>
        <div className="event-meta">
          <span>{event.taxonomy.primaryCategory}</span>
          <span>{event.taxonomy.priceType}</span>
          {event.allDay && <span>all day</span>}
          {event.multiDay && <span>multi-day</span>}
        </div>
        <h3>{event.title}</h3>
        <p className="event-time">{dateTime}</p>
        {location && <p className="event-location">{location}</p>}
        {event.excerpt && <p className="event-description">{event.excerpt}</p>}
        {event.links.sourceUrl && (
          <a className="source-link" href={event.links.sourceUrl} target="_blank" rel="noreferrer">
            Source
          </a>
        )}
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

function formatEventDateTime(event: PublicEvent): string {
  if (event.allDay) {
    return event.multiDay ? `${formatDate(event.start)} through ${formatDate(event.end)}` : formatDate(event.start)
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

function formatLocation(event: PublicEvent): string | undefined {
  const parts = [
    event.venue?.name,
    event.venue?.neighborhood,
    event.venue?.city,
    event.venue?.online ? 'Online' : undefined,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' - ') : event.venue?.address
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function dateOnlyToSafeDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}
