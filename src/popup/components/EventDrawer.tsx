import { useEffect, useId, useState } from 'react'
import { prettyJson } from '../../shared/json'
import type { CapturedEvent } from '../../types'
import { formatFullTimestamp } from '../lib/time'
import { JsonView } from './JsonView'
import { PayloadTree } from './PayloadTree'

interface EventDrawerProps {
  event: CapturedEvent
  onClose: () => void
}

export function EventDrawer({ event, onClose }: EventDrawerProps) {
  const titleId = useId()
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [showJson, setShowJson] = useState(false)

  useEffect(() => {
    setCopyState('idle')
    setShowJson(false)
  }, [event.id])

  useEffect(() => {
    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prettyJson(event.payload))
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end">
      <button type="button" className="absolute inset-0 bg-black/65" aria-label="Close details" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[78%] min-h-0 flex-col rounded-t-2xl border border-ink-600 bg-ink-900 shadow-card"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-700 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-mist-500">Event Name</p>
            <h2 id={titleId} className="truncate font-mono text-[16px] font-medium text-mist-50">
              {event.eventName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-ink-600 px-2 py-1 text-[11px] text-mist-300 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-mist-500">Timestamp</p>
          <p className="mt-1 font-mono text-[12px] text-mist-100">{formatFullTimestamp(event.timestamp)}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-mist-500">Payload</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setShowJson((current) => !current)}
                className="rounded-md border border-ink-600 px-2 py-1 text-[11px] text-mist-100 hover:border-signal"
              >
                {showJson ? 'Folders' : 'Raw JSON'}
              </button>
              <button
                type="button"
                onClick={() => void copy()}
                className="rounded-md border border-ink-600 px-2 py-1 text-[11px] text-mist-100 hover:border-signal"
              >
                {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy JSON'}
              </button>
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-ink-700 bg-ink-950 p-2">
            {showJson ? <JsonView value={event.payload} /> : <PayloadTree value={event.payload} expandedDepth={2} />}
          </div>
        </div>
      </section>
    </div>
  )
}
