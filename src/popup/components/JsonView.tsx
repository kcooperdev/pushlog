import { prettyJson, tokenizeJson, type JsonToken } from '../../shared/json'

interface JsonViewProps {
  value: unknown
}

export function JsonView({ value }: JsonViewProps) {
  const text = prettyJson(value)
  const tokens = tokenizeJson(text)

  return (
    <pre className="overflow-auto rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-[11px] leading-5 text-mist-300">
      <code>
        {tokens.map((token, index) => (
          <span key={`${token.type}-${index}`} className={tokenClass(token.type)}>
            {token.value}
          </span>
        ))}
      </code>
    </pre>
  )
}

function tokenClass(type: JsonToken['type']): string {
  switch (type) {
    case 'key':
      return 'text-sky-300'
    case 'string':
      return 'text-emerald-300'
    case 'number':
      return 'text-amber-300'
    case 'boolean':
    case 'null':
      return 'text-fuchsia-300'
    default:
      return 'text-mist-400'
  }
}
