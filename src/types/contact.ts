export const CONTACT_INTENTS = ['correction', 'submission'] as const

export type ContactIntent = (typeof CONTACT_INTENTS)[number]

export type ContactDraftRequest = {
  intent: ContactIntent
  eventTitle?: string
  eventUrl?: string
  eventDate?: string
  venue?: string
  details?: string
  senderName?: string
  senderEmail?: string
}

export type ContactDraftResponse = {
  mailtoUrl: string
}

export type ContactErrorResponse = {
  error: {
    code: string
    message: string
  }
}
