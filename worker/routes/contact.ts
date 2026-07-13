import type { ContactDraftRequest, ContactDraftResponse } from '../../src/types/contact'

export type ContactEnv = {
  FRESNO_EVENTS_CONTACT_EMAIL?: string
}

type ContactDraftResult =
  | { ok: true; response: ContactDraftResponse }
  | { ok: false; code: string; message: string; status: number }

type NormalizedContactDraft = Required<ContactDraftRequest>

const FIELD_LIMITS: Record<keyof ContactDraftRequest, number> = {
  intent: 20,
  eventTitle: 160,
  eventUrl: 500,
  eventDate: 120,
  venue: 240,
  details: 2_000,
  senderName: 120,
  senderEmail: 160,
}

export async function handleContactDraftRequest(request: Request, env: ContactEnv): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonError('METHOD_NOT_ALLOWED', 'This endpoint only supports POST requests.', 405)
  }

  const result = await buildContactDraftResponse(request, env)

  if (!result.ok) {
    return jsonError(result.code, result.message, result.status)
  }

  return json(result.response)
}

export async function buildContactDraftResponse(request: Request, env: ContactEnv): Promise<ContactDraftResult> {
  const recipient = normalizeRecipient(env.FRESNO_EVENTS_CONTACT_EMAIL)

  if (!recipient) {
    return {
      ok: false,
      code: 'CONTACT_NOT_CONFIGURED',
      message: 'Contact is not configured for this environment.',
      status: 500,
    }
  }

  const payload = await readJson(request)

  if (!payload.ok) {
    return payload
  }

  const normalized = normalizeContactDraft(payload.value)

  if (!normalized.ok) {
    return normalized
  }

  return {
    ok: true,
    response: {
      mailtoUrl: buildMailtoUrl(recipient, normalized.value),
    },
  }
}

function readJson(request: Request): Promise<
  | { ok: true; value: unknown }
  | { ok: false; code: string; message: string; status: number }
> {
  return request
    .json()
    .then((value: unknown) => ({ ok: true as const, value }))
    .catch(() => ({
      ok: false as const,
      code: 'INVALID_CONTACT_REQUEST',
      message: 'The contact request could not be read.',
      status: 400,
    }))
}

function normalizeContactDraft(
  value: unknown,
):
  | { ok: true; value: NormalizedContactDraft }
  | { ok: false; code: string; message: string; status: number } {
  if (!value || typeof value !== 'object') {
    return {
      ok: false,
      code: 'INVALID_CONTACT_REQUEST',
      message: 'The contact request is missing required fields.',
      status: 400,
    }
  }

  const input = value as Record<string, unknown>
  const intent = input.intent

  if (intent !== 'correction' && intent !== 'submission') {
    return {
      ok: false,
      code: 'INVALID_CONTACT_INTENT',
      message: 'Choose whether this is a correction or an event lead.',
      status: 400,
    }
  }

  const normalized: NormalizedContactDraft = {
    intent,
    eventTitle: readString(input, 'eventTitle'),
    eventUrl: readString(input, 'eventUrl'),
    eventDate: readString(input, 'eventDate'),
    venue: readString(input, 'venue'),
    details: readString(input, 'details'),
    senderName: readString(input, 'senderName'),
    senderEmail: readString(input, 'senderEmail'),
  }

  if (
    !normalized.eventTitle &&
    !normalized.eventUrl &&
    !normalized.eventDate &&
    !normalized.venue &&
    !normalized.details
  ) {
    return {
      ok: false,
      code: 'EMPTY_CONTACT_REQUEST',
      message: 'Add at least one event detail before opening an email draft.',
      status: 400,
    }
  }

  return { ok: true, value: normalized }
}

function readString(input: Record<string, unknown>, key: keyof ContactDraftRequest): string {
  const value = input[key]

  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, FIELD_LIMITS[key])
}

function buildMailtoUrl(recipient: string, draft: NormalizedContactDraft): string {
  const subject = buildSubject(draft)
  const body = [
    'Fresno Events contact request',
    '',
    `Type: ${draft.intent === 'correction' ? 'Correction' : 'Event lead'}`,
    draft.eventTitle ? `Event title: ${draft.eventTitle}` : undefined,
    draft.eventUrl ? `Event page or source URL: ${draft.eventUrl}` : undefined,
    draft.eventDate ? `Date/time: ${draft.eventDate}` : undefined,
    draft.venue ? `Venue/location: ${draft.venue}` : undefined,
    '',
    'Details:',
    draft.details || '(No details provided.)',
    '',
    'Sender:',
    draft.senderName ? `Name: ${draft.senderName}` : undefined,
    draft.senderEmail ? `Reply email: ${draft.senderEmail}` : undefined,
    '',
    'New events are reviewed before appearing on Fresno Events.',
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n')

  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function buildSubject(draft: NormalizedContactDraft): string {
  const prefix = draft.intent === 'correction' ? 'Correction' : 'Event lead'
  const subject = `${prefix}: ${draft.eventTitle || 'Fresno event'}`

  return subject.slice(0, 90)
}

function normalizeRecipient(value: string | undefined): string | undefined {
  const recipient = value?.trim()

  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return undefined
  }

  return recipient
}

function json(payload: ContactDraftResponse | { error: { code: string; message: string } }, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function jsonError(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status)
}
