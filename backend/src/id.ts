let n = 0
export function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(++n).toString(36)}`
}
