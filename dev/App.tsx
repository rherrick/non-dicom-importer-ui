import { ImportForm, type ImportFormSubmitData } from '../src'

// Set VITE_XNAT_BASE_URL in .env.local (e.g. http://localhost:8080) or leave empty
// to use same-origin requests against an XNAT instance that serves this app.
const baseUrl = (import.meta.env.VITE_XNAT_BASE_URL as string | undefined) ?? ''

export default function App() {
  const handleSubmit = (data: ImportFormSubmitData) => {
    console.log('Begin Upload', data)
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Non-DICOM Importer</h1>
      <ImportForm baseUrl={baseUrl} onSubmit={handleSubmit} />
    </div>
  )
}
