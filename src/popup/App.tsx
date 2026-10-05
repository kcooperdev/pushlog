import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MAX_EVENTS_PER_TAB } from '../shared/constants'
import { filterEvents } from '../shared/search'
import { detectedSources, eventSource } from '../shared/sources'
import { isListenerEvent } from '../shared/state'
import type { EventSource } from '../types'
import { EventDrawer } from './components/EventDrawer'
import { Header } from './components/Header'
import { SearchBar } from './components/SearchBar'
import { StatusBanner } from './components/StatusBanner'
import { Timeline } from './components/Timeline'
import { Toolbar } from './components/Toolbar'
import { useTabState } from './hooks/useTabState'

export function App() {
  const tab = useTabState()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const onSelect = useCallback((id: string) => setSelectedId(id), [])
  const onClose = useCallback(() => setSelectedId(null), [])

  const tracked = useMemo(() => tab.events.filter((event) => !isListenerEvent(event)), [tab.events])
  const sources = useMemo(
    () => detectedSources({ surface: tab.surface, gtm: tab.gtm, events: tracked }),
    [tab.surface, tab.gtm, tracked],
  )
  const [active, setActive] = useState<EventSource | null>(null)
  const onSelectSource = useCallback((source: EventSource) => setActive(source), [])

  useEffect(() => {
    if (active && sources.includes(active)) return
    setActive(sources[0] ?? null)
  }, [active, sources])

  const scoped = useMemo(() => {
    if (!active) return tracked
    return tracked.filter((event) => eventSource(event) === active)
  }, [tracked, active])
  const filtered = useMemo(() => filterEvents(scoped, query), [scoped, query])
  const newestFirst = useMemo(() => [...filtered].reverse(), [filtered])
  const selected = scoped.find((event) => event.id === selectedId) ?? null

  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null)
  }, [selected, selectedId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null)
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative flex h-full min-h-0 flex-col text-mist-100">
      <Header url={tab.url} eventCount={Math.min(scoped.length, MAX_EVENTS_PER_TAB)} preview={tab.preview} />
      <StatusBanner
        ready={tab.ready}
        restricted={tab.restricted}
        sources={sources}
        active={active}
        error={tab.error}
        onSelect={onSelectSource}
      />
      <SearchBar value={query} inputRef={searchRef} onChange={setQuery} />
      <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-mist-500">Timeline</p>
      <Toolbar shown={newestFirst.length} total={scoped.length} query={query} onClear={tab.clear} />
      <Timeline
        events={newestFirst}
        selectedId={selectedId}
        query={query}
        ready={tab.ready}
        detected={tab.detected && !tab.restricted}
        waiting={
          active === 'webSdk'
            ? 'Waiting for alloy("sendEvent")'
            : active === 'gtm'
              ? 'Waiting for dataLayer.push()'
              : 'Waiting for adobeDataLayer.push()'
        }
        onSelect={onSelect}
      />
      {selected ? <EventDrawer event={selected} onClose={onClose} /> : null}
    </div>
  )
}
