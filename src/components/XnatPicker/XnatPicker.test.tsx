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
          sessionStatus: 'idle',
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
          sessionStatus: 'idle',
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
          sessionStatus: 'idle',
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
    it('renders a session text input that validates on blur via the experiment URL', async () => {
      fetchMock
        .mockResolvedValueOnce(projects())
        .mockResolvedValueOnce(subjects())
        .mockResolvedValueOnce(new Response(null, { status: 404 }))

      const onChange = vi.fn()
      render(
        <XnatPicker mode="experiment-create" baseUrl="http://server" onChange={onChange} />,
      )

      await screen.findByRole('option', { name: 'Proj One' })
      fireEvent.change(screen.getByLabelText('Project:'), { target: { value: 'P1' } })

      await screen.findByRole('option', { name: 'Subj-A' })
      fireEvent.change(screen.getByLabelText('Subject:'), { target: { value: 'Subj-A' } })

      const sessionInput = screen.getByLabelText('Session:') as HTMLInputElement
      expect(sessionInput.tagName).toBe('INPUT')
      fireEvent.change(sessionInput, { target: { value: 'NewSession' } })
      fireEvent.blur(sessionInput)

      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          'http://server/data/projects/P1/subjects/Subj-A/experiments/NewSession?format=json',
          expect.objectContaining({ credentials: 'include' }),
        ),
      )

      await waitFor(() => {
        expect(lastCall<XnatPickerSelection>(onChange)?.sessionStatus).toBe('available')
      })
    })

    it('flags an existing session label as taken when blur validation returns 200', async () => {
      fetchMock
        .mockResolvedValueOnce(projects())
        .mockResolvedValueOnce(subjects())
        .mockResolvedValueOnce(jsonResponse({}, 200))

      const onChange = vi.fn()
      render(<XnatPicker mode="experiment-create" baseUrl="" onChange={onChange} />)

      await screen.findByRole('option', { name: 'Proj One' })
      fireEvent.change(screen.getByLabelText('Project:'), { target: { value: 'P1' } })

      await screen.findByRole('option', { name: 'Subj-A' })
      fireEvent.change(screen.getByLabelText('Subject:'), { target: { value: 'Subj-A' } })

      fireEvent.change(screen.getByLabelText('Session:'), { target: { value: 'Taken' } })
      fireEvent.blur(screen.getByLabelText('Session:'))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent(/already exists/i)
      await waitFor(() => {
        expect(lastCall<XnatPickerSelection>(onChange)?.sessionStatus).toBe('taken')
      })
    })

    it('does not call the validate URL until the user blurs the session input', async () => {
      fetchMock.mockResolvedValueOnce(projects()).mockResolvedValueOnce(subjects())

      render(<XnatPicker mode="experiment-create" baseUrl="" onChange={vi.fn()} />)

      await screen.findByRole('option', { name: 'Proj One' })
      fireEvent.change(screen.getByLabelText('Project:'), { target: { value: 'P1' } })

      await screen.findByRole('option', { name: 'Subj-A' })
      fireEvent.change(screen.getByLabelText('Subject:'), { target: { value: 'Subj-A' } })

      fireEvent.change(screen.getByLabelText('Session:'), { target: { value: 'Typed' } })

      // Only project list + subject list have been fetched. No experiments call yet.
      expect(
        fetchMock.mock.calls.some((c) =>
          String(c[0]).includes('/experiments/Typed'),
        ),
      ).toBe(false)
    })
  })
})
