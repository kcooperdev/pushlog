import { MAX_EVENTS_PER_TAB } from './constants'
import type { AdobeSurface, CapturedEvent, ContentMessage, TabState } from '../types'

export function isListenerEvent(event: CapturedEvent): boolean {
  if (event.eventName === '(listener)') return true
  const payload = event.payload
  return typeof payload === 'object' && payload !== null && '_tagflow' in payload && payload._tagflow === 'listener'
}

export function createTabState(tabId: number, url = '', now = Date.now()): TabState {
  return {
    tabId,
    url,
    detected: false,
    surface: 'none',
    gtm: false,
    pageSessionId: null,
    events: [],
    updatedAt: now,
    revision: 0,
  }
}

export function applyContentMessage(
  state: TabState,
  message: ContentMessage,
  meta: { url?: string; now: number },
): TabState {
  const url = meta.url ?? state.url
  const sessionChanged = state.pageSessionId !== message.pageSessionId
  const retained = sessionChanged ? [] : state.events
  const events = retained.some(isListenerEvent) ? retained.filter((event) => !isListenerEvent(event)) : retained

  if (message.type === 'TAGFLOW_PAGE_START') {
    return commit(
      state,
      {
        url,
        detected: sessionChanged ? false : state.detected,
        surface: sessionChanged ? 'none' : (state.surface ?? 'none'),
        gtm: sessionChanged ? false : Boolean(state.gtm),
        pageSessionId: message.pageSessionId,
        events,
      },
      meta.now,
    )
  }

  if (message.type === 'TAGFLOW_STATUS') {
    return commit(
      state,
      {
        url,
        detected: message.detected || Boolean(message.gtm),
        surface: message.surface ?? state.surface ?? 'none',
        gtm: message.gtm ?? Boolean(state.gtm),
        pageSessionId: message.pageSessionId,
        events,
      },
      meta.now,
    )
  }

  if (isListenerEvent(message.event)) {
    return commit(
      state,
      {
        url,
        detected: true,
        surface: state.surface ?? 'none',
        gtm: Boolean(state.gtm),
        pageSessionId: message.pageSessionId,
        events,
      },
      meta.now,
    )
  }

  return commit(
    state,
    {
      url,
      detected: true,
      surface: state.surface ?? 'none',
      gtm: Boolean(state.gtm),
      pageSessionId: message.pageSessionId,
      events: appendCapped(events, message.event),
    },
    meta.now,
  )
}

export function clearTabEvents(state: TabState, now: number): TabState {
  if (state.events.length === 0) return state
  return {
    ...state,
    events: [],
    updatedAt: now,
    revision: state.revision + 1,
  }
}

export function appendCapped(events: CapturedEvent[], event: CapturedEvent): CapturedEvent[] {
  if (events.length < MAX_EVENTS_PER_TAB) return [...events, event]
  return [...events.slice(events.length - MAX_EVENTS_PER_TAB + 1), event]
}

function commit(
  prev: TabState,
  next: Pick<TabState, 'url' | 'detected' | 'surface' | 'gtm' | 'pageSessionId' | 'events'>,
  now: number,
): TabState {
  const surface: AdobeSurface = next.surface ?? 'none'
  const gtm = Boolean(next.gtm)
  if (
    prev.url === next.url &&
    prev.detected === next.detected &&
    (prev.surface ?? 'none') === surface &&
    Boolean(prev.gtm) === gtm &&
    prev.pageSessionId === next.pageSessionId &&
    prev.events === next.events
  ) {
    return prev
  }

  return {
    tabId: prev.tabId,
    url: next.url,
    detected: next.detected,
    surface,
    gtm,
    pageSessionId: next.pageSessionId,
    events: next.events,
    updatedAt: now,
    revision: prev.revision + 1,
  }
}
