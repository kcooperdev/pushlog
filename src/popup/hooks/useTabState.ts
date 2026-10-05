import { useCallback, useEffect, useRef, useState } from 'react'
import { storageKey } from '../../shared/constants'
import { isTabState } from '../../shared/guards'
import { clearTabEvents, createTabState } from '../../shared/state'
import type { AdobeSurface, RuntimeResponse, TabState } from '../../types'
import { createPreviewState } from '../fixtures'
import { canInspect } from '../lib/time'

export interface TabDebugState {
  ready: boolean
  preview: boolean
  restricted: boolean
  error: string | null
  url: string
  detected: boolean
  surface: AdobeSurface
  gtm: boolean
  events: TabState['events']
  clear: () => void
}

export function useTabState(): TabDebugState {
  const [state, setState] = useState<TabState | null>(null)
  const [ready, setReady] = useState(false)
  const [restricted, setRestricted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tabIdRef = useRef<number | null>(null)
  const preview = !inExtension()

  useEffect(() => {
    if (!inExtension()) {
      setState(createPreviewState())
      setRestricted(false)
      setReady(true)
      return
    }

    let active = true
    const apply = (incoming: TabState) => {
      if (!active) return
      setState((current) => (current && current.revision > incoming.revision ? current : incoming))
    }

    const onChanged: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, area) => {
      const tabId = tabIdRef.current
      if (area !== 'local' || tabId == null) return
      const change = changes[storageKey(tabId)]
      if (!change) return
      if (isTabState(change.newValue)) {
        apply(change.newValue)
        return
      }
      if (change.newValue == null) apply(createTabState(tabId))
    }

    chrome.storage.onChanged.addListener(onChanged)

    void (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!active) return
        if (tab?.id == null) {
          setRestricted(true)
          setReady(true)
          return
        }

        tabIdRef.current = tab.id
        const url = tab.url ?? ''
        if (!canInspect(url)) {
          setRestricted(true)
          setState(createTabState(tab.id, url))
          setReady(true)
          return
        }

        const response = (await chrome.runtime.sendMessage({
          type: 'TAGFLOW_GET_STATE',
          tabId: tab.id,
        })) as RuntimeResponse

        if (!active) return
        if (response?.ok && 'state' in response && isTabState(response.state)) {
          apply({ ...response.state, url: response.state.url || url })
        } else {
          setState(createTabState(tab.id, url))
        }
      } catch {
        if (active) setError('Pushlog background is unavailable. Reload the extension.')
      } finally {
        if (active) setReady(true)
      }
    })()

    return () => {
      active = false
      chrome.storage.onChanged.removeListener(onChanged)
    }
  }, [])

  const clear = useCallback(() => {
    if (!inExtension()) {
      setState((current) => (current ? clearTabEvents(current, Date.now()) : current))
      return
    }

    const tabId = tabIdRef.current
    if (tabId == null) return
    void chrome.runtime
      .sendMessage({ type: 'TAGFLOW_CLEAR', tabId })
      .then((response: RuntimeResponse) => {
        if (response?.ok && 'state' in response && isTabState(response.state)) {
          setState(response.state)
        }
      })
      .catch(() => {
        setError('Could not clear the timeline. Reload the extension.')
      })
  }, [])

  return {
    ready,
    preview,
    restricted,
    error,
    url: state?.url ?? '',
    detected: Boolean(state?.detected),
    surface: state?.surface ?? (state?.detected ? 'dataLayer' : 'none'),
    gtm: Boolean(state?.gtm),
    events: state?.events ?? [],
    clear,
  }
}

function inExtension(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id)
}
