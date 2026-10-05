export const PAGE_SOURCE = 'tagflow-page' as const

export const MAX_EVENTS_PER_TAB = 2000
export const MAX_PAYLOAD_CHARS = 50_000
export const MAX_EVENT_NAME_CHARS = 300

export const storageKey = (tabId: number): string => `tagflow:tab:${tabId}`
