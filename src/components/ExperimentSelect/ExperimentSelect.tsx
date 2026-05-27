import { useEffect, useState } from 'react'

interface XnatExperiment {
  ID: string
  label?: string
}

interface XnatExperimentsResponse {
  ResultSet?: {
    Result?: XnatExperiment[]
  }
}

export interface ExperimentSelectProps {
  baseUrl: string
  /** Empty string disables the control. */
  projectId: string
  /** Empty string disables the control. */
  subjectId: string
  value: string
  onChange: (experimentId: string) => void
  id?: string
  className?: string
}

const fieldClasses =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ' +
  'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400'

export function ExperimentSelect({
  baseUrl,
  projectId,
  subjectId,
  value,
  onChange,
  id,
  className,
}: ExperimentSelectProps) {
  const [experiments, setExperiments] = useState<XnatExperiment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disabled = !projectId || !subjectId

  useEffect(() => {
    if (disabled) {
      setExperiments([])
      setLoading(false)
      setError(null)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    fetch(
      `${baseUrl}/data/projects/${encodeURIComponent(projectId)}/subjects/${encodeURIComponent(subjectId)}/experiments?format=json`,
      {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: ac.signal,
      },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = (await r.json()) as XnatExperimentsResponse
        setExperiments(data.ResultSet?.Result ?? [])
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Failed to load experiments')
        setLoading(false)
      })
    return () => ac.abort()
  }, [baseUrl, projectId, subjectId, disabled])

  const placeholder = disabled
    ? !projectId
      ? 'Select a project first'
      : 'Select a subject first'
    : loading
      ? 'Loading sessions…'
      : error
        ? `Error: ${error}`
        : 'Select a session…'

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading || !!error}
      aria-busy={loading || undefined}
      aria-invalid={!!error || undefined}
      className={[fieldClasses, className].filter(Boolean).join(' ')}
    >
      <option value="">{placeholder}</option>
      {experiments.map((e) => (
        <option key={e.ID} value={e.label || e.ID}>
          {e.label || e.ID}
        </option>
      ))}
    </select>
  )
}
