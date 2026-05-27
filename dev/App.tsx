import { useState } from 'react'
import {
  ImportForm,
  XnatPicker,
  type ImportFormSubmitData,
  type XnatPickerMode,
  type XnatPickerSelection,
} from '../src'

const MODES: XnatPickerMode[] = [
  'experiment-browse',
  'experiment-create',
  'subject-browse',
  'subject-create',
  'project-browse',
]

const emptySelection: XnatPickerSelection = {
  projectId: null,
  subject: null,
  session: null,
  sessionStatus: 'idle',
}

export default function App() {
  const [lastSubmit, setLastSubmit] = useState<ImportFormSubmitData | null>(null)

  // Dev-tools-only state (only consumed inside the <details> panel below).
  const [pickerMode, setPickerMode] = useState<XnatPickerMode>('experiment-browse')
  const [pickerSelection, setPickerSelection] = useState<XnatPickerSelection>(emptySelection)

  const handleSubmit = (data: ImportFormSubmitData) => {
    setLastSubmit(data)
    console.log('Begin Upload', data)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <h1 className="text-2xl font-bold text-gray-900">Non-DICOM Importer</h1>

      <ImportForm onSubmit={handleSubmit} />

      <details className="rounded-md border border-gray-200 bg-gray-50 text-sm">
        <summary className="cursor-pointer select-none px-3 py-2 font-medium text-gray-700">
          Dev tools
        </summary>
        <div className="space-y-6 border-t border-gray-200 p-4">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-800">
              XnatPicker — standalone mode demo
            </h2>
            <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
              Mode:
              <select
                value={pickerMode}
                onChange={(e) => {
                  setPickerMode(e.target.value as XnatPickerMode)
                  setPickerSelection(emptySelection)
                }}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <XnatPicker key={pickerMode} mode={pickerMode} onChange={setPickerSelection} />
            <pre className="mt-3 overflow-auto rounded bg-white p-3 text-xs text-gray-700">
              {JSON.stringify(pickerSelection, null, 2)}
            </pre>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-800">
              ImportForm — last submission
            </h2>
            <pre className="overflow-auto rounded bg-white p-3 text-xs text-gray-700">
              {lastSubmit
                ? JSON.stringify(
                    { ...lastSubmit, files: lastSubmit.files.map((f) => f.name) },
                    null,
                    2,
                  )
                : '(no submissions yet)'}
            </pre>
          </section>
        </div>
      </details>
    </div>
  )
}
