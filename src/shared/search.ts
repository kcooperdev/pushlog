import { safeStringify } from './serialize'
import type { CapturedEvent } from '../types'

export function eventSearchText(event: CapturedEvent): string {
  return `${event.eventName}\n${safeStringify(event.payload)}`.toLowerCase()
}

export function filterEvents(events: CapturedEvent[], query: string): CapturedEvent[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return events
  return events.filter((event) => eventSearchText(event).includes(needle))
}
