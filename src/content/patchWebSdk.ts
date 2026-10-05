import { createId, payloadFrom } from '../shared/serialize'
import type { CapturedEvent } from '../types'

const PATCHED = Symbol('tagflow.alloy')

type AlloyFn = ((...args: unknown[]) => unknown) & {
  q?: unknown[]
  [PATCHED]?: true
}

export interface WebSdkHost {
  alloy?: unknown
  __alloyNS?: unknown
}

export interface WebSdkHookOptions {
  target: WebSdkHost
  onEvent: (event: CapturedEvent) => void
  onStatus: (detected: boolean) => void
  now?: () => number
  createId?: () => string
  pollMs?: number
}

/**
 * Watches alloy("sendEvent") from the AEP Web SDK.
 * The command is recorded and the original function is always called.
 */
export function installWebSdkHook(options: WebSdkHookOptions): () => void {
  const now = options.now ?? (() => Date.now())
  const nextId = options.createId ?? createId
  const pollMs = options.pollMs ?? 250
  const seen = new WeakSet<object>()
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

  const captureCall = (args: ArrayLike<unknown>) => {
    if (args[0] !== 'sendEvent') return
    const optionsArg = args[1]
    if (isObject(optionsArg)) {
      if (seen.has(optionsArg)) return
      seen.add(optionsArg)
    }
    const payload = isRecord(optionsArg) ? { command: 'sendEvent', ...optionsArg } : { command: 'sendEvent' }
    options.onEvent({
      id: nextId(),
      timestamp: now(),
      eventName: sendEventName(optionsArg),
      payload: payloadFrom(payload),
      source: 'webSdk',
    })
  }

  const captureSafely = (args: ArrayLike<unknown>) => {
    try {
      captureCall(args)
    } catch {
      // Capture must not break the host page.
    }
  }

  const replayQueue = (fn: unknown) => {
    const queue = isRecord(fn) && Array.isArray(fn.q) ? fn.q : null
    if (!queue) return
    for (const item of queue) {
      const args = queuedArguments(item)
      if (args) captureSafely(args)
    }
  }

  const wrap = (original: AlloyFn): AlloyFn => {
    if (original[PATCHED]) return original
    replayQueue(original)
    const wrapped = function (this: unknown, ...args: unknown[]): unknown {
      captureSafely(args)
      return original.apply(this, args)
    } as AlloyFn
    copyOwnProperties(original, wrapped)
    Object.defineProperty(wrapped, 'name', { value: original.name || 'alloy' })
    Object.defineProperty(wrapped, PATCHED, { value: true })
    return wrapped
  }

  const installName = (name: string) => {
    const host = options.target as Record<string, unknown>
    const current = host[name]
    const descriptor = Object.getOwnPropertyDescriptor(host, name)
    if (descriptor && descriptor.configurable === false) {
      if (typeof current === 'function') {
        try {
          host[name] = wrap(current as AlloyFn)
        } catch {
          // Leave a locked function untouched.
        }
      }
      return
    }

    let stored = typeof current === 'function' ? wrap(current as AlloyFn) : current
    try {
      Object.defineProperty(host, name, {
        configurable: true,
        enumerable: descriptor?.enumerable ?? true,
        get() {
          return stored
        },
        set(next: unknown) {
          stored = typeof next === 'function' ? wrap(next as AlloyFn) : next
          try {
            setStatus(readDetected())
          } catch {
            // Detection must not break assignment.
          }
        },
      })
    } catch {
      if (typeof current === 'function') {
        try {
          host[name] = wrap(current as AlloyFn)
        } catch {
          // The poll retries.
        }
      }
    }
  }

  const readDetected = () => names().some((name) => typeof (options.target as Record<string, unknown>)[name] === 'function')

  const names = (): string[] => {
    const found = new Set<string>(['alloy'])
    const listed = options.target.__alloyNS
    if (Array.isArray(listed)) {
      for (const name of listed) {
        if (typeof name === 'string' && name) found.add(name)
      }
    }
    return [...found]
  }

  const scan = () => {
    if (stopped) return
    for (const name of names()) installName(name)
    setStatus(readDetected())
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

export function sendEventName(options: unknown): string {
  if (!isRecord(options)) return 'sendEvent'
  const xdm = isRecord(options.xdm) ? options.xdm : undefined
  if (xdm && typeof xdm.eventType === 'string' && xdm.eventType.trim()) {
    return xdm.eventType.trim().slice(0, 300)
  }
  const web = xdm && isRecord(xdm.web) ? xdm.web : undefined
  const interaction = web && isRecord(web.webInteraction) ? web.webInteraction : undefined
  if (interaction && typeof interaction.name === 'string' && interaction.name.trim()) {
    return interaction.name.trim().slice(0, 300)
  }
  return 'sendEvent'
}

function queuedArguments(item: unknown): ArrayLike<unknown> | null {
  if (!Array.isArray(item) || item.length < 3) return null
  const args = item[2]
  if (!args || typeof args !== 'object' || typeof (args as { length?: unknown }).length !== 'number') return null
  return args as ArrayLike<unknown>
}

function copyOwnProperties(source: object, target: object): void {
  for (const key of Object.getOwnPropertyNames(source)) {
    if (key === 'length' || key === 'name' || key === 'prototype') continue
    const descriptor = Object.getOwnPropertyDescriptor(source, key)
    if (!descriptor) continue
    try {
      Object.defineProperty(target, key, descriptor)
    } catch {
      // Some function properties cannot be copied. The call still goes to the original.
    }
  }
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
