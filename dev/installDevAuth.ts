/**
 * Dev-only: wrap globalThis.fetch so requests targeting the configured XNAT
 * server carry a Basic auth header built from VITE_XNAT_USERNAME / VITE_XNAT_PASSWORD.
 *
 * This is for local development against a remote XNAT instance. In production
 * the host (XNAT web app or Electron shell) supplies the session via cookies
 * or platform-level auth — the library itself knows nothing about credentials.
 */
export function installDevAuth(config: {
  baseUrl?: string
  username?: string
  password?: string
}): void {
  const { baseUrl, username, password } = config
  if (!username || !password) return

  const authHeader = `Basic ${btoa(`${username}:${password}`)}`
  const originalFetch = globalThis.fetch.bind(globalThis)

  globalThis.fetch = (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url

    // Only attach to requests aimed at the configured XNAT server. If no
    // base URL is set, treat relative URLs (same-origin) as in-scope.
    const inScope = baseUrl ? url.startsWith(baseUrl) : !/^https?:/i.test(url)
    if (!inScope) return originalFetch(input, init)

    const headers = new Headers(init?.headers)
    if (!headers.has('Authorization')) headers.set('Authorization', authHeader)
    return originalFetch(input, { ...init, headers })
  }

  console.info(
    `[dev] Attached Basic auth to XNAT requests (${baseUrl || 'same-origin'}) as "${username}"`,
  )
}
