import { createId, eventNameFrom, payloadFrom } from '../shared/serialize'
import type { CapturedEvent } from '../types'

const PATCHED = Symbol('tagflow.patched')

type PushFn = (...args: unknown[]) => unknown

interface PatchedPush extends PushFn {
  [PATCHED]: true
}

export interface AdobeHost {
  adobeDataLayer?: unknown
}

export interface AdobeDataLayerHookOptions {
  target: AdobeHost
  onEvent: (event: CapturedEvent) => void
  onStatus: (detected: boolean) => void
  now?: () => number
  createId?: () => string
  pollMs?: number
}

/**
 * Watches window.adobeDataLayer and wraps push without replacing the array.
 * Adobe Client Data Layer assigns a new push during init; the setter wraps that
 * function before queued items are replayed. The original push is always called.
 */
export function installAdobeDataLayerHook(options: AdobeDataLayerHookOptions): () => void {
  const now = options.now ?? (() => Date.now())
  const nextId = options.createId ?? createId
  const pollMs = options.pollMs ?? 250
  const seen = new WeakSet<object>()
  const hooked = new WeakSet<object>()
  const timers = new Set<ReturnType<typeof setInterval>>()
  let lastStatus: boolean | null = null
  let stopped = false
  let relaxTimer: ReturnType<typeof setTimeout> | undefined

  const setStatus = (detected: boolean) => {
    if (lastStatus === detected) return
    lastStatus = detected
    try {
      options.onStatus(detected)
    } catch {
      // Status reporting must not break the host page.
    }
  }

  const capture = (arg: unknown) => {
    // Adobe pushes callback functions to register listeners. Those are not events.
    if (typeof arg === 'function') return
    if (isReference(arg)) {
      if (seen.has(arg)) return
      seen.add(arg)
    }
    options.onEvent({
      id: nextId(),
      timestamp: now(),
      eventName: eventNameFrom(arg),
      payload: payloadFrom(arg),
      source: 'adobeDataLayer',
    })
  }

  const captureSafely = (arg: unknown) => {
    try {
      capture(arg)
    } catch {
      // Capture must not break the host page.
    }
  }

  const wrap = (original: PushFn): PushFn => {
    if (isPatched(original)) return original
    const patched = function (this: unknown, ...args: unknown[]): unknown {
      for (const arg of args) captureSafely(arg)
      return original.apply(this, args)
    }
    Object.defineProperty(patched, 'name', { value: 'push' })
    Object.defineProperty(patched, PATCHED, { value: true })
    return patched
  }

  const installPush = (dataLayer: object) => {
    const record = dataLayer as { push?: unknown }
    const existing = typeof record.push === 'function' ? (record.push as PushFn) : Array.prototype.push
    if (isPatched(existing)) return

    let current = wrap(existing)
    const descriptor = Object.getOwnPropertyDescriptor(dataLayer, 'push')
    if (descriptor && descriptor.configurable === false) {
      try {
        record.push = current
      } catch {
        // The page locked push. Leave it untouched.
      }
      return
    }

    try {
      Object.defineProperty(dataLayer, 'push', {
        configurable: true,
        enumerable: false,
        get() {
          return current
        },
        set(next: unknown) {
          const replacement = typeof next === 'function' ? (next as PushFn) : Array.prototype.push
          current = wrap(replacement)
        },
      })
    } catch {
      try {
        record.push = current
      } catch {
        // The poll retries if the page later exposes a writable push.
      }
    }
  }

  const attach = (value: unknown) => {
    if (!isHookable(value)) return
    if (!hooked.has(value)) {
      hooked.add(value)
      if (Array.isArray(value)) {
        for (const item of [...value]) captureSafely(item)
      }
    }
    installPush(value)
  }

  const read = (): unknown => {
    try {
      return options.target.adobeDataLayer
    } catch {
      return undefined
    }
  }

  const scan = () => {
    if (stopped) return
    const value = read()
    setStatus(value != null)
    if (value != null) attach(value)
  }

  const hostDescriptor = Object.getOwnPropertyDescriptor(options.target, 'adobeDataLayer')
  if (!hostDescriptor || hostDescriptor.configurable !== false) {
    let current = read()
    try {
      Object.defineProperty(options.target, 'adobeDataLayer', {
        configurable: true,
        enumerable: hostDescriptor?.enumerable ?? true,
        get() {
          return current
        },
        set(value: unknown) {
          current = value
          try {
            setStatus(value != null)
            if (value != null) attach(value)
          } catch {
            // Detection must not break assignment.
          }
        },
      })
    } catch {
      // Polling still observes the property when the host rejects an accessor.
    }
  }

  const startPoll = (intervalMs: number) => {
    const timer = setInterval(scan, intervalMs)
    const unref = (timer as unknown as { unref?: () => void }).unref
    unref?.call(timer)
    timers.add(timer)
    return timer
  }

  scan()
  const fastTimer = startPoll(pollMs)
  relaxTimer = setTimeout(() => {
    clearInterval(fastTimer)
    timers.delete(fastTimer)
    if (!stopped) startPoll(Math.max(pollMs * 4, 1000))
  }, 20_000)
  const unrefRelax = (relaxTimer as unknown as { unref?: () => void }).unref
  unrefRelax?.call(relaxTimer)

  return () => {
    stopped = true
    if (relaxTimer) clearTimeout(relaxTimer)
    for (const timer of timers) clearInterval(timer)
    timers.clear()
  }
}

function isHookable(value: unknown): value is object {
  if (Array.isArray(value)) return true
  return Boolean(value) && typeof value === 'object' && typeof (value as { push?: unknown }).push === 'function'
}

function isReference(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function isPatched(value: unknown): value is PatchedPush {
  return typeof value === 'function' && Boolean((value as Partial<PatchedPush>)[PATCHED])
}
