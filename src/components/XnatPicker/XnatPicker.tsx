import { useEffect, useId, useRef, useState } from 'react'
import { ProjectSelect } from '../ProjectSelect'
import { SubjectSelect, type SubjectSelection } from '../SubjectSelect'
import { ExperimentSelect } from '../ExperimentSelect'
import { SessionInput } from '../SessionInput'

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
}

export interface XnatPickerProps {
  /** XNAT server root. Empty string (default) targets the same origin. */
  baseUrl?: string
  /** Picker mode. Default: `'experiment-browse'`. */
  mode?: XnatPickerMode
  onChange?: (selection: XnatPickerSelection) => void
  /** External error shown on the session control, e.g. when a parent validates session creation on submit. */
  sessionError?: string | null
  className?: string
}

export function XnatPicker({
  baseUrl = '',
  mode = 'experiment-browse',
  onChange,
  sessionError,
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

  const subjectIdentifier =
    subjectSelection.type === 'existing' ? subjectSelection.subjectId : ''

  // Reset the session when the project or selected subject changes.
  useEffect(() => {
    setSession('')
  }, [projectId, subjectIdentifier])

  // Reset state when the mode changes — different modes have different valid selections.
  useEffect(() => {
    setSession('')
  }, [mode])

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
    })
  }, [projectId, subjectSelection, session, showSubject, showSession])

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
              error={sessionError}
            />
          )}
        </div>
      )}
    </div>
  )
}
