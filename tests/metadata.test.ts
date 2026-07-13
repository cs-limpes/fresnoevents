import { describe, expect, it } from 'vitest'
import { parseBoolean, parseEventDescription, parseList, safeHttpsUrl } from '../worker/lib/metadata'

describe('metadata parser', () => {
  it('separates public description from metadata', () => {
    const parsed = parseEventDescription(`Join us <strong>downtown</strong>.

---
category: music
tags: live music, local, live music
price: paid
unknown_key: ignored`)

    expect(parsed.publicDescription).toBe('Join us downtown.')
    expect(parsed.fields.category).toBe('music')
    expect(parseList(parsed.fields.tags)).toEqual(['live music', 'local'])
    expect(parsed.fields.price).toBe('paid')
    expect(parsed.fields.unknown_key).toBeUndefined()
    expect(parsed.warnings).toContain('Ignoring unknown metadata key: unknown_key')
  })

  it('accepts documented boolean forms', () => {
    expect(parseBoolean('yes')).toBe(true)
    expect(parseBoolean('false')).toBe(false)
    expect(parseBoolean('sometimes')).toBeUndefined()
  })

  it('extracts delimiter-free calendar metadata from recognized key lines', () => {
    const parsed = parseEventDescription(`A weekly heart-centered experience.

Type: recurring_event
Category: Youth Teen Program
Organizer: The Vibe Tribe
Cost/tickets: $22 DROP-IN
URL/contact: www.TheVibeTribe.tv
Recurrence note: Wednesdays weekly, 4:30-6:00 PM

Reviewed ambiguity notes:
No specific year or end date for recurrence provided.`)

    expect(parsed.publicDescription).toBe('A weekly heart-centered experience.')
    expect(parsed.fields.type).toBe('recurring_event')
    expect(parsed.fields.category).toBe('Youth Teen Program')
    expect(parsed.fields.organizer).toBe('The Vibe Tribe')
    expect(parsed.fields.price_text).toBe('$22 DROP-IN')
    expect(parsed.fields.website).toBe('www.TheVibeTribe.tv')
    expect(parsed.fields.recurrence_note).toBe('Wednesdays weekly, 4:30-6:00 PM')
    expect(parsed.publicDescription).not.toContain('Reviewed ambiguity notes')
  })

  it('only accepts https urls', () => {
    expect(safeHttpsUrl('https://example.com/path')).toBe('https://example.com/path')
    expect(safeHttpsUrl('www.example.com/path')).toBe('https://www.example.com/path')
    expect(safeHttpsUrl('http://example.com/path')).toBeUndefined()
    expect(safeHttpsUrl('not-a-url')).toBeUndefined()
  })
})
