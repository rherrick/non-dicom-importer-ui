import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { XnatPicker, type XnatPickerSelection } from './XnatPicker'

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

const projects = () =>
  jsonResponse({ ResultSet: { Result: [{ ID: 'P1', name: 'Proj One' }] } })

const subjects = () =>
  jsonResponse({ ResultSet: { Result: [{ ID: 'S1', label: 'Subj-A' }] } })

const experiments = () =>
  jsonResponse({ ResultSet: { Result: [{ ID: 'E1', label: 'Exp-A' }] } })

function lastCall<T>(spy: Mock): T | undefined {
  const calls = spy.mock.calls
  return calls.length === 0 ? undefined : (calls[calls.length - 1][0] as T)
}

describe('XnatPicker', () => {
  describe('mode: project-browse', () => {
    it('renders only the project control and emits projectId selections', async () => {
      fetchMock.mockResolvedValueOnce(projects())
      const onChange = vi.fn()
      render(<XnatPicker mode="project-browse" baseUrl="" onChange={onChange} />)

      await screen.findByRole('option', { name: 'Proj One' })
      expect(screen.queryByLabelText('Subject:')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Session:')).not.toBeInTheDocument()

      fireEvent.change(screen.getByLabelText('Project:'), { target: { value: 'P1' } })
      await waitFor(() => {
        expect(lastCall<XnatPickerSelection>(onChange)).toEqual({
          projectId: 'P1',
          subject: null,
          session: null,
        })
      })
    })
  })

  describe('mode: subject-browse', () => {
    it('renders project + subject, no session, no "New subject…" option', async () => {
      fetchMock
        .mockResolvedValueOnce(projects())
        .mockResolvedValueOnce(subjects())
      const onChange = vi.fn()
      render(<XnatPicker mode="subject-browse" baseUrl="" onChange={onChange} />)

      await screen.findByRole('option', { name: 'Proj One' })
      fireEvent.change(screen.getByLabelText('Project:'), { target: { value: 'P1' } })

      await screen.findByRole('option', { name: 'Subj-A' })
      expect(screen.queryByLabelText('Session:')).not.toBeInTheDocument()
      expect(screen.queryByRole('option', { name: /new subject/i })).not.toBeInTheDocument()

      fireEvent.change(screen.getByLabelText('Subject:'), { target: { value: 'Subj-A' } })
      await waitFor(() => {
        expect(lastCall<XnatPickerSelection>(onChange)).toEqual({
          projectId: 'P1',
          subject: { kind: 'existing', subjectId: 'Subj-A' },
          session: null,
        })
      })
    })
  })

  describe('mode: subject-create', () => {
    it('exposes "New subject…" and emits a new-subject value with validation status', async () => {
      fetchMock
        .mockResolvedValueOnce(projects())
        .mockResolvedValueOnce(jsonResponse({ ResultSet: { Result: [] } }))
        .mockResolvedValueOnce(new Response(null, { status: 404 }))
      const onChange = vi.fn()
      render(<XnatPicker mode="subject-create" baseUrl="" onChange={onChange} />)

      await screen.findByRole('option', { name: 'Proj One' })
      fireEvent.change(screen.getByLabelText('Project:'), { target: { value: 'P1' } })

      expect(await screen.findByLabelText('New subject name')).toBeInTheDocument()
      fireEvent.change(screen.getByLabelText('New subject name'), {
        target: { value: 'Brand New' },
      })

      await waitFor(
        () => {
          expect(lastCall<XnatPickerSelection>(onChange)?.subject).toEqual({
            kind: 'new',
            label: 'Brand New',
            status: 'available',
          })
        },
        { timeout: 2000 },
      )
      expect(lastCall<XnatPickerSelection>(onChange)?.session).toBeNull()
    })
  })

  describe('mode: experiment-browse', () => {
    it('renders the experiment dropdown and emits the selected experiment as session', async () => {
      fetchMock
        .mockResolvedValueOnce(projects())
        .mockResolvedValueOnce(subjects())
        .mockResolvedValueOnce(experiments())
      const onChange = vi.fn()
      render(<XnatPicker baseUrl="http://server" onChange={onChange} />) // default mode

      await screen.findByRole('option', { name: 'Proj One' })
      fireEvent.change(screen.getByLabelText('Project:'), { target: { value: 'P1' } })

      await screen.findByRole('option', { name: 'Subj-A' })
      // No "New subject…" option in browse mode
      expect(screen.queryByRole('option', { name: /new subject/i })).not.toBeInTheDocument()
      fireEvent.change(screen.getByLabelText('Subject:'), { target: { value: 'Subj-A' } })

      await screen.findByRole('option', { name: 'Exp-A' })
      expect(fetchMock).toHaveBeenCalledWith(
        'http://server/data/projects/P1/subjects/Subj-A/experiments?format=json',
        expect.objectContaining({ credentials: 'include' }),
      )
      fireEvent.change(screen.getByLabelText('Session:'), { target: { value: 'Exp-A' } })

      await waitFor(() => {
        expect(lastCall<XnatPickerSelection>(onChange)).toEqual({
          projectId: 'P1',
          subject: { kind: 'existing', subjectId: 'Subj-A' },
          session: 'Exp-A',
        })
      })
    })

    it('resets the session when the subject changes', async () => {
      fetchMock
        .mockResolvedValueOnce(projects())
        .mockResolvedValueOnce(
          jsonResponse({
            ResultSet: {
              Result: [
                { ID: 'S1', label: 'Subj-A' },
                { ID: 'S2', label: 'Subj-B' },
              ],
            },
          }),
        )
        .mockResolvedValueOnce(experiments())
        .mockResolvedValueOnce(jsonResponse({ ResultSet: { Result: [] } }))

      const onChange = vi.fn()
      render(<XnatPicker baseUrl="" onChange={onChange} />)

      await screen.findByRole('option', { name: 'Proj One' })
      fireEvent.change(screen.getByLabelText('Project:'), { target: { value: 'P1' } })
      await screen.findByRole('option', { name: 'Subj-A' })
      fireEvent.change(screen.getByLabelText('Subject:'), { target: { value: 'Subj-A' } })
      await screen.findByRole('option', { name: 'Exp-A' })
      fireEvent.change(screen.getByLabelText('Session:'), { target: { value: 'Exp-A' } })

      await waitFor(() =>
        expect(lastCall<XnatPickerSelection>(onChange)?.session).toBe('Exp-A'),
      )

      fireEvent.change(screen.getByLabelText('Subject:'), { target: { value: 'Subj-B' } })

      await waitFor(() => {
        expect(lastCall<XnatPickerSelection>(onChange)?.session).toBeNull()
      })
    })
  })

  describe('mode: experiment-create', () => {
    it('renders a session text input and surfaces sessionError', async () => {
      fetchMock.mockResolvedValueOnce(projects())
      render(
        <XnatPicker
          mode="experiment-create"
          baseUrl=""
          onChange={vi.fn()}
          sessionError="A session named X already exists."
        />,
      )

      await screen.findByRole('option', { name: 'Proj One' })

      const sessionInput = screen.getByLabelText('Session:') as HTMLInputElement
      expect(sessionInput.tagName).toBe('INPUT')
      expect(sessionInput).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i)
    })
  })
})
