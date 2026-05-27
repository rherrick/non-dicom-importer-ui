import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('calls validate when the user presses Enter and prevents form submission', async () => {
    const validate = vi.fn().mockResolvedValue('available')
    render(<SessionInput value="MySession" onChange={vi.fn()} validate={validate} />)

    // fireEvent returns false when the event's default was prevented.
    const notPrevented = fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(notPrevented).toBe(false)

    await waitFor(() =>
      expect(validate).toHaveBeenCalledWith('MySession', expect.any(AbortSignal)),
    )
  })

  it('does not validate on keys other than Enter', async () => {
    const validate = vi.fn().mockResolvedValue('available')
    render(<SessionInput value="MySession" onChange={vi.fn()} validate={validate} />)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'a' })
    await Promise.resolve()
    expect(validate).not.toHaveBeenCalled()
  })

  it('calls validate on blur with the value and an AbortSignal', async () => {
    const validate = vi.fn().mockResolvedValue('available')
    const onValidationChange = vi.fn()
    render(
      <SessionInput
        value="MySession"
        onChange={vi.fn()}
        validate={validate}
        onValidationChange={onValidationChange}
      />,
    )

    fireEvent.blur(screen.getByRole('textbox'))

    await waitFor(() =>
      expect(validate).toHaveBeenCalledWith('MySession', expect.any(AbortSignal)),
    )
    await waitFor(() => expect(onValidationChange).toHaveBeenCalledWith('available'))
    expect(onValidationChange).toHaveBeenCalledWith('checking')
  })

  it('shows the "already exists" message when validate returns "taken"', async () => {
    const validate = vi.fn().mockResolvedValue('taken')
    render(<SessionInput value="Existing" onChange={vi.fn()} validate={validate} id="sess" />)
    fireEvent.blur(screen.getByRole('textbox'))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/already exists/i)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-errormessage', 'sess-error')
  })

  it('shows a generic error when validate returns "error"', async () => {
    const validate = vi.fn().mockResolvedValue('error')
    render(<SessionInput value="X" onChange={vi.fn()} validate={validate} />)
    fireEvent.blur(screen.getByRole('textbox'))

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not validate/i)
  })

  it('treats a thrown validate as a generic error', async () => {
    const validate = vi.fn().mockRejectedValue(new Error('network'))
    render(<SessionInput value="X" onChange={vi.fn()} validate={validate} />)
    fireEvent.blur(screen.getByRole('textbox'))

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not validate/i)
  })

  it('does not call validate when the value is empty', () => {
    const validate = vi.fn().mockResolvedValue('available')
    render(<SessionInput value="" onChange={vi.fn()} validate={validate} />)
    fireEvent.blur(screen.getByRole('textbox'))
    expect(validate).not.toHaveBeenCalled()
  })

  it('does not throw on blur when no validate is provided', () => {
    render(<SessionInput value="X" onChange={vi.fn()} />)
    expect(() => fireEvent.blur(screen.getByRole('textbox'))).not.toThrow()
  })

  it('resets validation status to idle when the value changes', async () => {
    const validate = vi.fn().mockResolvedValue('available')
    const onValidationChange = vi.fn()
    const { rerender } = render(
      <SessionInput
        value="MySession"
        onChange={vi.fn()}
        validate={validate}
        onValidationChange={onValidationChange}
      />,
    )

    fireEvent.blur(screen.getByRole('textbox'))
    await waitFor(() => expect(onValidationChange).toHaveBeenCalledWith('available'))

    onValidationChange.mockClear()
    rerender(
      <SessionInput
        value="MySession2"
        onChange={vi.fn()}
        validate={validate}
        onValidationChange={onValidationChange}
      />,
    )

    await waitFor(() => expect(onValidationChange).toHaveBeenCalledWith('idle'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
