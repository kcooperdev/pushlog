import type { AdobeSurface, CapturedEvent, EventSource } from '../types'

export const SOURCE_ORDER: EventSource[] = ['adobeDataLayer', 'webSdk', 'gtm']

export const SOURCE_LABEL: Record<EventSource, string> = {
  adobeDataLayer: 'Adobe',
  webSdk: 'Web SDK',
  gtm: 'GTM',
}

export function eventSource(event: CapturedEvent): EventSource {
  if (event.source) return event.source
  const payload = event.payload
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const command = (payload as { command?: unknown }).command
    if (command === 'sendEvent') return 'webSdk'
    if (command === 'event' || command === 'config' || command === 'set' || command === 'consent' || command === 'get') {
      return 'gtm'
    }
  }
  if (event.eventName.startsWith('gtm.')) return 'gtm'
  return 'adobeDataLayer'
}

export function detectedSources(input: {
  surface?: AdobeSurface
  gtm?: boolean
  events?: CapturedEvent[]
}): EventSource[] {
  const found = new Set<EventSource>()
  if (input.surface === 'dataLayer' || input.surface === 'both') found.add('adobeDataLayer')
  if (input.surface === 'webSdk' || input.surface === 'both') found.add('webSdk')
  if (input.gtm) found.add('gtm')
  for (const event of input.events ?? []) {
    if (event.source) found.add(event.source)
  }
  return SOURCE_ORDER.filter((source) => found.has(source))
}
