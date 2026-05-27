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
  sessionStatus: 'idle',
}

export function ImportForm({ baseUrl = '', onSubmit, className }: ImportFormProps) {
  const [selection, setSelection] = useState<XnatPickerSelection>(emptySelection)
  const [files, setFiles] = useState<File[]>([])

  const subjectReady =
    selection.subject?.kind === 'existing' ||
    (selection.subject?.kind === 'new' &&
      selection.subject.label !== '' &&
      selection.subject.status === 'available')

  const sessionLabel = (selection.session ?? '').trim()

  const canSubmit =
    !!selection.projectId &&
    subjectReady &&
    sessionLabel !== '' &&
    selection.sessionStatus === 'available' &&
    files.length > 0

  const handleSubmit = () => {
    if (!canSubmit || !selection.projectId || !selection.subject) return
    onSubmit({
      projectId: selection.projectId,
      subjectId: selection.subject.kind === 'existing' ? selection.subject.subjectId : null,
      newSubjectLabel: selection.subject.kind === 'new' ? selection.subject.label : null,
      session: sessionLabel,
      files,
    })
  }

  return (
    <div className={['flex flex-col gap-4', className].filter(Boolean).join(' ')}>
      <XnatPicker baseUrl={baseUrl} mode="experiment-create" onChange={setSelection} />

      <FileDropZone onFiles={setFiles} accept={['.zip', '.tar.gz', '.tgz']} />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
      >
        Begin Upload
      </button>
    </div>
  )
}
