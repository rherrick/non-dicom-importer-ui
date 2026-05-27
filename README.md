# non-dicom-importer-ui

A React component library for importing non-DICOM data into [XNAT](https://www.xnat.org/). Built as an embeddable ESM bundle so it can drop into XNAT's web UI today and an Electron client later.

## Install

```bash
yarn add non-dicom-importer-ui
# or
npm install non-dicom-importer-ui
```

`react` and `react-dom` are peer dependencies (React 18 or 19). The library ships its own stylesheet.

```ts
import { ImportForm } from 'non-dicom-importer-ui'
import 'non-dicom-importer-ui/style.css'
```

## Quick start

```tsx
import { ImportForm, type ImportFormSubmitData } from 'non-dicom-importer-ui'
import 'non-dicom-importer-ui/style.css'

export function ImportPage() {
  const handleSubmit = (data: ImportFormSubmitData) => {
    // Validation has already passed: the session label is unique and the
    // subject either exists or is verified-available.
    upload(data.projectId, data.subjectId ?? data.newSubjectLabel, data.session, data.files)
  }

  return <ImportForm onSubmit={handleSubmit} />
}
```

`ImportForm` renders an instruction line, an `XnatPicker` configured for experiment creation, a drop zone that accepts `.zip` / `.tar.gz` / `.tgz`, and a Begin Upload button. The button stays disabled until every field is populated and (for new subjects) the label is validated against the server.

When the user clicks Begin Upload, `ImportForm` validates the session label against `GET /data/projects/<P>/subjects/<S>/experiments/<SESSION>?format=json`. Only a `404` from that endpoint is treated as "available" — anything else surfaces an inline error on the session field and the form does not submit.

`onSubmit` is therefore only called with vetted data:

```ts
interface ImportFormSubmitData {
  projectId: string
  subjectId: string | null         // set when an existing subject was chosen
  newSubjectLabel: string | null   // set when "New subject…" was used
  session: string
  files: File[]
}
```

## XnatPicker

`XnatPicker` is the project / subject / session control used by `ImportForm`. It works standalone too — useful for any UI that needs to point at a location in the XNAT hierarchy.

```tsx
import { XnatPicker, type XnatPickerSelection } from 'non-dicom-importer-ui'

function MyForm() {
  const [selection, setSelection] = useState<XnatPickerSelection | null>(null)
  return <XnatPicker mode="experiment-browse" onChange={setSelection} />
}
```

### Modes

```ts
type XnatPickerMode =
  | 'experiment-browse'   // default
  | 'experiment-create'
  | 'subject-browse'
  | 'subject-create'
  | 'project-browse'
```

| Mode | Project | Subject | Session |
|---|---|---|---|
| `experiment-browse` *(default)* | dropdown | existing-only dropdown | dropdown of existing experiments |
| `experiment-create` | dropdown | existing + "New subject…" | text input + parent-driven validation |
| `subject-browse` | dropdown | existing-only dropdown | — |
| `subject-create` | dropdown | existing + "New subject…" | — |
| `project-browse` | dropdown | — | — |

Picking something upstream resets everything downstream. Changing project clears the subject; changing subject clears the session.

### Selection shape

```ts
interface XnatPickerSelection {
  projectId: string | null
  subject: XnatSubjectValue | null
  session: string | null
}

type XnatSubjectValue =
  | { kind: 'existing'; subjectId: string }
  | {
      kind: 'new'
      label: string
      // 'available' means the server returned 404 for the typed label,
      // i.e. the new subject name is free to create.
      status: 'idle' | 'checking' | 'available' | 'taken' | 'error'
    }
```

- `subject` is always `null` in `project-browse` mode.
- `subject.kind` is always `'existing'` in browse modes; in create modes it can be either.
- `session` is the selected experiment ID/label in `experiment-browse`, the typed label in `experiment-create`, and `null` everywhere else.

### Props

```ts
interface XnatPickerProps {
  baseUrl?: string                    // XNAT root; '' (default) = same origin
  mode?: XnatPickerMode               // default 'experiment-browse'
  onChange?: (s: XnatPickerSelection) => void
  sessionError?: string | null        // external error to show on the session control
  className?: string
}
```

The `sessionError` prop is the integration point for external validation: `ImportForm` uses it to surface "session already exists" after the Begin Upload click.

## FileDropZone

A standalone drag-and-drop / browse file picker, exposed for cases where you want the file affordance without the rest of the import form.

```ts
interface FileDropZoneProps {
  onFiles: (files: File[]) => void
  accept?: string[]      // e.g. ['.zip', '.tar.gz', '.tgz']
  multiple?: boolean     // default false
  className?: string
}
```

## XNAT endpoints

`XnatPicker` and `ImportForm` together call:

| Endpoint | Used for | Component |
|---|---|---|
| `GET /data/projects?format=json` | populate project list | `XnatPicker` |
| `GET /data/projects/<P>/subjects?format=json` | populate subject list | `XnatPicker` |
| `GET /data/projects/<P>/subjects/<label>` | verify a typed new-subject label (404 = available, anything else = taken) | `XnatPicker` (create modes) |
| `GET /data/projects/<P>/subjects/<S>/experiments?format=json` | populate experiment list | `XnatPicker` (`experiment-browse`) |
| `GET /data/projects/<P>/subjects/<S>/experiments/<SESSION>?format=json` | verify a typed session label on submit (404 = available) | `ImportForm` |

All requests include `credentials: 'include'` and `Accept: application/json`. The library knows nothing about auth — the containing environment (XNAT web app, Electron shell, etc.) provides the session.

## Development

```bash
yarn install
yarn dev              # Vite dev sandbox with HMR
yarn typecheck        # tsc --noEmit
yarn test             # Vitest watch
yarn test:run         # single run
yarn test:coverage    # tests + V8 coverage (80% threshold)
yarn build            # emit dist/index.{js,css,d.ts}
```

### Pointing the dev sandbox at a real XNAT

Put this in `.env.local` (gitignored):

```
VITE_XNAT_BASE_URL=http://localhost:8080
VITE_XNAT_USERNAME=admin
VITE_XNAT_PASSWORD=admin
```

What each variable does:

- **`VITE_XNAT_BASE_URL`** — read by `vite.config.ts` to set up a dev-server reverse proxy. When set, `/data/*` and `/xapi/*` are forwarded to that XNAT, so the browser sees everything as same-origin (no CORS).
- **`VITE_XNAT_USERNAME` / `VITE_XNAT_PASSWORD`** — read by `dev/installDevAuth.ts`, which wraps `globalThis.fetch` and attaches a Basic auth header to outgoing requests. **Dev-only.** Nothing about credentials ships in the library — in production the host page supplies the XNAT session via cookies.

Components emit relative URLs (`/data/...`), so the dev proxy intercepts them with no extra configuration. In production those same relative paths target the XNAT origin directly.

### Sandbox layout

`yarn dev` renders `<ImportForm />` at the top of the page and a collapsed "Dev tools" panel at the bottom that, when expanded, shows:

- A standalone `<XnatPicker />` with a mode-switcher dropdown and a live JSON dump of `XnatPickerSelection` — useful for exercising the browse modes that `ImportForm` doesn't touch.
- The most recent `ImportForm` submission payload as JSON.

## Project layout

```
src/
├── components/
│   ├── FileDropZone/      # public — drag-and-drop file picker
│   ├── XnatPicker/        # public — project/subject/session picker
│   ├── ImportForm/        # public — full upload form
│   ├── ProjectSelect/     # internal — used by XnatPicker
│   ├── SubjectSelect/     # internal — used by XnatPicker
│   ├── ExperimentSelect/  # internal — used by XnatPicker
│   └── SessionInput/      # internal — used by XnatPicker
├── styles/index.css       # Tailwind entrypoint
└── index.ts               # public barrel
dev/                       # Vite sandbox (not shipped)
```

Each component is self-contained in its own folder (`Name.tsx`, `Name.test.tsx`, `index.ts`) so any one can be lifted out into its own package later.

## License

TBD.
