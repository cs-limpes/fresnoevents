export type GoogleCalendarDateValue = {
  date?: string
  dateTime?: string
  timeZone?: string
}

export type GoogleCalendarEvent = {
  id?: string
  iCalUID?: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  status?: 'confirmed' | 'tentative' | 'cancelled' | string
  start?: GoogleCalendarDateValue
  end?: GoogleCalendarDateValue
  recurringEventId?: string
  originalStartTime?: GoogleCalendarDateValue
  created?: string
  updated?: string
}

export type GoogleCalendarEventsResponse = {
  kind?: string
  summary?: string
  timeZone?: string
  nextPageToken?: string
  items?: GoogleCalendarEvent[]
}
