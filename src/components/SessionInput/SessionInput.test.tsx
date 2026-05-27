import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SessionInput } from './SessionInput'

describe('SessionInput', () => {
  it('renders the current value and emits changes', () => {
    const onChange = vi.fn()
    render(<SessionInput value="Initial" onChange={onChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('Initial')

    fireEvent.change(input, { target: { value: 'Updated' } })
    expect(onChange).toHaveBeenCalledWith('Updated')
  })

  it('shows an error message and marks the input invalid when error is set', () => {
    render(
      <SessionInput value="Foo" onChange={vi.fn()} error="Session already exists" id="sess" />,
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-errormessage', 'sess-error')

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Session already exists')
    expect(alert).toHaveAttribute('id', 'sess-error')
  })

  it('omits the error region when there is no error', () => {
    render(<SessionInput value="" onChange={vi.fn()} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid')
  })
})
