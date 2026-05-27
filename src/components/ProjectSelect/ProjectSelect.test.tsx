import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProjectSelect } from './ProjectSelect'

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

describe('ProjectSelect', () => {
  it('fetches /data/projects on mount and renders the result list', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ResultSet: {
          Result: [
            { ID: 'P1', name: 'Project One' },
            { ID: 'P2', name: 'Project Two' },
          ],
        },
      }),
    )

    render(<ProjectSelect baseUrl="http://server" value="" onChange={vi.fn()} />)

    await screen.findByRole('option', { name: 'Project One' })
    expect(screen.getByRole('option', { name: 'Project Two' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://server/data/projects?format=json',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ Accept: '*/*' }),
      }),
    )
  })

  it('falls back to the ID when the project has no name', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ResultSet: { Result: [{ ID: 'PX' }] } }))
    render(<ProjectSelect baseUrl="" value="" onChange={vi.fn()} />)
    await screen.findByRole('option', { name: 'PX' })
  })

  it('disables the control and shows an error when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }))
    render(<ProjectSelect baseUrl="" value="" onChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('combobox')).toBeDisabled())
    expect(screen.getByRole('option', { name: /error/i })).toBeInTheDocument()
  })

  it('calls onChange with the selected project ID', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ResultSet: { Result: [{ ID: 'P1', name: 'Project One' }] } }),
    )
    const onChange = vi.fn()
    render(<ProjectSelect baseUrl="" value="" onChange={onChange} />)
    await screen.findByRole('option', { name: 'Project One' })

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'P1' } })
    expect(onChange).toHaveBeenCalledWith('P1')
  })
})
