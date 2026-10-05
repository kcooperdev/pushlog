import { createId, payloadFrom } from '../shared/serialize'
import type { CapturedEvent } from '../types'

const PATCHED = Symbol('tagflow.gtm')

type PushFn = (...args: unknown[]) => unknown

interface PatchedPush extends PushFn {
  [PATCHED]: true
}

export interface GoogleTagManagerHost {
  dataLayer?: unknown
  google_tag_manager?: unknown
  document?: { getElementsByTagName?: (name: string) => ArrayLike<{ src?: string }> }
  [key: string]: unknown
}

export interface GoogleTagManagerHookOptions {
  target: GoogleTagManagerHost
  onEvent: (event: CapturedEvent) => void
  onStatus: (detected: boolean) => void
  now?: () => number
  createId?: () => string
  pollMs?: number
}

/**
 * Watches window.dataLayer (and a custom name from gtm.js ?l=) the same way
 * Adobe's data layer is watched: wrap push, including the function GTM assigns
 * during startup, and always call the original.
 */
export function installGoogleTagManagerHook(options: GoogleTagManagerHookOptions): () => void {
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
    const described = describePush(arg)
    if (!described) return
    if (isReference(arg)) {
      if (seen.has(arg)) return
      seen.add(arg)
    }
    options.onEvent({
      id: nextId(),
      timestamp: now(),
      eventName: described.eventName,
      payload: payloadFrom(described.payload),
      source: 'gtm',
    })
  }

  const captureSafely = (arg: unknown) => {
    try {
      capture(arg)
    } catch {
      // Capture must not break the host page.
    }
  }

  const wrap = (original: PushFn): PatchedPush => {
    if (isPatched(original)) return original
    const patched = function (this: unknown, ...args: unknown[]) {
      for (const arg of args) captureSafely(arg)
      return original.apply(this, args)
    } as PatchedPush
    patched[PATCHED] = true
    return patched
  }

  const installPush = (dataLayer: object) => {
    const record = dataLayer as { push?: unknown }
    let current = wrap(typeof record.push === 'function' ? (record.push as PushFn) : Array.prototype.push)

    const descriptor = Object.getOwnPropertyDescriptor(dataLayer, 'push')
    if (descriptor && descriptor.configurable === false && typeof descriptor.value === 'function') {
      if (!isPatched(descriptor.value)) {
        try {
          record.push = current
        } catch {
          // A later poll retries if push becomes writable.
        }
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

  const names = () => layerNames(options.target)

  const present = (): boolean => {
    try {
      const manager = options.target.google_tag_manager
      if (manager && typeof manager === 'object') return true
    } catch {
      // A throwing getter should not look like a missing container.
    }
    return names().some((name) => {
      try {
        return options.target[name] != null
      } catch {
        return false
      }
    })
  }

  const scan = () => {
    if (stopped) return
    setStatus(present())
    for (const name of names()) {
      let value: unknown
      try {
        value = options.target[name]
      } catch {
        continue
      }
      if (value != null) attach(value)
    }
  }

  for (const name of names()) watchProperty(options.target, name, () => {
    if (stopped) return
    scan()
  })

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

function watchProperty(target: GoogleTagManagerHost, name: string, onAssign: () => void): void {
  const hostDescriptor = Object.getOwnPropertyDescriptor(target, name)
  if (hostDescriptor && hostDescriptor.configurable === false) return
  let current: unknown
  try {
    current = target[name]
  } catch {
    current = undefined
  }
  try {
    Object.defineProperty(target, name, {
      configurable: true,
      enumerable: hostDescriptor?.enumerable ?? true,
      get() {
        return current
      },
      set(value: unknown) {
        current = value
        try {
          onAssign()
        } catch {
          // Detection must not break assignment.
        }
      },
    })
  } catch {
    // Polling still observes the property when the host rejects an accessor.
  }
}

function layerNames(target: GoogleTagManagerHost): string[] {
  const names = new Set<string>(['dataLayer'])
  try {
    const scripts = target.document?.getElementsByTagName?.('script')
    if (!scripts) return [...names]
    for (const script of Array.from(scripts)) {
      const src = script.src ?? ''
      if (!src.includes('googletagmanager.com/gtm.js')) continue
      const custom = new URL(src, 'https://tagflow.local').searchParams.get('l')
      if (custom && /^[A-Za-z_$][\w$]*$/.test(custom)) names.add(custom)
    }
  } catch {
    // A missing document just means the standard dataLayer name.
  }
  return [...names]
}

function describePush(arg: unknown): { eventName: string; payload: unknown } | null {
  if (typeof arg === 'function') return null
  if (isArguments(arg)) {
    const values = Array.from(arg)
    const command = typeof values[0] === 'string' ? values[0] : ''
    if (command === 'js') return null
    const name = typeof values[1] === 'string' ? values[1] : ''
    const parameters = values[2]
    const eventName = name && command ? `${command} ${name}` : command || name || '(update)'
    const payload: Record<string, unknown> = {}
    if (command) payload.command = command
    if (name) payload.name = name
    if (parameters !== undefined) payload.parameters = parameters
    return { eventName, payload }
  }
  if (arg && typeof arg === 'object') {
    const event = (arg as { event?: unknown }).event
    const eventName = typeof event === 'string' && event ? event : '(update)'
    return { eventName, payload: arg }
  }
  return { eventName: '(update)', payload: arg }
}

function isArguments(value: unknown): value is ArrayLike<unknown> {
  return Object.prototype.toString.call(value) === '[object Arguments]'
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
