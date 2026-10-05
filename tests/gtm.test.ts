import { describe, expect, it } from 'vitest'
import { installGoogleTagManagerHook } from '../src/content/patchGoogleTagManager'
import type { CapturedEvent } from '../src/types'

describe('google tag manager hook', () => {
  it('records dataLayer pushes and keeps the array length', () => {
    const events: CapturedEvent[] = []
    const target: { dataLayer?: unknown[] } = {}
    installGoogleTagManagerHook({
      target,
      pollMs: 60_000,
      onStatus: () => undefined,
      onEvent: (event) => events.push(event),
    })

    const dataLayer: unknown[] = []
    target.dataLayer = dataLayer
    dataLayer.push({ event: 'view_item', item_id: 'sku-1' })

    expect(dataLayer).toHaveLength(1)
    expect(events.map((event) => event.eventName)).toEqual(['view_item'])
    expect(events[0]?.source).toBe('gtm')
    expect(events[0]?.payload).toMatchObject({ event: 'view_item', item_id: 'sku-1' })
  })

  it('wraps the push GTM installs and records a replayed object once', () => {
    const events: CapturedEvent[] = []
    const queued = { event: 'page_view' }
    const dataLayer: unknown[] = [queued]
    const target = { dataLayer }
    installGoogleTagManagerHook({
      target,
      pollMs: 60_000,
      onStatus: () => undefined,
      onEvent: (event) => events.push(event),
    })

    const original = dataLayer.push.bind(dataLayer)
    dataLayer.push = function replacement(this: unknown[], ...args: unknown[]) {
      return original.apply(this, args)
    }

    dataLayer.push(queued)
    dataLayer.push({ event: 'add_to_cart' })

    expect(events.map((event) => event.eventName)).toEqual(['page_view', 'add_to_cart'])
    expect(dataLayer.map((item) => (item as { event: string }).event)).toEqual(['page_view', 'page_view', 'add_to_cart'])
  })

  it('records gtag arguments and skips functions', () => {
    const events: CapturedEvent[] = []
    const target: { dataLayer?: { push: (...args: unknown[]) => number } } = {}
    installGoogleTagManagerHook({
      target,
      pollMs: 60_000,
      onStatus: () => undefined,
      onEvent: (event) => events.push(event),
    })

    const dataLayer: unknown[] = []
    target.dataLayer = dataLayer
    function gtag(this: unknown, ..._args: unknown[]) {
      dataLayer.push(arguments)
    }
    gtag('js', new Date())
    gtag('config', 'G-TEST', { send_page_view: true })
    gtag('event', 'purchase', { value: 10 })
    dataLayer.push(function listener() {
      return true
    })

    expect(events.map((event) => event.eventName)).toEqual(['config G-TEST', 'event purchase'])
    expect(events[1]?.payload).toMatchObject({ command: 'event', name: 'purchase', parameters: { value: 10 } })
    expect(dataLayer).toHaveLength(4)
  })
})
