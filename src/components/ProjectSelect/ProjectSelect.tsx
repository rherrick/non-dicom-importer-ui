import { useEffect, useState } from 'react'

interface XnatProject {
  ID: string
  name?: string
  secondary_ID?: string
}

interface XnatProjectsResponse {
  ResultSet?: {
    Result?: XnatProject[]
  }
}

export interface ProjectSelectProps {
  baseUrl: string
  value: string
  onChange: (projectId: string) => void
  id?: string
  className?: string
}

const fieldClasses =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ' +
  'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400'

export function ProjectSelect({ baseUrl, value, onChange, id, className }: ProjectSelectProps) {
  const [projects, setProjects] = useState<XnatProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    fetch(`${baseUrl}/data/projects?format=json`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: ac.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = (await r.json()) as XnatProjectsResponse
        setProjects(data.ResultSet?.Result ?? [])
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Failed to load projects')
        setLoading(false)
      })
    return () => ac.abort()
  }, [baseUrl])

  const placeholder = loading
    ? 'Loading projects…'
    : error
      ? `Error: ${error}`
      : 'Select a project…'

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading || !!error}
      aria-busy={loading || undefined}
      aria-invalid={!!error || undefined}
      className={[fieldClasses, className].filter(Boolean).join(' ')}
    >
      <option value="">{placeholder}</option>
      {projects.map((p) => (
        <option key={p.ID} value={p.ID}>
          {p.name || p.ID}
        </option>
      ))}
    </select>
  )
}
