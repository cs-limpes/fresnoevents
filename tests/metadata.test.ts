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

  it('only accepts https urls', () => {
    expect(safeHttpsUrl('https://example.com/path')).toBe('https://example.com/path')
    expect(safeHttpsUrl('http://example.com/path')).toBeUndefined()
    expect(safeHttpsUrl('not-a-url')).toBeUndefined()
  })
})
