export class PortalApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'PortalApiError'
    this.status = status
  }
}

export function isPortalApiError(e: unknown): e is PortalApiError {
  return e instanceof PortalApiError
}
