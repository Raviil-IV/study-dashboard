import { createLogger } from './logger'

const log = createLogger('API')

export interface ApiOptions extends RequestInit {
  json?: unknown
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function dispatchAuthUnauthorized(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'))
  }
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { json, ...fetchOptions } = options

  const fullPath = path.startsWith('/') ? `/api${path}` : path

  log.debug(`request: ${fetchOptions.method ?? 'GET'} ${fullPath}`)

  const res = await fetch(fullPath, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    ...(json !== undefined && { body: JSON.stringify(json) }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = body?.error?.message ?? res.statusText
    const code = body?.error?.code ?? 'UNKNOWN'

    if (res.status === 401) {
      dispatchAuthUnauthorized()
    }

    log.warn('request failed', { status: res.status, code, message })
    throw new ApiError(res.status, code, message)
  }

  log.debug(`request completed: ${res.status}`)

  if (res.status === 204) return undefined as T
  return res.json()
}

function createMethod(method: string) {
  return async <T>(path: string, json?: unknown, options?: Omit<ApiOptions, 'method' | 'json'>): Promise<T> => {
    return request<T>(path, { ...options, method, json })
  }
}

export const api = {
  get: createMethod('GET'),
  post: createMethod('POST'),
  patch: createMethod('PATCH'),
  put: createMethod('PUT'),
  delete: createMethod('DELETE'),
}
