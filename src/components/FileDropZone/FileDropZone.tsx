import { useState, useCallback } from 'react'

export interface FileDropZoneProps {
  onFiles: (files: File[]) => void
  accept?: string[]
  multiple?: boolean
  className?: string
}

export function FileDropZone({ onFiles, accept, multiple = false, className }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const dropped = Array.from(e.dataTransfer.files)
      onFiles(multiple ? dropped : dropped.slice(0, 1))
    },
    [onFiles, multiple],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onFiles(Array.from(e.target.files))
      }
    },
    [onFiles],
  )

  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors duration-200',
        isDragging
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-gray-300 bg-white text-gray-500 hover:border-gray-400',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <p className="mb-2 text-sm font-medium">
        Drop files here or{' '}
        <label className="cursor-pointer text-blue-600 hover:underline">
          browse
          <input
            data-testid="file-input"
            type="file"
            className="sr-only"
            multiple={multiple}
            accept={accept?.join(',')}
            onChange={handleChange}
          />
        </label>{' '}
        to import non-DICOM data
      </p>
      {accept && <p className="text-xs text-gray-400">Accepted: {accept.join(', ')}</p>}
    </div>
  )
}
