import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export type SessionValidationStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'error'

export type SessionValidateResult = 'available' | 'taken' | 'error'

export interface SessionInputProps {
  value: string
  onChange: (value: string) => void
  /**
   * When provided, the value is validated when the input loses focus.
   * Receives an AbortSignal that fires if validation is superseded by a
   * subsequent blur or the value changes mid-flight.
   */
  validate?: (value: string, signal: AbortSignal) => Promise<SessionValidateResult>
  /** Called whenever the validation status transitions. */
  onValidationChange?: (status: SessionValidationStatus) => void
  id?: string
  className?: string
}

const fieldClasses =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ' +
  'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

export function SessionInput({
  value,
  onChange,
  validate,
  onValidationChange,
  id,
  className,
}: SessionInputProps) {
  const [status, setStatus] = useState<SessionValidationStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const onValidationChangeRef = useRef(onValidationChange)
  useEffect(() => {
    onValidationChangeRef.current = onValidationChange
  })

  const acRef = useRef<AbortController | null>(null)

  // Reset status when the value changes or the validator itself changes —
  // any prior result no longer applies. (Callers should memoize `validate`.)
  useEffect(() => {
    setStatus('idle')
    setMessage(null)
    return () => {
      acRef.current?.abort()
    }
  }, [value, validate])

  // Notify parent of status changes.
  useEffect(() => {
    onValidationChangeRef.current?.(status)
  }, [status])

  const runValidation = async () => {
    if (!validate) return
    const trimmed = value.trim()
    if (!trimmed) return

    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac

    setStatus('checking')
    setMessage(null)

    try {
      const result = await validate(value, ac.signal)
      if (ac.signal.aborted) return
      setStatus(result)
      if (result === 'taken') {
        setMessage(`A session named "${trimmed}" already exists.`)
      } else if (result === 'error') {
        setMessage('Could not validate session name.')
      } else {
        setMessage(null)
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setStatus('error')
      setMessage('Could not validate session name.')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Don't let Enter submit any enclosing form — we want to validate in place.
      e.preventDefault()
      void runValidation()
    }
  }

  const errorId = message && id ? `${id}-error` : undefined

  return (
    <div className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={runValidation}
        onKeyDown={handleKeyDown}
        aria-invalid={!!message || undefined}
        aria-errormessage={errorId}
        className={fieldClasses}
      />
      {message && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {message}
        </p>
      )}
    </div>
  )
}
