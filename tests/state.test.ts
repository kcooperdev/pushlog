import { describe, expect, it } from 'vitest'
import { MAX_EVENTS_PER_TAB } from '../src/shared/constants'
import { applyContentMessage, clearTabEvents, createTabState } from '../src/shared/state'
import type { CapturedEvent } from '../src/types'

describe('tab state', () => {
  it('records events for a page session and ignores duplicate status', () => {
    let state = createTabState(3, '', 0)
    state = applyContentMessage(state, { type: 'TAGFLOW_PAGE_START', pageSessionId: 'session-a' }, {
      now: 1,
      url: 'https://shop.example/cars',
    })
    state = applyContentMessage(
      state,
      {
        type: 'TAGFLOW_STATUS',
        pageSessionId: 'session-a',
        detected: true,
      },
      { now: 2 },
    )
    const revision = state.revision
    state = applyContentMessage(
      state,
      { type: 'TAGFLOW_STATUS', pageSessionId: 'session-a', detected: true },
      { now: 3 },
    )
    state = applyContentMessage(
      state,
      { type: 'TAGFLOW_EVENT', pageSessionId: 'session-a', event: event('pageLoad', 10) },
      { now: 4 },
    )

    expect(revision).toBe(state.revision - 1)
    expect(state.detected).toBe(true)
    expect(state.url).toBe('https://shop.example/cars')
    expect(state.events.map((item) => item.eventName)).toEqual(['pageLoad'])
  })

  it('clears the timeline when the page session changes', () => {
    let state = applyContentMessage(createTabState(1), {
      type: 'TAGFLOW_EVENT',
      pageSessionId: 'session-a',
      event: event('pageLoad', 10),
    }, { now: 10, url: 'https://a.test' })

    state = applyContentMessage(state, { type: 'TAGFLOW_PAGE_START', pageSessionId: 'session-b' }, {
      now: 20,
      url: 'https://b.test',
    })

    expect(state.events).toEqual([])
    expect(state.detected).toBe(false)
    expect(state.pageSessionId).toBe('session-b')
    expect(state.url).toBe('https://b.test')
  })

  it('keeps the newest events when the cap is reached', () => {
    let state = createTabState(1)
    for (let index = 0; index < MAX_EVENTS_PER_TAB + 1; index += 1) {
      state = applyContentMessage(
        state,
        {
          type: 'TAGFLOW_EVENT',
          pageSessionId: 'session-a',
          event: event(`event-${index}`, index),
        },
        { now: index },
      )
    }

    expect(state.events).toHaveLength(MAX_EVENTS_PER_TAB)
    expect(state.events[0]?.eventName).toBe('event-1')
    expect(state.events.at(-1)?.eventName).toBe(`event-${MAX_EVENTS_PER_TAB}`)
  })

  it('ignores listener callbacks and drops ones already stored', () => {
    let state = applyContentMessage(
      createTabState(1),
      {
        type: 'TAGFLOW_EVENT',
        pageSessionId: 'session-a',
        event: {
          id: 'listener',
          timestamp: 1,
          eventName: '(listener)',
          payload: { _tagflow: 'listener', name: 'anonymous' },
        },
      },
      { now: 1 },
    )
    expect(state.events).toEqual([])

    state = {
      ...state,
      events: [
        {
          id: 'old-listener',
          timestamp: 1,
          eventName: '(listener)',
          payload: { _tagflow: 'listener', name: 'anonymous' },
        },
      ],
    }
    state = applyContentMessage(
      state,
      {
        type: 'TAGFLOW_EVENT',
        pageSessionId: 'session-a',
        event: event('pageLoad', 2),
      },
      { now: 2 },
    )
    expect(state.events.map((item) => item.eventName)).toEqual(['pageLoad'])
  })

  it('clears stored events until the next push', () => {
    let state = applyContentMessage(createTabState(1), {
      type: 'TAGFLOW_EVENT',
      pageSessionId: 'session-a',
      event: event('vehicleClick', 5),
    }, { now: 5 })
    state = clearTabEvents(state, 6)
    expect(state.events).toEqual([])
    expect(clearTabEvents(state, 7)).toBe(state)
  })
})

function event(eventName: string, timestamp: number): CapturedEvent {
  return {
    id: eventName,
    timestamp,
    eventName,
    payload: { event: eventName },
  }
}
