import { useState } from 'react'
import { FileDropZone } from '../FileDropZone'
import { XnatPicker, type XnatPickerSelection } from '../XnatPicker'

export interface ImportFormSubmitData {
  projectId: string
  subjectId: string | null
  newSubjectLabel: string | null
  session: string
  files: File[]
}

export interface ImportFormProps {
  /** XNAT server root. Empty string (default) targets the same origin. */
  baseUrl?: string
  onSubmit: (data: ImportFormSubmitData) => void
  className?: string
}

const emptySelection: XnatPickerSelection = {
  projectId: null,
  subject: null,
  session: null,
}

export function ImportForm({ baseUrl = '', onSubmit, className }: ImportFormProps) {
  const [selection, setSelection] = useState<XnatPickerSelection>(emptySelection)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSelectionChange = (next: XnatPickerSelection) => {
    if (next.session !== selection.session) setSessionError(null)
    setSelection(next)
  }

  const subjectReady =
    selection.subject?.kind === 'existing' ||
    (selection.subject?.kind === 'new' &&
      selection.subject.label !== '' &&
      selection.subject.status === 'available')

  const sessionLabel = (selection.session ?? '').trim()

  const canSubmit =
    !isSubmitting &&
    !!selection.projectId &&
    subjectReady &&
    sessionLabel !== '' &&
    files.length > 0

  const handleSubmit = async () => {
    if (!canSubmit || !selection.projectId || !selection.subject) return
    setIsSubmitting(true)
    setSessionError(null)

    const subjectIdentifier =
      selection.subject.kind === 'existing' ? selection.subject.subjectId : selection.subject.label

    const url =
      `${baseUrl}/data/projects/${encodeURIComponent(selection.projectId)}` +
      `/subjects/${encodeURIComponent(subjectIdentifier)}` +
      `/experiments/${encodeURIComponent(sessionLabel)}?format=json`

    try {
      const r = await fetch(url, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      if (r.status === 404) {
        onSubmit({
          projectId: selection.projectId,
          subjectId:
            selection.subject.kind === 'existing' ? selection.subject.subjectId : null,
          newSubjectLabel:
            selection.subject.kind === 'new' ? selection.subject.label : null,
          session: sessionLabel,
          files,
        })
      } else if (r.ok) {
        setSessionError(`A session named "${sessionLabel}" already exists.`)
      } else {
        setSessionError('Could not validate session name.')
      }
    } catch {
      setSessionError('Could not validate session name.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={['flex flex-col gap-4', className].filter(Boolean).join(' ')}>
      <p className="text-sm text-gray-700">
        Drag and drop a{' '}
        <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">.zip</code>,{' '}
        <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">.tar.gz</code>, or{' '}
        <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">.tgz</code> file onto
        the drop zone below to import non-DICOM data.
      </p>

      <XnatPicker
        baseUrl={baseUrl}
        mode="experiment-create"
        onChange={handleSelectionChange}
        sessionError={sessionError}
      />

      <FileDropZone onFiles={setFiles} accept={['.zip', '.tar.gz', '.tgz']} />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
      >
        {isSubmitting ? 'Validating…' : 'Begin Upload'}
      </button>
    </div>
  )
}
