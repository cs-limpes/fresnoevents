const ALLOWED_KEYS = new Set([
  'type',
  'category',
  'tags',
  'city',
  'neighborhood',
  'venue',
  'address',
  'online',
  'audience',
  'price',
  'price_text',
  'ticket_url',
  'featured',
  'promoted',
  'sponsored',
  'sponsor_name',
  'image',
  'image_alt',
  'flyer',
  'source',
  'registration',
  'website',
  'organizer',
  'organizer_url',
  'recurrence_note',
  'accessibility',
])

const LEGACY_KEY_MAP = new Map<string, string>([
  ['cost/tickets', 'price_text'],
  ['cost', 'price_text'],
  ['tickets', 'price_text'],
  ['url/contact', 'website'],
  ['url', 'website'],
  ['contact', 'website'],
  ['recurrence note', 'recurrence_note'],
  ['reviewed ambiguity notes', 'reviewed_ambiguity_notes'],
])

export type ParsedMetadata = {
  publicDescription?: string
  fields: Record<string, string>
  warnings: string[]
}

export function parseEventDescription(description?: string): ParsedMetadata {
  if (!description?.trim()) {
    return { fields: {}, warnings: [] }
  }

  const normalized = description.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const delimiterIndex = lines.findIndex((line) => line.trim() === '---')
  const legacyMetadata = delimiterIndex === -1 ? splitLegacyMetadata(lines) : undefined
  const publicLines =
    delimiterIndex === -1 ? (legacyMetadata?.publicLines ?? lines) : lines.slice(0, delimiterIndex)
  const metadataLines =
    delimiterIndex === -1 ? (legacyMetadata?.metadataLines ?? []) : lines.slice(delimiterIndex + 1)
  const warnings: string[] = []
  const fields: Record<string, string> = {}

  for (const rawLine of metadataLines) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) {
      warnings.push(`Ignoring metadata line without key/value separator: ${line}`)
      continue
    }

    const key = normalizeMetadataKey(line.slice(0, separatorIndex))
    const value = line.slice(separatorIndex + 1).trim()

    if (!ALLOWED_KEYS.has(key)) {
      warnings.push(`Ignoring unknown metadata key: ${key}`)
      continue
    }

    if (Object.hasOwn(fields, key)) {
      warnings.push(`Duplicate metadata key used last value: ${key}`)
    }

    fields[key] = value
  }

  const publicDescription = htmlToPlainText(publicLines.join('\n')).trim()

  return {
    publicDescription: publicDescription || undefined,
    fields,
    warnings,
  }
}

function splitLegacyMetadata(lines: string[]): { publicLines: string[]; metadataLines: string[] } | undefined {
  const firstMetadataIndex = lines.findIndex((line) => {
    const separatorIndex = line.indexOf(':')

    if (separatorIndex === -1) {
      return false
    }

    return ALLOWED_KEYS.has(normalizeMetadataKey(line.slice(0, separatorIndex)))
  })

  if (firstMetadataIndex === -1) {
    return undefined
  }

  return {
    publicLines: lines.slice(0, firstMetadataIndex),
    metadataLines: lines.slice(firstMetadataIndex),
  }
}

function normalizeMetadataKey(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
  const mapped = LEGACY_KEY_MAP.get(normalized) ?? normalized
  return mapped.replace(/\s+/g, '_')
}

export function parseBoolean(value?: string): boolean | undefined {
  const normalized = value?.trim().toLowerCase()

  if (!normalized) {
    return undefined
  }

  if (normalized === 'true' || normalized === 'yes') {
    return true
  }

  if (normalized === 'false' || normalized === 'no') {
    return false
  }

  return undefined
}

export function parseList(value?: string): string[] {
  if (!value) {
    return []
  }

  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

export function safeHttpsUrl(value?: string): string | undefined {
  if (!value) {
    return undefined
  }

  try {
    const candidate = value.startsWith('www.') ? `https://${value}` : value
    const url = new URL(candidate)
    return url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export function htmlToPlainText(value: string): string {
  return value
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
