import { DateTime } from 'luxon'

export const CANONICAL_TIMEZONE = 'America/Los_Angeles' as const
const DEFAULT_LOOKAHEAD_DAYS = 370
const MAX_RANGE_DAYS = 370
type AnyDateTime = DateTime<boolean>

export type EventRange = {
  start: AnyDateTime
  end: AnyDateTime
  timezone: typeof CANONICAL_TIMEZONE
}

export type SerializedEventRange = {
  start: string
  end: string
  timezone: typeof CANONICAL_TIMEZONE
}

export type RangeValidationResult =
  | { ok: true; range: SerializedEventRange }
  | { ok: false; code: string; message: string; status: number }

export function getTodayRange(now: AnyDateTime = DateTime.now()): EventRange {
  const localNow = now.setZone(CANONICAL_TIMEZONE)
  const start = localNow.startOf('day')

  return {
    start,
    end: start.plus({ days: 1 }),
    timezone: CANONICAL_TIMEZONE,
  }
}

export function getThisWeekendRange(now: AnyDateTime = DateTime.now()): EventRange {
  const localNow = now.setZone(CANONICAL_TIMEZONE)
  const monday = localNow.startOf('week')
  let start = monday.plus({ days: 4 }).set({ hour: 16, minute: 0, second: 0, millisecond: 0 })
  let end = start.plus({ days: 3 }).startOf('day')

  if (localNow >= end) {
    start = start.plus({ weeks: 1 })
    end = end.plus({ weeks: 1 })
  }

  return {
    start,
    end,
    timezone: CANONICAL_TIMEZONE,
  }
}

export function getUpcomingRange(now: AnyDateTime = DateTime.now()): EventRange {
  const localNow = now.setZone(CANONICAL_TIMEZONE)
  const start = localNow
  const monthEnd = localNow.plus({ months: 1 }).startOf('month')
  const end = monthEnd.diff(start, 'days').days < 7 ? start.plus({ days: 7 }) : monthEnd

  return {
    start,
    end,
    timezone: CANONICAL_TIMEZONE,
  }
}

export function getDefaultEventRange(now: AnyDateTime = DateTime.now()): SerializedEventRange {
  const today = getTodayRange(now)

  return serializeRange({
    start: today.start,
    end: today.start.plus({ days: DEFAULT_LOOKAHEAD_DAYS }),
    timezone: CANONICAL_TIMEZONE,
  })
}

export function validateRequestedRange(
  searchParams: URLSearchParams,
  now: AnyDateTime = DateTime.now(),
): RangeValidationResult {
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')

  if (!startParam && !endParam) {
    return { ok: true, range: getDefaultEventRange(now) }
  }

  if (!startParam || !endParam) {
    return {
      ok: false,
      code: 'INVALID_EVENT_RANGE',
      message: 'Both start and end are required when requesting a custom event range.',
      status: 400,
    }
  }

  const start = DateTime.fromISO(startParam, { setZone: true }).setZone(CANONICAL_TIMEZONE)
  const end = DateTime.fromISO(endParam, { setZone: true }).setZone(CANONICAL_TIMEZONE)

  if (!start.isValid || !end.isValid) {
    return {
      ok: false,
      code: 'INVALID_EVENT_RANGE',
      message: 'Event range dates must be valid ISO timestamps.',
      status: 400,
    }
  }

  if (end <= start) {
    return {
      ok: false,
      code: 'INVALID_EVENT_RANGE',
      message: 'Event range end must be after start.',
      status: 400,
    }
  }

  if (end.diff(start, 'days').days > MAX_RANGE_DAYS) {
    return {
      ok: false,
      code: 'EVENT_RANGE_TOO_LARGE',
      message: `Event range cannot exceed ${MAX_RANGE_DAYS} days.`,
      status: 400,
    }
  }

  return {
    ok: true,
    range: serializeRange({ start, end, timezone: CANONICAL_TIMEZONE }),
  }
}

export function serializeRange(range: EventRange): SerializedEventRange {
  return {
    start: toIsoWithOffset(range.start),
    end: toIsoWithOffset(range.end),
    timezone: CANONICAL_TIMEZONE,
  }
}

export function toIsoWithOffset(value: AnyDateTime): string {
  return value.setZone(CANONICAL_TIMEZONE).toISO({ suppressMilliseconds: true }) ?? value.toISO() ?? ''
}
