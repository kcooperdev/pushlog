export interface JsonToken {
  type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'plain'
  value: string
}

const JSON_TOKEN =
  /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g

export function tokenizeJson(input: string): JsonToken[] {
  const tokens: JsonToken[] = []
  let last = 0

  for (const match of input.matchAll(JSON_TOKEN)) {
    const index = match.index ?? 0
    if (index > last) {
      tokens.push({ type: 'plain', value: input.slice(last, index) })
    }

    const full = match[0]
    const quoted = match[1]
    const keySuffix = match[2]

    if (quoted) {
      tokens.push({ type: keySuffix ? 'key' : 'string', value: quoted })
      if (keySuffix) tokens.push({ type: 'plain', value: keySuffix })
    } else if (full === 'true' || full === 'false') {
      tokens.push({ type: 'boolean', value: full })
    } else if (full === 'null') {
      tokens.push({ type: 'null', value: full })
    } else {
      tokens.push({ type: 'number', value: full })
    }

    last = index + full.length
  }

  if (last < input.length) tokens.push({ type: 'plain', value: input.slice(last) })
  return tokens
}

export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? 'null'
  } catch {
    return '{\n  "_tagflow": "unserializable"\n}'
  }
}
