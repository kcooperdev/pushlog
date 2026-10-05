import { isPageMessage } from '../shared/guards'
import type { ContentMessage, PageMessage } from '../types'

const GUARD = '__tagflowBridge'

interface TagFlowScope {
  [GUARD]?: boolean
}

const scope = globalThis as typeof globalThis & TagFlowScope

if (!scope[GUARD]) {
  Object.defineProperty(scope, GUARD, { value: true, enumerable: false })

  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (event.source !== window || !isPageMessage(event.data)) return
    forward(toRuntimeMessage(event.data))
  })
}

function forward(message: ContentMessage): void {
  try {
    void chrome.runtime.sendMessage(message).catch(() => {
      // The service worker can be asleep or the extension may have reloaded.
    })
  } catch {
    // chrome.runtime throws when this isolated world is stale.
  }
}

function toRuntimeMessage(message: PageMessage): ContentMessage {
  switch (message.type) {
    case 'PAGE_START':
      return { type: 'TAGFLOW_PAGE_START', pageSessionId: message.pageSessionId }
    case 'STATUS':
      return {
        type: 'TAGFLOW_STATUS',
        pageSessionId: message.pageSessionId,
        detected: message.detected,
        surface: message.surface,
        gtm: message.gtm,
      }
    case 'EVENT':
      return {
        type: 'TAGFLOW_EVENT',
        pageSessionId: message.pageSessionId,
        event: message.event,
      }
  }
}
