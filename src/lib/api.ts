export class ApiError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code = 'ERROR') {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json', ...options.headers } : options.headers,
  })
  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:unauthorized'))
  }
  if (!res.ok) {
    let message = 'Что-то пошло не так'
    let code = 'ERROR'
    try {
      const body = (await res.json()) as { error?: { message?: string; code?: string } }
      message = body.error?.message ?? message
      code = body.error?.code ?? code
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, res.status, code)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T = undefined>(path: string) => request<T>(path, { method: 'DELETE' }),
}
