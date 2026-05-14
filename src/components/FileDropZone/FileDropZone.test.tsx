import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileDropZone } from './FileDropZone'

describe('FileDropZone', () => {
  it('renders drop zone text', () => {
    render(<FileDropZone onFiles={vi.fn()} />)
    expect(screen.getByText(/drop files here/i)).toBeInTheDocument()
  })

  it('shows accepted file types when provided', () => {
    render(<FileDropZone onFiles={vi.fn()} accept={['.csv', '.json']} />)
    expect(screen.getByText(/accepted: \.csv, \.json/i)).toBeInTheDocument()
  })

  it('calls onFiles with selected file', async () => {
    const onFiles = vi.fn()
    const user = userEvent.setup()
    render(<FileDropZone onFiles={onFiles} />)

    const file = new File(['content'], 'test.csv', { type: 'text/csv' })
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await user.upload(input, file)

    expect(onFiles).toHaveBeenCalledWith([file])
  })

  it('limits to one file when multiple is false', async () => {
    const onFiles = vi.fn()
    const user = userEvent.setup()
    render(<FileDropZone onFiles={onFiles} multiple={false} />)

    const files = [
      new File(['a'], 'a.csv', { type: 'text/csv' }),
      new File(['b'], 'b.csv', { type: 'text/csv' }),
    ]
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await user.upload(input, files)

    expect(onFiles).toHaveBeenCalledWith([files[0]])
  })

  it('applies drag-active styles on dragover', () => {
    render(<FileDropZone onFiles={vi.fn()} />)
    const zone = screen.getByText(/drop files here/i).closest('div')!
    fireEvent.dragOver(zone)
    expect(zone.className).toContain('border-blue-500')
  })

  it('clears drag-active styles on dragleave', () => {
    render(<FileDropZone onFiles={vi.fn()} />)
    const zone = screen.getByText(/drop files here/i).closest('div')!
    fireEvent.dragOver(zone)
    fireEvent.dragLeave(zone)
    expect(zone.className).toContain('border-gray-300')
  })

  it('calls onFiles when files are dropped', () => {
    const onFiles = vi.fn()
    render(<FileDropZone onFiles={onFiles} multiple />)
    const zone = screen.getByText(/drop files here/i).closest('div')!

    const files = [new File(['a'], 'a.csv', { type: 'text/csv' })]
    fireEvent.drop(zone, { dataTransfer: { files } })

    expect(onFiles).toHaveBeenCalledWith(files)
  })

  it('limits dropped files to one when multiple is false', () => {
    const onFiles = vi.fn()
    render(<FileDropZone onFiles={onFiles} multiple={false} />)
    const zone = screen.getByText(/drop files here/i).closest('div')!

    const files = [
      new File(['a'], 'a.csv', { type: 'text/csv' }),
      new File(['b'], 'b.csv', { type: 'text/csv' }),
    ]
    fireEvent.drop(zone, { dataTransfer: { files } })

    expect(onFiles).toHaveBeenCalledWith([files[0]])
  })
})
