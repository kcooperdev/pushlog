import type { PAGE_SOURCE } from '../shared/constants'

export type EventSource = 'adobeDataLayer' | 'webSdk' | 'gtm'

export interface CapturedEvent {
  id: string
  timestamp: number
  eventName: string
  payload: unknown
  source?: EventSource
}

export type AdobeSurface = 'none' | 'dataLayer' | 'webSdk' | 'both'

export interface TabState {
  tabId: number
  url: string
  detected: boolean
  surface?: AdobeSurface
  gtm?: boolean
  pageSessionId: string | null
  events: CapturedEvent[]
  updatedAt: number
  revision: number
}

export interface PageStartMessage {
  source: typeof PAGE_SOURCE
  type: 'PAGE_START'
  pageSessionId: string
}

export interface PageStatusMessage {
  source: typeof PAGE_SOURCE
  type: 'STATUS'
  pageSessionId: string
  detected: boolean
  surface?: AdobeSurface
  gtm?: boolean
}

export interface PageEventMessage {
  source: typeof PAGE_SOURCE
  type: 'EVENT'
  pageSessionId: string
  event: CapturedEvent
}

export type PageMessage = PageStartMessage | PageStatusMessage | PageEventMessage

export interface PageStartRuntimeMessage {
  type: 'TAGFLOW_PAGE_START'
  pageSessionId: string
}

export interface StatusRuntimeMessage {
  type: 'TAGFLOW_STATUS'
  pageSessionId: string
  detected: boolean
  surface?: AdobeSurface
  gtm?: boolean
}

export interface EventRuntimeMessage {
  type: 'TAGFLOW_EVENT'
  pageSessionId: string
  event: CapturedEvent
}

export type ContentMessage =
  | PageStartRuntimeMessage
  | StatusRuntimeMessage
  | EventRuntimeMessage

export interface GetStateMessage {
  type: 'TAGFLOW_GET_STATE'
  tabId: number
}

export interface ClearMessage {
  type: 'TAGFLOW_CLEAR'
  tabId: number
}

export type PopupMessage = GetStateMessage | ClearMessage

export type RuntimeMessage = ContentMessage | PopupMessage

export interface StateResponse {
  ok: true
  state: TabState
}

export interface AckResponse {
  ok: true
}

export interface ErrorResponse {
  ok: false
  error: string
}

export type RuntimeResponse = StateResponse | AckResponse | ErrorResponse
