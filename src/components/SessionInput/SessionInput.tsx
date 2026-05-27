export interface SessionInputProps {
  value: string
  onChange: (value: string) => void
  error?: string | null
  id?: string
  className?: string
}

const fieldClasses =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ' +
  'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export function SessionInput({ value, onChange, error, id, className }: SessionInputProps) {
  const errorId = error && id ? `${id}-error` : undefined
  return (
    <div className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error || undefined}
        aria-errormessage={errorId}
        className={fieldClasses}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
