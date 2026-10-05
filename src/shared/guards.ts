import { MAX_EVENT_NAME_CHARS, PAGE_SOURCE } from './constants'
import type {
  CapturedEvent,
  ContentMessage,
  PageMessage,
  PopupMessage,
  RuntimeMessage,
  TabState,
} from '../types'

const SESSION_MAX = 80

export function isPageMessage(value: unknown): value is PageMessage {
  if (!isRecord(value) || value.source !== PAGE_SOURCE) return false
  if (typeof value.pageSessionId !== 'string' || !isSessionId(value.pageSessionId)) return false

  if (value.type === 'PAGE_START') return true
  if (value.type === 'STATUS') return typeof value.detected === 'boolean'
  if (value.type === 'EVENT') return isCapturedEvent(value.event)
  return false
}

export function isContentMessage(value: unknown): value is ContentMessage {
  if (!isRecord(value)) return false
  if (typeof value.pageSessionId !== 'string' || !isSessionId(value.pageSessionId)) return false
  if (value.type === 'TAGFLOW_PAGE_START') return true
  if (value.type === 'TAGFLOW_STATUS') return typeof value.detected === 'boolean'
  if (value.type === 'TAGFLOW_EVENT') return isCapturedEvent(value.event)
  return false
}

export function isPopupMessage(value: unknown): value is PopupMessage {
  if (!isRecord(value) || !isTabId(value.tabId)) return false
  return value.type === 'TAGFLOW_GET_STATE' || value.type === 'TAGFLOW_CLEAR'
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  return isContentMessage(value) || isPopupMessage(value)
}

export function isCapturedEvent(value: unknown): value is CapturedEvent {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length < 80 &&
    typeof value.timestamp === 'number' &&
    Number.isFinite(value.timestamp) &&
    typeof value.eventName === 'string' &&
    value.eventName.length > 0 &&
    value.eventName.length <= MAX_EVENT_NAME_CHARS &&
    'payload' in value
  )
}

export function isTabState(value: unknown): value is TabState {
  if (!isRecord(value)) return false
  return (
    isTabId(value.tabId) &&
    typeof value.url === 'string' &&
    typeof value.detected === 'boolean' &&
    (value.pageSessionId === null || typeof value.pageSessionId === 'string') &&
    Array.isArray(value.events) &&
    typeof value.updatedAt === 'number' &&
    typeof value.revision === 'number'
  )
}

function isSessionId(value: string): boolean {
  return value.length > 0 && value.length <= SESSION_MAX
}

function isTabId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
