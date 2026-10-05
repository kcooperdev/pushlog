export interface PayloadField {
  key: string
  value: unknown
}

export function isFolder(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === 'object'
}

export function payloadFields(payload: unknown): PayloadField[] {
  if (!isFolder(payload)) return []
  if (Array.isArray(payload)) {
    return payload.map((value, index) => ({ key: String(index), value }))
  }
  return Object.entries(payload).map(([key, value]) => ({ key, value }))
}

export function payloadPreview(payload: unknown): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return ''

  const parts = Object.entries(payload as Record<string, unknown>)
    .filter(([key]) => key !== 'event' && !key.startsWith('_tagflow'))
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${previewValue(value)}`)

  return parts.join('  ·  ')
}

function previewValue(value: unknown): string {
  if (value == null) return String(value)
  if (typeof value === 'string') return value.length > 42 ? `${value.slice(0, 42)}…` : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.length}]`
  if (typeof value === 'object') return '{…}'
  return ''
}
