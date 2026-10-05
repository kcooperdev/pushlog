import type { EventSource } from '../../types'
import { SOURCE_LABEL } from '../../shared/sources'

interface StatusBannerProps {
  ready: boolean
  restricted: boolean
  sources: EventSource[]
  active: EventSource | null
  error: string | null
  onSelect: (source: EventSource) => void
}

export function StatusBanner({ ready, restricted, sources, active, error, onSelect }: StatusBannerProps) {
  const blocked = Boolean(error) || !ready || restricted
  const text = error
    ? error
    : !ready
      ? 'Checking this page…'
      : restricted
        ? 'Open a website to inspect its data layer'
        : 'No tag manager found'

  if (!blocked && sources.length > 0) {
    return (
      <div className="px-4 pb-3">
        <div className="flex rounded-lg border border-ink-600 bg-ink-900 p-1" role="tablist" aria-label="Detected tag managers">
          {sources.map((source) => {
            const selected = source === active
            return (
              <button
                key={source}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelect(source)}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium ${
                  selected ? 'bg-live/15 text-live' : 'text-mist-400 hover:bg-ink-800 hover:text-mist-100'
                }`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${selected ? 'live-dot bg-live' : 'bg-mist-500'}`} aria-hidden="true" />
                <span className="truncate">{SOURCE_LABEL[source]}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center gap-2.5 rounded-lg border border-ink-600 bg-ink-900 px-3 py-2" role="status">
        <span className="h-2 w-2 shrink-0 rounded-full bg-mist-500" aria-hidden="true" />
        <p className="text-[13px] text-mist-300">{text}</p>
      </div>
    </div>
  )
}
