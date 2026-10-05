import { describe, expect, it } from 'vitest'
import { prettyJson, tokenizeJson } from '../src/shared/json'
import { payloadPreview } from '../src/shared/preview'
import { filterEvents } from '../src/shared/search'
import { payloadFrom } from '../src/shared/serialize'
import { isPageMessage } from '../src/shared/guards'
import type { CapturedEvent } from '../src/types'

const events: CapturedEvent[] = [
  {
    id: '1',
    timestamp: 1,
    eventName: 'pageLoad',
    payload: { event: 'pageLoad', page: { name: 'home' } },
  },
  {
    id: '2',
    timestamp: 2,
    eventName: 'recommendedCarImpression',
    payload: { event: 'recommendedCarImpression', vehicleId: '99812' },
  },
  {
    id: '3',
    timestamp: 3,
    eventName: 'vehicleClick',
    payload: { event: 'vehicleClick', vehicleId: '12345', price: '22998' },
  },
]

describe('search', () => {
  it('matches event names and payload contents without case sensitivity', () => {
    expect(filterEvents(events, '').map((event) => event.eventName)).toEqual([
      'pageLoad',
      'recommendedCarImpression',
      'vehicleClick',
    ])
    expect(filterEvents(events, 'VEHICLE').map((event) => event.eventName)).toEqual([
      'recommendedCarImpression',
      'vehicleClick',
    ])
    expect(filterEvents(events, '22998').map((event) => event.id)).toEqual(['3'])
    expect(filterEvents(events, 'missing')).toEqual([])
  })
})

describe('payload helpers', () => {
  it('previews a few fields and highlights pretty JSON', () => {
    const payload = { event: 'vehicleClick', vehicleId: '12345', price: '22998' }
    expect(payloadPreview(payload)).toBe('vehicleId: 12345  ·  price: 22998')

    const tokens = tokenizeJson(prettyJson(payload))
    expect(tokens).toContainEqual({ type: 'key', value: '"event"' })
    expect(tokens).toContainEqual({ type: 'string', value: '"vehicleClick"' })
    expect(tokens).toContainEqual({ type: 'string', value: '"22998"' })
  })

  it('truncates oversized payloads and rejects spoofed page messages', () => {
    const truncated = payloadFrom({ event: 'big', blob: 'x'.repeat(60_000) })
    expect(truncated).toMatchObject({ _tagflow: 'truncated' })
    expect(isPageMessage({ source: 'tagflow-page', type: 'PAGE_START', pageSessionId: 'abc' })).toBe(true)
    expect(isPageMessage({ source: 'page', type: 'EVENT', pageSessionId: 'abc' })).toBe(false)
  })
})
