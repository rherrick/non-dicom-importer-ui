import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ExperimentSelect } from './ExperimentSelect'

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

describe('ExperimentSelect', () => {
  it('is disabled and does not fetch when projectId is missing', () => {
    render(
      <ExperimentSelect
        baseUrl="http://server"
        projectId=""
        subjectId="S1"
        value=""
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('is disabled and does not fetch when subjectId is missing', () => {
    render(
      <ExperimentSelect
        baseUrl=""
        projectId="P1"
        subjectId=""
        value=""
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches /data/projects/<P>/subjects/<S>/experiments and renders the list', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ResultSet: {
          Result: [
            { ID: 'E1', label: 'Exp-A' },
            { ID: 'E2', label: 'Exp-B' },
          ],
        },
      }),
    )

    render(
      <ExperimentSelect
        baseUrl="http://server"
        projectId="P1"
        subjectId="Subj-A"
        value=""
        onChange={vi.fn()}
      />,
    )

    await screen.findByRole('option', { name: 'Exp-A' })
    expect(screen.getByRole('option', { name: 'Exp-B' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://server/data/projects/P1/subjects/Subj-A/experiments?format=json',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('emits the selected experiment value on change', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ResultSet: { Result: [{ ID: 'E1', label: 'Exp-A' }] } }),
    )
    const onChange = vi.fn()
    render(
      <ExperimentSelect
        baseUrl=""
        projectId="P1"
        subjectId="S1"
        value=""
        onChange={onChange}
      />,
    )
    await screen.findByRole('option', { name: 'Exp-A' })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Exp-A' } })
    expect(onChange).toHaveBeenCalledWith('Exp-A')
  })

  it('shows an error and disables the control when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }))
    render(
      <ExperimentSelect
        baseUrl=""
        projectId="P1"
        subjectId="S1"
        value=""
        onChange={vi.fn()}
      />,
    )
    await waitFor(() => expect(screen.getByRole('combobox')).toBeDisabled())
    expect(screen.getByRole('option', { name: /error/i })).toBeInTheDocument()
  })
})
