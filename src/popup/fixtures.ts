import { createTabState } from '../shared/state'
import type { CapturedEvent, TabState } from '../types'

const pageLoadAt = new Date(2026, 9, 5, 10, 1, 21).getTime()

export const FIXTURE_EVENTS: CapturedEvent[] = [
  {
    id: 'preview-page-load',
    timestamp: pageLoadAt,
    eventName: 'pageLoad',
    source: 'adobeDataLayer',
    payload: {
      event: 'pageLoad',
      pageInfo: { pageName: 'vehicle-search', siteSection: 'shopping' },
      userInfo: { loginStatus: 'guest' },
      profile: { segment: 'shopper' },
    },
  },
  {
    id: 'preview-impression',
    timestamp: pageLoadAt + 4000,
    eventName: 'recommendedCarImpression',
    source: 'adobeDataLayer',
    payload: {
      event: 'recommendedCarImpression',
      vehicleId: '99812',
      price: '28990',
      position: 1,
    },
  },
  {
    id: 'preview-listener',
    timestamp: pageLoadAt + 1000,
    eventName: '(listener)',
    payload: { _tagflow: 'listener', name: 'anonymous' },
  },
  {
    id: 'preview-click',
    timestamp: pageLoadAt + 49000,
    eventName: 'vehicleClick',
    source: 'adobeDataLayer',
    payload: {
      event: 'vehicleClick',
      vehicleId: '12345',
      price: '22998',
    },
  },
]

export function createPreviewState(): TabState {
  return {
    ...createTabState(0, 'sample timeline', pageLoadAt),
    detected: true,
    surface: 'both',
    gtm: true,
    pageSessionId: 'preview',
    events: [
      ...FIXTURE_EVENTS,
      {
        id: 'preview-web-sdk',
        timestamp: pageLoadAt + 8000,
        eventName: 'web.webpagedetails.pageViews',
        source: 'webSdk',
        payload: { command: 'sendEvent', xdm: { eventType: 'web.webpagedetails.pageViews' } },
      },
      {
        id: 'preview-gtm',
        timestamp: pageLoadAt + 12000,
        eventName: 'view_item',
        source: 'gtm',
        payload: { event: 'view_item', item_id: 'sku-1' },
      },
    ],
    revision: 1,
  }
}
