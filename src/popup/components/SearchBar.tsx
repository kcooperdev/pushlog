import type { Ref } from 'react'

interface SearchBarProps {
  value: string
  inputRef: Ref<HTMLInputElement>
  onChange: (value: string) => void
}

export function SearchBar({ value, inputRef, onChange }: SearchBarProps) {
  return (
    <div className="px-4 pb-2">
      <label className="sr-only" htmlFor="tagflow-search">
        Search events
      </label>
      <input
        id="tagflow-search"
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search event name or payload"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 font-mono text-[12px] text-mist-100 outline-none placeholder:text-mist-500 focus:border-signal"
      />
    </div>
  )
}
