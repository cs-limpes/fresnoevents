import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import {
  CANONICAL_TIMEZONE,
  getDefaultEventRange,
  getThisWeekendRange,
  getTodayRange,
  getUpcomingRange,
  validateRequestedRange,
} from '../worker/lib/date-ranges'

describe('date ranges', () => {
  it('calculates today in America/Los_Angeles', () => {
    const now = DateTime.fromISO('2026-07-11T10:30:00', { zone: CANONICAL_TIMEZONE })
    const range = getTodayRange(now)

    expect(range.start.toISO()).toBe('2026-07-11T00:00:00.000-07:00')
    expect(range.end.toISO()).toBe('2026-07-12T00:00:00.000-07:00')
  })

  it('uses the current weekend window when already inside it', () => {
    const now = DateTime.fromISO('2026-07-11T10:30:00', { zone: CANONICAL_TIMEZONE })
    const range = getThisWeekendRange(now)

    expect(range.start.toISO()).toBe('2026-07-10T16:00:00.000-07:00')
    expect(range.end.toISO()).toBe('2026-07-13T00:00:00.000-07:00')
  })

  it('uses remainder of month for upcoming when at least seven days remain', () => {
    const now = DateTime.fromISO('2026-07-11T10:30:00', { zone: CANONICAL_TIMEZONE })
    const range = getUpcomingRange(now)

    expect(range.start.toISO()).toBe('2026-07-11T10:30:00.000-07:00')
    expect(range.end.toISO()).toBe('2026-08-01T00:00:00.000-07:00')
  })

  it('uses next seven days for upcoming near the end of the month', () => {
    const now = DateTime.fromISO('2026-07-29T10:30:00', { zone: CANONICAL_TIMEZONE })
    const range = getUpcomingRange(now)

    expect(range.start.toISO()).toBe('2026-07-29T10:30:00.000-07:00')
    expect(range.end.toISO()).toBe('2026-08-05T10:30:00.000-07:00')
  })

  it('loads a bounded long-range default feed for the primary calendar', () => {
    const now = DateTime.fromISO('2026-07-11T10:30:00', { zone: CANONICAL_TIMEZONE })
    const range = getDefaultEventRange(now)

    expect(range.start).toBe('2026-07-11T00:00:00-07:00')
    expect(range.end).toBe('2027-07-16T00:00:00-07:00')
  })

  it('rejects oversized custom ranges', () => {
    const params = new URLSearchParams({
      start: '2026-01-01T00:00:00-08:00',
      end: '2027-02-01T00:00:00-08:00',
    })

    expect(validateRequestedRange(params).ok).toBe(false)
  })
})
