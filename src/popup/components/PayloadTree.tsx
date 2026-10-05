import { useMemo, useState } from 'react'
import { isFolder, payloadFields } from '../../shared/preview'

const CHILD_LIMIT = 40

interface PayloadTreeProps {
  value: unknown
  expandedDepth?: number
  hideKeys?: string[]
}

export function PayloadTree({ value, expandedDepth = 1, hideKeys = [] }: PayloadTreeProps) {
  const hidden = useMemo(() => new Set(hideKeys), [hideKeys])
  const initialOpen = useMemo(() => openPaths(value, expandedDepth, hidden), [value, expandedDepth, hidden])
  const [open, setOpen] = useState<Set<string>>(initialOpen)
  const [treeValue, setTreeValue] = useState(value)

  if (treeValue !== value) {
    setTreeValue(value)
    setOpen(initialOpen)
  }

  const fields = payloadFields(value).filter((field) => !hidden.has(field.key))
  if (!fields.length) return null

  return (
    <div className="font-mono text-[11px] leading-5">
      {fields.map((field) => (
        <TreeNode
          key={field.key}
          name={field.key}
          value={field.value}
          path={field.key}
          depth={0}
          open={open}
          onToggle={(path) => {
            setOpen((current) => {
              const next = new Set(current)
              if (next.has(path)) next.delete(path)
              else next.add(path)
              return next
            })
          }}
        />
      ))}
    </div>
  )
}

function TreeNode({
  name,
  value,
  path,
  depth,
  open,
  onToggle,
}: {
  name: string
  value: unknown
  path: string
  depth: number
  open: Set<string>
  onToggle: (path: string) => void
}) {
  if (!isFolder(value)) {
    return (
      <div className="flex min-w-0 gap-2 py-0.5" style={{ paddingLeft: depth * 14 }}>
        <span className="shrink-0 text-mist-400">{name}</span>
        <span className={`min-w-0 truncate ${valueClass(value)}`}>{formatLeaf(value)}</span>
      </div>
    )
  }

  const fields = payloadFields(value)
  const expanded = open.has(path)
  const count = Array.isArray(value) ? value.length : fields.length
  const visible = fields.slice(0, CHILD_LIMIT)

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={(event) => {
          event.stopPropagation()
          onToggle(path)
        }}
        className="flex w-full min-w-0 items-center gap-1.5 rounded py-0.5 text-left hover:bg-ink-800"
        style={{ paddingLeft: depth * 14 }}
      >
        <Caret open={expanded} />
        <FolderIcon />
        <span className="truncate text-amber-200">{name}</span>
        <span className="shrink-0 text-mist-500">{count}</span>
      </button>
      {expanded ? (
        <div>
          {visible.map((field) => (
            <TreeNode
              key={field.key}
              name={Array.isArray(value) ? `[${field.key}]` : field.key}
              value={field.value}
              path={`${path}.${field.key}`}
              depth={depth + 1}
              open={open}
              onToggle={onToggle}
            />
          ))}
          {fields.length > CHILD_LIMIT ? (
            <div className="py-0.5 text-mist-500" style={{ paddingLeft: (depth + 1) * 14 }}>
              {fields.length - CHILD_LIMIT} more
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function openPaths(value: unknown, expandedDepth: number, hidden: Set<string>): Set<string> {
  const paths = new Set<string>()
  if (expandedDepth < 1) return paths
  for (const field of payloadFields(value)) {
    if (hidden.has(field.key) || !isFolder(field.value)) continue
    collect(field.value, field.key, 1, expandedDepth, paths)
  }
  return paths
}

function collect(value: unknown, path: string, depth: number, expandedDepth: number, paths: Set<string>): void {
  if (!isFolder(value) || depth >= expandedDepth) return
  paths.add(path)
  for (const field of payloadFields(value).slice(0, CHILD_LIMIT)) {
    collect(field.value, `${path}.${field.key}`, depth + 1, expandedDepth, paths)
  }
}

function formatLeaf(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value)
  if (value === undefined) return 'undefined'
  return String(value)
}

function valueClass(value: unknown): string {
  if (typeof value === 'string') return 'text-emerald-300'
  if (typeof value === 'number') return 'text-amber-300'
  if (typeof value === 'boolean' || value == null) return 'text-fuchsia-300'
  return 'text-mist-300'
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
      className={`shrink-0 text-mist-500 ${open ? 'rotate-90' : ''}`}
    >
      <path d="M3 1.5 7 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0 text-amber-400">
      <path
        fill="currentColor"
        d="M1.6 3.4A1.4 1.4 0 0 1 3 2h3.1l1.3 1.6H13a1.4 1.4 0 0 1 1.4 1.4v7.2A1.4 1.4 0 0 1 13 13.6H3a1.4 1.4 0 0 1-1.4-1.4V3.4z"
      />
    </svg>
  )
}
