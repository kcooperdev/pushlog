import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  installAdobeDataLayerHook,
  type AdobeHost,
} from '../src/content/patchAdobeDataLayer'
import type { CapturedEvent } from '../src/types'

interface HookHandle {
  target: AdobeHost
  events: CapturedEvent[]
  statuses: boolean[]
  stop: () => void
  layer: () => DataLayer
}

interface DataLayer extends Array<unknown> {
  push: (...args: unknown[]) => number
  getState?: () => unknown
}

afterEach(() => {
  vi.useRealTimers()
})

describe('installAdobeDataLayerHook', () => {
  it('captures pushes and still calls the original push', () => {
    const hook = createHook()
    hook.target.adobeDataLayer = []
    const layer = hook.layer()

    const length = layer.push({ event: 'pageLoad', page: 'home' })

    expect(length).toBe(1)
    expect(layer).toHaveLength(1)
    expect(layer[0]).toEqual({ event: 'pageLoad', page: 'home' })
    expect(hook.events.map((event) => event.eventName)).toEqual(['pageLoad'])
    expect(hook.events[0]?.payload).toEqual({ event: 'pageLoad', page: 'home' })
    hook.stop()
  })

  it('keeps working when Adobe replaces push and replays the same objects', () => {
    const hook = createHook()
    hook.target.adobeDataLayer = []
    const layer = hook.layer()
    const early = { event: 'pageLoad', page: 'home' }
    layer.push(early)

    const queued = layer.splice(0, layer.length)
    layer.push = function (...args: unknown[]) {
      const kept = args.filter((arg) => typeof arg !== 'function')
      return Array.prototype.push.apply(this, kept)
    }
    layer.getState = () => ({ ready: true })
    for (const item of queued) layer.push(item)
    layer.push({ event: 'vehicleClick', vehicleId: '12345', price: '22998' })

    expect(hook.events.map((event) => event.eventName)).toEqual(['pageLoad', 'vehicleClick'])
    expect(layer.map((item) => (item as { event: string }).event)).toEqual(['pageLoad', 'vehicleClick'])
    expect(layer.getState()).toEqual({ ready: true })
    hook.stop()
  })

  it('does not invoke listener functions pushed onto the array', () => {
    const hook = createHook()
    hook.target.adobeDataLayer = []
    let called = false
    function listener() {
      called = true
    }

    hook.layer().push(listener)

    hook.layer().push({ event: 'pageLoad' })

    expect(called).toBe(false)
    expect(hook.layer()[0]).toBe(listener)
    expect(hook.events.map((event) => event.eventName)).toEqual(['pageLoad'])
    hook.stop()
  })

  it('captures every argument and replays items that were queued before the hook', () => {
    const target: AdobeHost = { adobeDataLayer: [{ event: 'pageLoad' }] }
    const events: CapturedEvent[] = []
    const stop = installAdobeDataLayerHook({
      target,
      onEvent: (event) => events.push(event),
      onStatus: () => undefined,
      createId: sequence(),
      now: () => 10,
    })

    const layer = target.adobeDataLayer as DataLayer
    layer.push({ event: 'a' }, { event: 'b' })

    expect(events.map((event) => event.eventName)).toEqual(['pageLoad', 'a', 'b'])
    expect(layer).toHaveLength(3)
    stop()
  })

  it('still updates the array when event reporting throws', () => {
    const target: AdobeHost = {}
    const stop = installAdobeDataLayerHook({
      target,
      onEvent: () => {
        throw new Error('reporter failed')
      },
      onStatus: () => undefined,
    })
    target.adobeDataLayer = []
    const layer = target.adobeDataLayer as DataLayer

    expect(layer.push({ event: 'pageLoad' })).toBe(1)
    expect(layer).toHaveLength(1)
    stop()
  })

  it('reports detection when the data layer appears', () => {
    const hook = createHook()
    expect(hook.statuses).toEqual([false])

    hook.target.adobeDataLayer = []

    expect(hook.statuses.at(-1)).toBe(true)
    hook.stop()
  })

  it('polls a non-configurable host and then captures pushes', () => {
    vi.useFakeTimers()
    const target: AdobeHost = {}
    Object.defineProperty(target, 'adobeDataLayer', {
      configurable: false,
      writable: true,
      enumerable: true,
      value: undefined,
    })
    const events: CapturedEvent[] = []
    const stop = installAdobeDataLayerHook({
      target,
      pollMs: 20,
      onEvent: (event) => events.push(event),
      onStatus: () => undefined,
      createId: sequence(),
      now: () => 10,
    })

    target.adobeDataLayer = []
    vi.advanceTimersByTime(20)
    ;(target.adobeDataLayer as DataLayer).push({ event: 'vehicleClick' })

    expect(events.map((event) => event.eventName)).toEqual(['vehicleClick'])
    stop()
  })

  it('does not add push as an enumerable array key', () => {
    const hook = createHook()
    hook.target.adobeDataLayer = []
    const layer = hook.layer()
    layer.push({ event: 'pageLoad' })

    const keys: string[] = []
    for (const key in layer) keys.push(key)

    expect(keys).toEqual(['0'])
    hook.stop()
  })

  it('clones circular payloads without breaking push', () => {
    const hook = createHook()
    hook.target.adobeDataLayer = []
    const payload: Record<string, unknown> = { event: 'loop' }
    payload.self = payload

    hook.layer().push(payload)

    expect(hook.layer()).toHaveLength(1)
    expect(hook.events[0]?.payload).toMatchObject({ event: 'loop', self: '[Circular]' })
    hook.stop()
  })
})

function createHook(): HookHandle {
  const target: AdobeHost = {}
  const events: CapturedEvent[] = []
  const statuses: boolean[] = []
  const stop = installAdobeDataLayerHook({
    target,
    onEvent: (event) => events.push(event),
    onStatus: (detected) => statuses.push(detected),
    createId: sequence(),
    now: () => 1_700_000_000_000,
  })

  return {
    target,
    events,
    statuses,
    stop,
    layer: () => target.adobeDataLayer as DataLayer,
  }
}

function sequence(): () => string {
  let next = 0
  return () => `id-${++next}`
}
