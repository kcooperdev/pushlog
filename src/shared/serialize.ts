import { MAX_EVENT_NAME_CHARS, MAX_PAYLOAD_CHARS } from './constants'

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function eventNameFrom(value: unknown): string {
  if (typeof value === 'function') return '(listener)'
  if (isRecord(value) && typeof value.event === 'string' && value.event.trim()) {
    return value.event.trim().slice(0, MAX_EVENT_NAME_CHARS)
  }
  return '(data)'
}

export function payloadFrom(value: unknown): unknown {
  if (typeof value === 'function') {
    return {
      _tagflow: 'listener',
      name: value.name || 'anonymous',
    }
  }

  try {
    const json = JSON.stringify(value, replacer())
    if (json == null) return null
    if (json.length <= MAX_PAYLOAD_CHARS) return JSON.parse(json) as unknown
    return {
      _tagflow: 'truncated',
      originalLength: json.length,
      preview: json.slice(0, MAX_PAYLOAD_CHARS),
    }
  } catch {
    return { _tagflow: 'unserializable' }
  }
}

export function safeStringify(value: unknown): string {
  try {
    const json = JSON.stringify(value, replacer())
    return json ?? ''
  } catch {
    return ''
  }
}

function replacer(): (this: unknown, key: string, value: unknown) => unknown {
  const seen = new WeakSet<object>()
  return function replace(_key: string, value: unknown): unknown {
    if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`
    if (typeof value === 'bigint') return value.toString()
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
    }
    return value
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
