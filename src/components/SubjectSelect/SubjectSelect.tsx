import { useEffect, useRef, useState } from 'react'

interface XnatSubject {
  ID: string
  label?: string
}

interface XnatSubjectsResponse {
  ResultSet?: {
    Result?: XnatSubject[]
  }
}

const NEW_SUBJECT_VALUE = '__new__'
const VALIDATION_DEBOUNCE_MS = 300

export type SubjectSelection =
  | { type: 'none' }
  | { type: 'existing'; subjectId: string }
  | {
      type: 'new'
      label: string
      status: 'idle' | 'checking' | 'available' | 'taken' | 'error'
    }

export interface SubjectSelectProps {
  baseUrl: string
  /** Empty string disables the control. */
  projectId: string
  onChange: (selection: SubjectSelection) => void
  /** When false, the "New subject…" option and its text box are hidden and no validation is performed. Default: true. */
  allowNewSubject?: boolean
  selectId?: string
  className?: string
}

const fieldClasses =
  'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ' +
  'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ' +
  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400'

export function SubjectSelect({
  baseUrl,
  projectId,
  onChange,
  allowNewSubject = true,
  selectId,
  className,
}: SubjectSelectProps) {
  const defaultValue = allowNewSubject ? NEW_SUBJECT_VALUE : ''
  const [selectValue, setSelectValue] = useState<string>(defaultValue)
  const [newSubjectLabel, setNewSubjectLabel] = useState('')
  const [subjects, setSubjects] = useState<XnatSubject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [subjectsError, setSubjectsError] = useState<string | null>(null)
  const [validationStatus, setValidationStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'error'
  >('idle')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  // Hold the latest onChange in a ref so the notify-parent effect doesn't depend on it.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  const isNewSubject = allowNewSubject && selectValue === NEW_SUBJECT_VALUE
  const trimmedLabel = newSubjectLabel.trim()
  const disabled = !projectId

  // Reset selection when the project or allowNewSubject mode changes.
  useEffect(() => {
    setSelectValue(allowNewSubject ? NEW_SUBJECT_VALUE : '')
    setNewSubjectLabel('')
    setValidationStatus('idle')
    setValidationMessage(null)
  }, [projectId, allowNewSubject])

  // Notify parent of selection changes.
  useEffect(() => {
    let next: SubjectSelection
    if (!projectId) {
      next = { type: 'none' }
    } else if (isNewSubject) {
      next = { type: 'new', label: trimmedLabel, status: validationStatus }
    } else if (selectValue) {
      next = { type: 'existing', subjectId: selectValue }
    } else {
      next = { type: 'none' }
    }
    onChangeRef.current(next)
  }, [projectId, isNewSubject, selectValue, trimmedLabel, validationStatus])

  // Fetch subjects when the project changes.
  useEffect(() => {
    if (!projectId) {
      setSubjects([])
      setSubjectsError(null)
      setSubjectsLoading(false)
      return
    }
    const ac = new AbortController()
    setSubjectsLoading(true)
    setSubjectsError(null)
    fetch(
      `${baseUrl}/data/projects/${encodeURIComponent(projectId)}/subjects?format=json`,
      {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: ac.signal,
      },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = (await r.json()) as XnatSubjectsResponse
        setSubjects(data.ResultSet?.Result ?? [])
        setSubjectsLoading(false)
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setSubjectsError(e instanceof Error ? e.message : 'Failed to load subjects')
        setSubjectsLoading(false)
      })
    return () => ac.abort()
  }, [baseUrl, projectId])

  // Debounced validation of a typed new-subject label.
  useEffect(() => {
    if (!isNewSubject || !projectId || !trimmedLabel) {
      setValidationStatus('idle')
      setValidationMessage(null)
      return
    }

    setValidationStatus('checking')
    setValidationMessage(null)
    const ac = new AbortController()
    const timer = setTimeout(() => {
      fetch(
        `${baseUrl}/data/projects/${encodeURIComponent(projectId)}/subjects/${encodeURIComponent(trimmedLabel)}`,
        {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: ac.signal,
        },
      )
        .then((r) => {
          if (r.status === 404) {
            setValidationStatus('available')
            setValidationMessage(null)
          } else if (r.ok) {
            setValidationStatus('taken')
            setValidationMessage(`A subject named "${trimmedLabel}" already exists.`)
          } else {
            setValidationStatus('error')
            setValidationMessage('Could not validate subject name.')
          }
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return
          setValidationStatus('error')
          setValidationMessage('Could not validate subject name.')
        })
    }, VALIDATION_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      ac.abort()
    }
  }, [baseUrl, projectId, isNewSubject, trimmedLabel])

  const placeholderLabel = disabled
    ? 'Select a project first'
    : subjectsLoading
      ? 'Loading subjects…'
      : allowNewSubject
        ? 'New subject…'
        : 'Select a subject…'

  return (
    <div className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}>
      <div className="flex gap-2">
        <select
          id={selectId}
          value={selectValue}
          onChange={(e) => setSelectValue(e.target.value)}
          disabled={disabled || subjectsLoading}
          aria-busy={subjectsLoading || undefined}
          aria-invalid={!!subjectsError || undefined}
          className={`${fieldClasses} flex-1`}
        >
          <option value={defaultValue}>{placeholderLabel}</option>
          {subjects.map((s) => (
            <option key={s.ID} value={s.label || s.ID}>
              {s.label || s.ID}
            </option>
          ))}
        </select>
        {isNewSubject && !disabled && (
          <input
            type="text"
            value={newSubjectLabel}
            onChange={(e) => setNewSubjectLabel(e.target.value)}
            placeholder="New subject name"
            aria-label="New subject name"
            aria-invalid={
              validationStatus === 'taken' || validationStatus === 'error' || undefined
            }
            className={`${fieldClasses} flex-1`}
          />
        )}
      </div>
      {subjectsError && (
        <p role="alert" className="text-xs text-red-600">
          Failed to load subjects: {subjectsError}
        </p>
      )}
      {validationMessage && (
        <p role="alert" className="text-xs text-red-600">
          {validationMessage}
        </p>
      )}
    </div>
  )
}
