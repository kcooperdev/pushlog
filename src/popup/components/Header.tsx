import { formatPageUrl } from '../lib/time'
import { Mark } from './Mark'

interface HeaderProps {
  url: string
  eventCount: number
  preview: boolean
}

export function Header({ url, eventCount, preview }: HeaderProps) {
  const label = preview ? 'Sample timeline' : url ? formatPageUrl(url) : 'Waiting for a tab'

  return (
    <header className="flex items-center gap-3 px-4 pb-3 pt-4">
      <Mark />
      <div className="min-w-0 flex-1">
        <h1 className="text-[15px] font-semibold tracking-[0.18em] text-mist-50">PUSHLOG</h1>
        <p className="truncate text-[11px] text-mist-500" title={label}>
          {label}
        </p>
      </div>
      <p className="font-mono text-[11px] tabular-nums text-mist-400" aria-label={`${eventCount} events`}>
        {eventCount}
      </p>
    </header>
  )
}
