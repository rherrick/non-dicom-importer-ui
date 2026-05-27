import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SubjectSelect, type SubjectSelection } from './SubjectSelect'

let fetchMock: Mock

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('SubjectSelect', () => {
  it('is disabled and does not fetch when no projectId is provided', () => {
    render(<SubjectSelect baseUrl="http://server" projectId="" onChange={vi.fn()} />)
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('emits a "none" selection while no project is selected', () => {
    const onChange = vi.fn()
    render(<SubjectSelect baseUrl="" projectId="" onChange={onChange} />)
    expect(onChange).toHaveBeenLastCalledWith({ type: 'none' })
  })

  it('fetches subjects from /data/projects/<PROJECT>/subjects and renders them', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ResultSet: {
          Result: [
            { ID: 'XNAT_S001', label: 'Subj-A' },
            { ID: 'XNAT_S002', label: 'Subj-B' },
          ],
        },
      }),
    )
    render(<SubjectSelect baseUrl="http://server" projectId="P1" onChange={vi.fn()} />)
    await screen.findByRole('option', { name: 'Subj-A' })
    expect(screen.getByRole('option', { name: 'Subj-B' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://server/data/projects/P1/subjects?format=json',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('emits an "existing" selection when an existing subject is picked', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ResultSet: { Result: [{ ID: 'S1', label: 'Subj-A' }] } }),
    )
    const onChange = vi.fn()
    render(<SubjectSelect baseUrl="" projectId="P1" onChange={onChange} />)
    await screen.findByRole('option', { name: 'Subj-A' })

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Subj-A' } })

    expect(onChange).toHaveBeenLastCalledWith({ type: 'existing', subjectId: 'Subj-A' })
    expect(screen.queryByLabelText('New subject name')).not.toBeInTheDocument()
  })

  it('marks a typed new-subject label as available when validation returns 404', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ResultSet: { Result: [] } }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))

    const onChange = vi.fn()
    render(<SubjectSelect baseUrl="http://server" projectId="P1" onChange={onChange} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText('New subject name'), {
      target: { value: 'New Subj' },
    })

    await waitFor(
      () =>
        expect(fetchMock).toHaveBeenCalledWith(
          'http://server/data/projects/P1/subjects/New%20Subj',
          expect.anything(),
        ),
      { timeout: 2000 },
    )

    await waitFor(() => {
      const last = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as SubjectSelection
      expect(last).toEqual({ type: 'new', label: 'New Subj', status: 'available' })
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('flags an error when validation returns 200 (subject already exists)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ResultSet: { Result: [] } }))
      .mockResolvedValueOnce(jsonResponse({}, 200))

    render(<SubjectSelect baseUrl="" projectId="P1" onChange={vi.fn()} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText('New subject name'), {
      target: { value: 'Existing' },
    })

    const alert = await screen.findByRole('alert', {}, { timeout: 2000 })
    expect(alert).toHaveTextContent(/already exists/i)
  })

  it('reports an error status when validation returns a non-404 error', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ResultSet: { Result: [] } }))
      .mockResolvedValueOnce(new Response('boom', { status: 500 }))

    const onChange = vi.fn()
    render(<SubjectSelect baseUrl="" projectId="P1" onChange={onChange} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText('New subject name'), { target: { value: 'X' } })

    await waitFor(
      () => {
        const last = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as SubjectSelection
        expect(last).toMatchObject({ type: 'new', status: 'error' })
      },
      { timeout: 2000 },
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not validate/i)
  })

  it('resets to new-subject mode when the project changes', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ ResultSet: { Result: [{ ID: 'S1', label: 'Subj-A' }] } }),
      )
      .mockResolvedValueOnce(jsonResponse({ ResultSet: { Result: [] } }))

    const { rerender } = render(
      <SubjectSelect baseUrl="" projectId="P1" onChange={vi.fn()} />,
    )
    await screen.findByRole('option', { name: 'Subj-A' })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Subj-A' } })
    expect(screen.queryByLabelText('New subject name')).not.toBeInTheDocument()

    rerender(<SubjectSelect baseUrl="" projectId="P2" onChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByLabelText('New subject name')).toBeInTheDocument()
    })
  })

  it('shows an error when the subjects list request fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }))
    render(<SubjectSelect baseUrl="" projectId="P1" onChange={vi.fn()} />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/failed to load subjects/i)
  })

  it('hides "New subject…" and the input box when allowNewSubject is false', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ResultSet: { Result: [{ ID: 'S1', label: 'Subj-A' }] } }),
    )
    const onChange = vi.fn()
    render(
      <SubjectSelect
        baseUrl=""
        projectId="P1"
        onChange={onChange}
        allowNewSubject={false}
      />,
    )
    await screen.findByRole('option', { name: 'Subj-A' })

    expect(screen.queryByRole('option', { name: /new subject/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('New subject name')).not.toBeInTheDocument()

    // Until a subject is picked the selection is "none"; once chosen it's "existing".
    expect(onChange).toHaveBeenLastCalledWith({ type: 'none' })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Subj-A' } })
    expect(onChange).toHaveBeenLastCalledWith({ type: 'existing', subjectId: 'Subj-A' })
  })
})
