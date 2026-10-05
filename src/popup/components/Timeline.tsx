import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'
import type { CapturedEvent } from '../../types'
import { EventCard } from './EventCard'

interface TimelineProps {
  events: CapturedEvent[]
  selectedId: string | null
  query: string
  ready: boolean
  detected: boolean
  waiting: string
  onSelect: (id: string) => void
}

export function Timeline({ events, selectedId, query, ready, detected, waiting, onSelect }: TimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const previousCount = useRef(events.length)

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 132,
    overscan: 10,
    paddingStart: 4,
    paddingEnd: 12,
  })

  useEffect(() => {
    const element = parentRef.current
    const added = events.length - previousCount.current
    previousCount.current = events.length
    if (!element || added <= 0 || element.scrollTop < 8) return
    element.scrollTop += added * 84
  }, [events.length])

  return (
    <div ref={parentRef} className="timeline-scroll min-h-0 flex-1 overflow-y-auto px-4">
      {events.length === 0 ? (
        <EmptyTimeline ready={ready} detected={detected} query={query} waiting={waiting} />
      ) : (
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const event = events[item.index]
            if (!event) return null
            return (
              <div
                key={event.id}
                data-index={item.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 top-0 w-full pb-2"
                style={{ transform: `translateY(${item.start}px)` }}
              >
                <EventCard event={event} selected={event.id === selectedId} onSelect={onSelect} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyTimeline({ ready, detected, query, waiting }: { ready: boolean; detected: boolean; query: string; waiting: string }) {
  const message = !ready
    ? 'Connecting to this tab…'
    : query.trim()
      ? `No events match "${query.trim()}"`
      : detected
        ? waiting
        : 'Events show up here as the page pushes them.'

  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <p className="text-[13px] leading-5 text-mist-500">{message}</p>
    </div>
  )
}
