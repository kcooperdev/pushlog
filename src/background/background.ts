import { storageKey } from '../shared/constants'
import { isContentMessage, isPopupMessage, isTabState } from '../shared/guards'
import { applyContentMessage, clearTabEvents, createTabState } from '../shared/state'
import type { RuntimeResponse, TabState } from '../types'

const cache = new Map<number, TabState>()
const chains = new Map<number, Promise<unknown>>()
const dirty = new Set<number>()
let flushTimer: ReturnType<typeof setTimeout> | undefined
let flushWaiters: Array<() => void> = []
let persistChain: Promise<void> = Promise.resolve()

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (isContentMessage(message)) {
    const tabId = sender.tab?.id
    if (tabId == null) return false
    const url = sender.tab?.url
    void enqueue(tabId, async () => {
      const current = await readState(tabId)
      const next = applyContentMessage(current, message, { url, now: Date.now() })
      if (next !== current) await remember(next)
      sendResponse({ ok: true })
    })
    return true
  }

  if (!isPopupMessage(message)) return false

  void enqueue(message.tabId, async () => {
    const current = await readState(message.tabId)
    const next = message.type === 'TAGFLOW_CLEAR' ? clearTabEvents(current, Date.now()) : current
    if (next !== current) await remember(next)
    else await flushNow()
    const state = cache.get(message.tabId) ?? next
    const response: RuntimeResponse = { ok: true, state }
    sendResponse(response)
  })
  return true
})

chrome.tabs.onRemoved.addListener((tabId) => {
  void enqueue(tabId, async () => {
    cache.delete(tabId)
    dirty.delete(tabId)
    await chrome.storage.local.remove(storageKey(tabId))
  })
})

function enqueue<T>(tabId: number, task: () => Promise<T>): Promise<T> {
  const previous = chains.get(tabId) ?? Promise.resolve()
  const run = previous.then(task, task)
  chains.set(tabId, run)
  return run
}

async function readState(tabId: number): Promise<TabState> {
  const cached = cache.get(tabId)
  if (cached) return cached

  const stored = await chrome.storage.local.get(storageKey(tabId))
  const value: unknown = stored[storageKey(tabId)]
  const state = isTabState(value) ? value : createTabState(tabId)
  cache.set(tabId, state)
  return state
}

function remember(state: TabState): Promise<void> {
  cache.set(state.tabId, state)
  dirty.add(state.tabId)
  return scheduleFlush()
}

function scheduleFlush(): Promise<void> {
  return new Promise((resolve) => {
    flushWaiters.push(resolve)
    if (flushTimer != null) return
    flushTimer = setTimeout(() => {
      void finishFlush()
    }, 50)
  })
}

async function flushNow(): Promise<void> {
  if (flushTimer == null && dirty.size === 0) return
  await finishFlush()
}

async function finishFlush(): Promise<void> {
  if (flushTimer != null) {
    clearTimeout(flushTimer)
    flushTimer = undefined
  }
  const waiters = flushWaiters
  flushWaiters = []
  const write = persistChain.then(() => persistDirty(), () => persistDirty())
  persistChain = write
  try {
    await write
  } finally {
    for (const resolve of waiters) resolve()
  }
}

async function persistDirty(): Promise<void> {
  if (dirty.size === 0) return
  const ids = [...dirty]
  dirty.clear()
  const payload: Record<string, TabState> = {}
  for (const id of ids) {
    const state = cache.get(id)
    if (state) payload[storageKey(id)] = state
  }
  if (Object.keys(payload).length === 0) return

  try {
    await chrome.storage.local.set(payload)
  } catch {
    for (const state of Object.values(payload)) {
      state.events = state.events.slice(-200)
      dirty.add(state.tabId)
    }
    try {
      await chrome.storage.local.set(payload)
    } catch {
      // Keep the trimmed events in memory for the open popup session.
    }
  }
}
