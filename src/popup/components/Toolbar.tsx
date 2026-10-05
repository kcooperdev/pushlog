import { MAX_EVENTS_PER_TAB } from '../../shared/constants'

interface ToolbarProps {
  shown: number
  total: number
  query: string
  onClear: () => void
}

export function Toolbar({ shown, total, query, onClear }: ToolbarProps) {
  const summary = summaryText(shown, total, query)

  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-2">
      <p className="text-[11px] text-mist-500">{summary}</p>
      <button
        type="button"
        onClick={onClear}
        disabled={total === 0}
        className="rounded-md border border-ink-600 px-2.5 py-1 text-[11px] font-medium text-mist-100 transition hover:border-signal hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Clear Timeline
      </button>
    </div>
  )
}

function summaryText(shown: number, total: number, query: string): string {
  const noun = shown === 1 ? 'event' : 'events'
  if (query.trim()) return `${shown} of ${total} ${total === 1 ? 'event' : 'events'}`
  if (total >= MAX_EVENTS_PER_TAB) return `${total} ${noun} · latest only`
  return `${shown} ${noun}`
}
