import { afterEach, describe, expect, it, vi } from 'vitest'
import { installWebSdkHook, type WebSdkHost } from '../src/content/patchWebSdk'
import type { CapturedEvent } from '../src/types'

afterEach(() => {
  vi.useRealTimers()
})

describe('installWebSdkHook', () => {
  it('records sendEvent and still returns the original promise', async () => {
    const hook = createHook()
    const calls: unknown[][] = []
    hook.target.alloy = (command: unknown, options: unknown) => {
      calls.push([command, options])
      return Promise.resolve({ command })
    }

    const result = await (hook.target.alloy as (command: string, options: unknown) => Promise<unknown>)(
      'sendEvent',
      {
        xdm: { eventType: 'web.webpagedetails.pageViews', web: { webPageDetails: { name: 'home' } } },
      },
    )

    expect(result).toEqual({ command: 'sendEvent' })
    expect(calls).toHaveLength(1)
    expect(hook.events.map((event) => event.eventName)).toEqual(['web.webpagedetails.pageViews'])
    expect(hook.statuses.at(-1)).toBe(true)
    hook.stop()
  })

  it('replays commands that were queued before the hook and ignores configure', () => {
    const queued = {
      0: 'sendEvent',
      1: { xdm: { eventType: 'commerce.purchases' } },
      length: 2,
    }
    const alloy = (() => undefined) as unknown as { q: unknown[] }
    alloy.q = [[() => undefined, () => undefined, queued]]
    const target: WebSdkHost = { alloy }

    const events: CapturedEvent[] = []
    const stop = installWebSdkHook({
      target,
      onEvent: (event) => events.push(event),
      onStatus: () => undefined,
      createId: sequence(),
      now: () => 5,
    })

    ;(target.alloy as (command: string, options?: unknown) => void)('configure', { edgeConfigId: 'abc' })
    ;(target.alloy as (command: string, options?: unknown) => void)('sendEvent', queued[1])

    expect(events.map((event) => event.eventName)).toEqual(['commerce.purchases'])
    stop()
  })

  it('keeps capturing after the Web SDK replaces alloy', () => {
    const hook = createHook()
    hook.target.alloy = () => Promise.resolve()
    hook.target.alloy = (command: string, options: { xdm?: { eventType?: string } }) => {
      return { command, eventType: options.xdm?.eventType }
    }

    const result = (hook.target.alloy as (command: string, options: unknown) => { eventType?: string })(
      'sendEvent',
      { xdm: { web: { webInteraction: { name: 'vehicleClick' } } } },
    )

    expect(result.eventType).toBeUndefined()
    expect(hook.events.map((event) => event.eventName)).toEqual(['vehicleClick'])
    hook.stop()
  })
})

function createHook(): { target: WebSdkHost; events: CapturedEvent[]; statuses: boolean[]; stop: () => void } {
  const target: WebSdkHost = {}
  const events: CapturedEvent[] = []
  const statuses: boolean[] = []
  const stop = installWebSdkHook({
    target,
    onEvent: (event) => events.push(event),
    onStatus: (detected) => statuses.push(detected),
    createId: sequence(),
    now: () => 10,
  })
  return { target, events, statuses, stop }
}

function sequence(): () => string {
  let next = 0
  return () => `id-${++next}`
}
