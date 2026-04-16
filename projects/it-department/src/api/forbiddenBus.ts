/** Dispatched when a live API call returns 403 so the shell can align with PageGuard UX. */

type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeApiForbidden(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyApiForbidden(): void {
  listeners.forEach((fn) => fn())
}
