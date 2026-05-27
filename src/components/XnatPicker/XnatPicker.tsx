import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ProjectSelect } from '../ProjectSelect'
import { SubjectSelect, type SubjectSelection } from '../SubjectSelect'
import { ExperimentSelect } from '../ExperimentSelect'
import {
  SessionInput,
  type SessionValidateResult,
  type SessionValidationStatus,
} from '../SessionInput'

export type XnatPickerMode =
  | 'experiment-browse'
  | 'experiment-create'
  | 'subject-browse'
  | 'subject-create'
  | 'project-browse'

export type XnatSubjectValue =
  | { kind: 'existing'; subjectId: string }
  | {
      kind: 'new'
      label: string
      status: 'idle' | 'checking' | 'available' | 'taken' | 'error'
    }

export interface XnatPickerSelection {
  /** Selected project ID, or null if none. */
  projectId: string | null
  /**
   * Selected subject. Always null in `project-browse` mode. In browse modes the kind
   * is always `'existing'`; in create modes it may be `'existing'` or `'new'`.
   */
  subject: XnatSubjectValue | null
  /**
   * In `experiment-browse` mode this is the selected experiment ID/label.
   * In `experiment-create` mode this is the label the user has typed.
   * Null in all other modes, or when nothing has been selected/entered yet.
   */
  session: string | null
  /**
   * Status of the typed session label in `experiment-create` mode (updated on
   * blur). `'idle'` in all other modes and before the user has blurred away
   * from a non-empty value.
   */
  sessionStatus: SessionValidationStatus
}

export interface XnatPickerProps {
  /** XNAT server root. Empty string (default) targets the same origin. */
  baseUrl?: string
  /** Picker mode. Default: `'experiment-browse'`. */
  mode?: XnatPickerMode
  onChange?: (selection: XnatPickerSelection) => void
  className?: string
}

export function XnatPicker({
  baseUrl = '',
  mode = 'experiment-browse',
  onChange,
  className,
}: XnatPickerProps) {
  const projectSelectId = useId()
  const subjectSelectId = useId()
  const sessionInputId = useId()

  const showSubject = mode !== 'project-browse'
  const showSession = mode === 'experiment-browse' || mode === 'experiment-create'
  const allowNewSubject = mode === 'subject-create' || mode === 'experiment-create'
  const sessionIsBrowse = mode === 'experiment-browse'

  const [projectId, setProjectId] = useState('')
  const [subjectSelection, setSubjectSelection] = useState<SubjectSelection>({ type: 'none' })
  const [session, setSession] = useState('')
  const [sessionStatus, setSessionStatus] = useState<SessionValidationStatus>('idle')

  // For ExperimentSelect (browse mode) — only meaningful with an existing subject.
  const subjectIdentifier =
    subjectSelection.type === 'existing' ? subjectSelection.subjectId : ''

  // For session-label validation (create mode) — either an existing subject ID
  // or a typed new-subject label. When the new subject doesn't exist yet the
  // URL trivially returns 404, which correctly reports the session as free.
  const subjectForValidation =
    subjectSelection.type === 'existing'
      ? subjectSelection.subjectId
      : subjectSelection.type === 'new'
        ? subjectSelection.label.trim()
        : ''

  // Treat subject-identity changes coarsely so the session doesn't reset on
  // every keystroke in the new-subject label.
  const subjectKey =
    subjectSelection.type === 'existing'
      ? `existing:${subjectSelection.subjectId}`
      : subjectSelection.type === 'new'
        ? 'new'
        : 'none'

  // Reset the session when the project/mode/subject-kind changes.
  useEffect(() => {
    setSession('')
    setSessionStatus('idle')
  }, [projectId, mode, subjectKey])

  // Build the session validator. Only active in experiment-create when there
  // is enough context to construct the URL; SessionInput treats `undefined`
  // as "no validation."
  const validateSession = useMemo<
    ((value: string, signal: AbortSignal) => Promise<SessionValidateResult>) | undefined
  >(() => {
    if (mode !== 'experiment-create' || !projectId || !subjectForValidation) return undefined
    return async (value, signal) => {
      const url =
        `${baseUrl}/data/projects/${encodeURIComponent(projectId)}` +
        `/subjects/${encodeURIComponent(subjectForValidation)}` +
        `/experiments/${encodeURIComponent(value.trim())}?format=json`
      const r = await fetch(url, {
        credentials: 'include',
        headers: { Accept: '*/*' },
        signal,
      })
      if (r.status === 404) return 'available'
      if (r.ok) return 'taken'
      return 'error'
    }
  }, [baseUrl, projectId, subjectForValidation, mode])

  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // Emit unified selection to the parent.
  useEffect(() => {
    const subjectValue: XnatSubjectValue | null = !showSubject
      ? null
      : subjectSelection.type === 'existing'
        ? { kind: 'existing', subjectId: subjectSelection.subjectId }
        : subjectSelection.type === 'new'
          ? {
              kind: 'new',
              label: subjectSelection.label,
              status: subjectSelection.status,
            }
          : null

    onChangeRef.current?.({
      projectId: projectId || null,
      subject: subjectValue,
      session: showSession ? session || null : null,
      sessionStatus,
    })
  }, [projectId, subjectSelection, session, sessionStatus, showSubject, showSession])

  return (
    <div className={['flex flex-col gap-4', className].filter(Boolean).join(' ')}>
      <div className="flex flex-col gap-1">
        <label htmlFor={projectSelectId} className="text-sm font-medium text-gray-700">
          Project:
        </label>
        <ProjectSelect
          baseUrl={baseUrl}
          value={projectId}
          onChange={setProjectId}
          id={projectSelectId}
        />
      </div>

      {showSubject && (
        <div className="flex flex-col gap-1">
          <label htmlFor={subjectSelectId} className="text-sm font-medium text-gray-700">
            Subject:
          </label>
          <SubjectSelect
            baseUrl={baseUrl}
            projectId={projectId}
            allowNewSubject={allowNewSubject}
            onChange={setSubjectSelection}
            selectId={subjectSelectId}
          />
        </div>
      )}

      {showSession && (
        <div className="flex flex-col gap-1">
          <label htmlFor={sessionInputId} className="text-sm font-medium text-gray-700">
            Session:
          </label>
          {sessionIsBrowse ? (
            <ExperimentSelect
              baseUrl={baseUrl}
              projectId={projectId}
              subjectId={subjectIdentifier}
              value={session}
              onChange={setSession}
              id={sessionInputId}
            />
          ) : (
            <SessionInput
              id={sessionInputId}
              value={session}
              onChange={setSession}
              validate={validateSession}
              onValidationChange={setSessionStatus}
            />
          )}
        </div>
      )}
    </div>
  )
}
