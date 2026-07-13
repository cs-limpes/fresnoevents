import { describe, expect, it } from 'vitest'
import { buildContactDraftResponse, handleContactDraftRequest } from '../worker/routes/contact'

const env = {
  FRESNO_EVENTS_CONTACT_EMAIL: 'editor@example.test',
}

describe('contact draft route', () => {
  it('builds a correction mailto draft from normalized public fields', async () => {
    const result = await buildContactDraftResponse(
      jsonRequest({
        intent: 'correction',
        eventTitle: 'Summer Scare',
        eventUrl: 'https://example.com/events/summer-scare',
        eventDate: 'July 12, 2026, 6 PM',
        venue: 'Fresno',
        details: 'The end time should be 11 PM.',
        senderName: 'Reader',
        senderEmail: 'reader@example.test',
      }),
      env,
    )

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    const mailto = new URL(result.response.mailtoUrl)

    expect(mailto.protocol).toBe('mailto:')
    expect(decodeURIComponent(mailto.pathname)).toBe('editor@example.test')
    expect(mailto.searchParams.get('subject')).toBe('Correction: Summer Scare')
    expect(mailto.searchParams.get('body')).toContain('Type: Correction')
    expect(mailto.searchParams.get('body')).toContain('The end time should be 11 PM.')
    expect(mailto.searchParams.get('body')).toContain('Reply email: reader@example.test')
  })

  it('builds an event lead mailto draft without auto-publishing language', async () => {
    const result = await buildContactDraftResponse(
      jsonRequest({
        intent: 'submission',
        eventTitle: 'Neighborhood Art Walk',
        details: 'A free public art walk downtown.',
      }),
      env,
    )

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    const body = new URL(result.response.mailtoUrl).searchParams.get('body')

    expect(new URL(result.response.mailtoUrl).searchParams.get('subject')).toBe('Event lead: Neighborhood Art Walk')
    expect(body).toContain('Type: Event lead')
    expect(body).toContain('New events are reviewed before appearing on Fresno Events.')
  })

  it('rejects empty requests', async () => {
    const result = await buildContactDraftResponse(jsonRequest({ intent: 'correction' }), env)

    expect(result).toMatchObject({
      ok: false,
      code: 'EMPTY_CONTACT_REQUEST',
      status: 400,
    })
  })

  it('does not prepare drafts until the contact recipient is configured', async () => {
    const result = await buildContactDraftResponse(
      jsonRequest({ intent: 'submission', details: 'A public event.' }),
      {},
    )

    expect(result).toMatchObject({
      ok: false,
      code: 'CONTACT_NOT_CONFIGURED',
      status: 500,
    })
  })

  it('returns controlled JSON errors for unsupported methods', async () => {
    const response = await handleContactDraftRequest(new Request('https://example.com/api/contact-draft'), env)
    const payload = await response.json()

    expect(response.status).toBe(405)
    expect(payload).toMatchObject({
      error: {
        code: 'METHOD_NOT_ALLOWED',
      },
    })
  })
})

function jsonRequest(payload: unknown): Request {
  return new Request('https://example.com/api/contact-draft', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}
