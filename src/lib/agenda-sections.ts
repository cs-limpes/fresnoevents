import { DateTime } from 'luxon'
import type { PublicEvent } from '../types/events'

export const AGENDA_TIMEZONE = 'America/Los_Angeles'
type AnyDateTime = DateTime<boolean>

export type AgendaSectionId = 'today' | 'this-weekend' | 'upcoming'

export type AgendaSection = {
  id: AgendaSectionId
  title: string
  range: {
    start: AnyDateTime
    end: AnyDateTime
  }
  events: PublicEvent[]
}

type SectionWindow = Omit<AgendaSection, 'events'>

export function getAgendaSections(events: PublicEvent[], now: AnyDateTime = DateTime.now()): AgendaSection[] {
  const windows = getAgendaWindows(now)

  return windows.map((window) => {
    const seenInSection = new Set<string>()
    const sectionEvents = events.filter((event) => {
      if (seenInSection.has(event.id) || !eventOverlapsRange(event, window.range.start, window.range.end)) {
        return false
      }

      seenInSection.add(event.id)
      return true
    })

    return {
      ...window,
      events: sectionEvents,
    }
  })
}

export function getAgendaWindows(now: AnyDateTime = DateTime.now()): SectionWindow[] {
  const localNow = now.setZone(AGENDA_TIMEZONE)
  const todayStart = localNow.startOf('day')
  const todayEnd = todayStart.plus({ days: 1 })
  const weekendStart = getWeekendStart(localNow)
  const weekendEnd = weekendStart.plus({ days: 3 }).startOf('day')
  const upcomingEnd = getUpcomingEnd(localNow)

  return [
    {
      id: 'today',
      title: 'Today',
      range: { start: todayStart, end: todayEnd },
    },
    {
      id: 'this-weekend',
      title: 'This Weekend',
      range: { start: weekendStart, end: weekendEnd },
    },
    {
      id: 'upcoming',
      title: 'Upcoming',
      range: { start: localNow, end: upcomingEnd },
    },
  ]
}

export function eventOverlapsRange(
  event: PublicEvent,
  rangeStart: AnyDateTime,
  rangeEnd: AnyDateTime,
): boolean {
  const eventStart = parseEventBoundary(event.start, event.allDay)
  const eventEnd = parseEventBoundary(event.end, event.allDay)

  return eventStart < rangeEnd && eventEnd > rangeStart
}

function getWeekendStart(now: AnyDateTime): AnyDateTime {
  const monday = now.startOf('week')
  let start = monday.plus({ days: 4 }).set({ hour: 16, minute: 0, second: 0, millisecond: 0 })
  const end = start.plus({ days: 3 }).startOf('day')

  if (now >= end) {
    start = start.plus({ weeks: 1 })
  }

  return start
}

function getUpcomingEnd(now: AnyDateTime): AnyDateTime {
  const monthEnd = now.plus({ months: 1 }).startOf('month')
  return monthEnd.diff(now, 'days').days < 7 ? now.plus({ days: 7 }) : monthEnd
}

function parseEventBoundary(value: string, allDay: boolean): AnyDateTime {
  return allDay
    ? DateTime.fromISO(value, { zone: AGENDA_TIMEZONE })
    : DateTime.fromISO(value, { setZone: true }).setZone(AGENDA_TIMEZONE)
}
