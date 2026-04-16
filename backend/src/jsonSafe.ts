/**
 * mysql2 can return BIGINT / DECIMAL as `bigint`, which `JSON.stringify` cannot serialize
 * (throws → Fastify 500 on /bootstrap). Normalize for JSON responses.
 */
export function jsonSafeDeep<T>(value: T): T {
  return walk(value) as T
}

function walk(x: unknown): unknown {
  if (typeof x === 'bigint') return x.toString()
  if (x instanceof Buffer) return x.toString('base64')
  if (x == null) return x
  if (typeof x !== 'object') return x
  if (x instanceof Date) return x.toISOString()
  if (Array.isArray(x)) return x.map(walk)
  const o: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    o[k] = walk(v)
  }
  return o
}
