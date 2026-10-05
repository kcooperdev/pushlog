export function formatClock(timestamp: number): { time: string; ms: string } {
  const date = new Date(timestamp)
  return {
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    ms: pad(date.getMilliseconds(), 3),
  }
}

export function formatFullTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const clock = formatClock(timestamp)
  const day = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  return `${day} ${clock.time}.${clock.ms}`
}

export function formatPageUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname === '/' ? '' : parsed.pathname
    return `${parsed.host}${path}${parsed.search}`
  } catch {
    return url
  }
}

export function canInspect(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0')
}
