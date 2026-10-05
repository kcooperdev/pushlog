import { PAGE_SOURCE } from '../shared/constants'
import { installAdobeDataLayerHook } from './patchAdobeDataLayer'
import { installGoogleTagManagerHook, type GoogleTagManagerHost } from './patchGoogleTagManager'
import { installWebSdkHook } from './patchWebSdk'
import type { AdobeSurface, CapturedEvent } from '../types'

const GUARD = '__tagflowInstalled'

interface TagFlowWindow extends Window {
  [GUARD]?: boolean
}

/**
 * Runs in the page's main world so it can see window.adobeDataLayer.
 * Isolated content scripts cannot. Events cross the boundary with postMessage;
 * the isolated bridge forwards them into the extension.
 */
function boot(): void {
  const host = window as TagFlowWindow
  if (host[GUARD]) return
  Object.defineProperty(host, GUARD, { value: true, enumerable: false })

  const pageSessionId = crypto.randomUUID()
  let dataLayer = false
  let webSdk = false
  let gtm = false

  const postStatus = () => {
    const surface: AdobeSurface = dataLayer && webSdk ? 'both' : dataLayer ? 'dataLayer' : webSdk ? 'webSdk' : 'none'
    window.postMessage(
      {
        source: PAGE_SOURCE,
        type: 'STATUS',
        pageSessionId,
        detected: surface !== 'none' || gtm,
        surface,
        gtm,
      },
      '*',
    )
  }

  window.postMessage(
    {
      source: PAGE_SOURCE,
      type: 'PAGE_START',
      pageSessionId,
    },
    '*',
  )

  const onEvent = (event: CapturedEvent) => {
    window.postMessage(
      {
        source: PAGE_SOURCE,
        type: 'EVENT',
        pageSessionId,
        event,
      },
      '*',
    )
  }

  installAdobeDataLayerHook({
    target: window,
    onStatus: (detected) => {
      dataLayer = detected
      postStatus()
    },
    onEvent,
  })

  installWebSdkHook({
    target: window,
    onStatus: (detected) => {
      webSdk = detected
      postStatus()
    },
    onEvent,
  })

  installGoogleTagManagerHook({
    target: window as unknown as GoogleTagManagerHost,
    onStatus: (detected) => {
      gtm = detected
      postStatus()
    },
    onEvent,
  })
}

boot()
