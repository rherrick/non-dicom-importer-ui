import { useState } from 'react'
import { FileDropZone } from '../src'

export default function App() {
  const [files, setFiles] = useState<File[]>([])

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Non-DICOM Importer</h1>
      <FileDropZone onFiles={setFiles} accept={['.csv', '.json', '.zip']} multiple />
      {files.length > 0 && (
        <ul className="mt-4 space-y-1">
          {files.map((f) => (
            <li key={f.name} className="text-sm text-gray-600">
              {f.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
