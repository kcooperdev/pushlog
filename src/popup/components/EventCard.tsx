import { memo } from 'react'
import type { CapturedEvent } from '../../types'
import { formatClock } from '../lib/time'
import { Chevron } from './Mark'
import { PayloadTree } from './PayloadTree'

interface EventCardProps {
  event: CapturedEvent
  selected: boolean
  onSelect: (id: string) => void
}

export const EventCard = memo(function EventCard({ event, selected, onSelect }: EventCardProps) {
  const clock = formatClock(event.timestamp)
  const quiet = event.eventName.startsWith('(')

  return (
    <div
      className={`rounded-lg border border-ink-700 border-l-2 bg-ink-800 text-left shadow-card ${
        quiet ? 'border-l-mist-500' : 'border-l-signal'
      } ${selected ? 'ring-1 ring-signal' : ''}`}
    >
      <button
        type="button"
        onClick={() => onSelect(event.id)}
        aria-pressed={selected}
        aria-label={`Expand ${event.eventName}`}
        className="w-full px-3 pt-2.5 text-left hover:bg-ink-700"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] tabular-nums text-mist-500">
            <span className="text-mist-300">{clock.time}</span>
            <span>.{clock.ms}</span>
          </span>
          <Chevron />
        </span>
        <span className="mt-1 block truncate pb-2 font-mono text-[13px] font-medium text-mist-50">{event.eventName}</span>
      </button>
      <div className="px-2 pb-2">
        <PayloadTree value={event.payload} expandedDepth={1} hideKeys={['event']} />
      </div>
    </div>
  )
})
