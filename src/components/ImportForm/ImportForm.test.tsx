import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ImportForm } from './ImportForm'

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

const projectsResponse = () =>
  jsonResponse({ ResultSet: { Result: [{ ID: 'P1', name: 'Project One' }] } })

const subjectsResponse = () =>
  jsonResponse({ ResultSet: { Result: [{ ID: 'S1', label: 'Subj-A' }] } })

function makeFile(name = 'data.zip') {
  return new File(['x'], name, { type: 'application/zip' })
}

describe('ImportForm', () => {
  it('renders the instruction text and all controls', async () => {
    fetchMock.mockResolvedValueOnce(projectsResponse())
    render(<ImportForm baseUrl="http://server" onSubmit={vi.fn()} />)
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Project:')).toBeInTheDocument()
    expect(screen.getByLabelText('Subject:')).toBeInTheDocument()
    expect(screen.getByLabelText('Session:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /begin upload/i })).toBeInTheDocument()
    await screen.findByRole('option', { name: 'Project One' })
  })

  it('submits with newSubjectLabel after subject + session validation both return 404', async () => {
    const onSubmit = vi.fn()
    fetchMock
      .mockResolvedValueOnce(projectsResponse()) // 1: project list
      .mockResolvedValueOnce(jsonResponse({ ResultSet: { Result: [] } })) // 2: subject list
      .mockResolvedValueOnce(new Response(null, { status: 404 })) // 3: new-subject validation
      .mockResolvedValueOnce(new Response(null, { status: 404 })) // 4: session validation

    render(<ImportForm baseUrl="http://server" onSubmit={onSubmit} />)

    await screen.findByRole('option', { name: 'Project One' })
    fireEvent.change(screen.getByLabelText('Project:'), { target: { value: 'P1' } })

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        'http://server/data/projects/P1/subjects?format=json',
        expect.anything(),
      ),
    )

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

    fireEvent.change(screen.getByLabelText('Session:'), { target: { value: 'Sess1' } })

    const file = makeFile()
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } })

    const button = screen.getByRole('button', { name: /begin upload/i })
    await waitFor(() => expect(button).not.toBeDisabled())
    fireEvent.click(button)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://server/data/projects/P1/subjects/New%20Subj/experiments/Sess1?format=json',
      expect.anything(),
    )
    expect(onSubmit).toHaveBeenCalledWith({
      projectId: 'P1',
      subjectId: null,
      newSubjectLabel: 'New Subj',
      session: 'Sess1',
      files: [file],
    })
  })

  it('submits with subjectId when an existing subject is chosen', async () => {
    const onSubmit = vi.fn()
    fetchMock
      .mockResolvedValueOnce(projectsResponse())
      .mockResolvedValueOnce(subjectsResponse())
      .mockResolvedValueOnce(new Response(null, { status: 404 }))

    render(<ImportForm baseUrl="http://server" onSubmit={onSubmit} />)

    await screen.findByRole('option', { name: 'Project One' })
    fireEvent.change(screen.getByLabelText('Project:'), { target: { value: 'P1' } })

    await screen.findByRole('option', { name: 'Subj-A' })
    fireEvent.change(screen.getByLabelText('Subject:'), { target: { value: 'Subj-A' } })

    fireEvent.change(screen.getByLabelText('Session:'), { target: { value: 'Sess2' } })
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [makeFile()] } })

    const button = screen.getByRole('button', { name: /begin upload/i })
    await waitFor(() => expect(button).not.toBeDisabled())
    fireEvent.click(button)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://server/data/projects/P1/subjects/Subj-A/experiments/Sess2?format=json',
      expect.anything(),
    )
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'P1',
        subjectId: 'Subj-A',
        newSubjectLabel: null,
        session: 'Sess2',
      }),
    )
  })

  it('flags an existing session and does not submit when validation returns non-404', async () => {
    const onSubmit = vi.fn()
    fetchMock
      .mockResolvedValueOnce(projectsResponse())
      .mockResolvedValueOnce(subjectsResponse())
      .mockResolvedValueOnce(jsonResponse({}, 200)) // session is taken

    render(<ImportForm baseUrl="http://server" onSubmit={onSubmit} />)

    await screen.findByRole('option', { name: 'Project One' })
    fireEvent.change(screen.getByLabelText('Project:'), { target: { value: 'P1' } })

    await screen.findByRole('option', { name: 'Subj-A' })
    fireEvent.change(screen.getByLabelText('Subject:'), { target: { value: 'Subj-A' } })

    fireEvent.change(screen.getByLabelText('Session:'), { target: { value: 'Taken' } })
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [makeFile()] } })

    const button = screen.getByRole('button', { name: /begin upload/i })
    await waitFor(() => expect(button).not.toBeDisabled())
    fireEvent.click(button)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/session.*already exists/i)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps Begin Upload disabled while the new-subject label is empty', async () => {
    fetchMock
      .mockResolvedValueOnce(projectsResponse())
      .mockResolvedValueOnce(jsonResponse({ ResultSet: { Result: [] } }))

    render(<ImportForm baseUrl="" onSubmit={vi.fn()} />)
    await screen.findByRole('option', { name: 'Project One' })
    fireEvent.change(screen.getByLabelText('Project:'), { target: { value: 'P1' } })

    fireEvent.change(screen.getByLabelText('Session:'), { target: { value: 'Sess' } })
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [makeFile()] } })

    expect(screen.getByRole('button', { name: /begin upload/i })).toBeDisabled()
  })
})
