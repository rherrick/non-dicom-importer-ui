# Project Status — non-dicom-importer-ui

**Last updated:** 2026-05-28
**Current status:** Functional — core import UI and reusable picker complete; not yet published to a registry.

---

## 1. Project Overview

A reusable React component library for importing non-DICOM data into XNAT. Built as an embeddable component so it can be dropped into XNAT's web UI today and a future Electron desktop application.

**Architecture:** Vite library-mode build emitting a single ESM bundle plus a separate CSS file. Each UI component lives in its own folder under `src/components/` and is exported via a single barrel (`src/index.ts`). `react` / `react-dom` are peer dependencies — the host app provides them.

The two headline exports are:
- **`XnatPicker`** — a single control that walks the XNAT project → subject → experiment hierarchy, configurable via a `mode` prop. It owns all of its own REST calls and validation.
- **`ImportForm`** — a thin upload form that composes `XnatPicker` (in `experiment-create` mode) with a `FileDropZone` and a Begin Upload button.

`FileDropZone` is also exported standalone. `ProjectSelect`, `SubjectSelect`, `ExperimentSelect`, and `SessionInput` are internal building blocks used by `XnatPicker` and are **not** part of the public surface.

**Auth model:** the library knows nothing about credentials. All requests send `credentials: 'include'`, so the host environment (XNAT web app cookie, Electron session, etc.) supplies authentication. Basic-auth-from-env is a **dev-sandbox-only** convenience (see §3).

**Technology stack:**
- React 19 + TypeScript 5 (ESM, `"type": "module"`)
- Vite 6 (library mode) + `vite-plugin-dts` for bundled type declarations
- Tailwind CSS v4 via `@tailwindcss/vite` (no PostCSS config)
- Vitest 4 + `@vitest/coverage-v8` for tests and V8-native coverage
- Yarn 1.x for package management

---

## 2. Current Implementation Status

### ✅ Completed

**`XnatPicker`** (`src/components/XnatPicker/`) — the combined hierarchy control
- Five modes via the `mode` prop:

  | Mode | Project | Subject | Session |
  |---|---|---|---|
  | `experiment-browse` *(default)* | dropdown | existing-only dropdown | dropdown of existing experiments |
  | `experiment-create` | dropdown | existing + "New subject…" | text input + on-blur/Enter validation |
  | `subject-browse` | dropdown | existing-only dropdown | — |
  | `subject-create` | dropdown | existing + "New subject…" | — |
  | `project-browse` | dropdown | — | — |

- Emits a unified `XnatPickerSelection` via `onChange`: `{ projectId, subject, session, sessionStatus }`.
- Selection cascades: changing project resets subject/session; changing subject resets session.
- Props: `baseUrl?`, `mode?`, `onChange?`, `className?`.

**`ImportForm`** (`src/components/ImportForm/`)
- Composes `<XnatPicker mode="experiment-create">` + `<FileDropZone accept={['.zip','.tar.gz','.tgz']}>` + Begin Upload button.
- Begin Upload is disabled until: project set, subject ready (existing, or new + validated available), session label validated available, and at least one file selected.
- `handleSubmit` is synchronous (validation already done up-front) and calls `onSubmit(ImportFormSubmitData)`.
- `ImportFormSubmitData`: `{ projectId, subjectId, newSubjectLabel, session, files }`.

**`FileDropZone`** (`src/components/FileDropZone/`)
- Drag-and-drop + browse file picker. Props: `onFiles`, `accept?`, `multiple?`, `className?`.
- Copy: "Drop files here or browse to import non-DICOM data".

**Internal controls** (not exported)
- `ProjectSelect` — fetches `/data/projects?format=json` on mount.
- `SubjectSelect` — fetches subjects when a project is set; `allowNewSubject` prop toggles the "New subject…" option; debounced (300 ms) validation of typed new-subject labels.
- `ExperimentSelect` — fetches experiments when project + subject are both set.
- `SessionInput` — text input that validates on **blur or Enter** via an injected `validate` callback; exposes status through `onValidationChange`.

**REST contract** — every call uses `credentials: 'include'` and `Accept: '*/*'`:

| Endpoint | Purpose | Validation rule |
|---|---|---|
| `GET /data/projects?format=json` | project list | — |
| `GET /data/projects/<P>/subjects?format=json` | subject list | — |
| `GET /data/projects/<P>/subjects/<label>` | new-subject label check | `404` = available; else taken |
| `GET /data/projects/<P>/subjects/<S>/experiments?format=json` | experiment list | — |
| `GET /data/projects/<P>/subjects/<S>/experiments/<SESSION>?format=json` | session label check | `404` = available; else taken |

**Build pipeline**
- Vite library mode emits `dist/non-dicom-importer.{js,css,d.ts}` (renamed from `index.*`).
- `vite-plugin-dts` with `rollupTypes: true` bundles all `.d.ts` into one; a small `closeBundle` plugin in `vite.config.ts` renames the rolled-up `index.d.ts` → `non-dicom-importer.d.ts`.
- Dev server proxy (`/data`, `/xapi` → `VITE_XNAT_BASE_URL`) wired via `loadEnv`; active only when the env var is set.

**Testing & coverage**
- 50 tests across 7 files (Vitest + jsdom + `@testing-library/jest-dom/vitest`).
- V8 coverage with an **80% threshold** on `src/components/**`; current ≈95% statements / ≈88% branches.

### 🔧 Configuration

| Command | Purpose |
|---|---|
| `yarn dev` | Vite dev sandbox with HMR |
| `yarn build` | Build library to `dist/` |
| `yarn typecheck` | `tsc --noEmit` |
| `yarn test` | Vitest watch mode |
| `yarn test:run` | Single test run |
| `yarn test:coverage` | Tests + coverage; fails if < 80% |

**Consumer import pattern:**
```ts
import { ImportForm } from 'non-dicom-importer-ui'
import 'non-dicom-importer-ui/style.css'
```

**Dev sandbox env (`.env.local`, gitignored):**
```
VITE_XNAT_BASE_URL=http://localhost:8080   # enables the Vite proxy
VITE_XNAT_USERNAME=admin                    # dev-only Basic auth
VITE_XNAT_PASSWORD=admin                    # dev-only Basic auth
```
- `VITE_XNAT_BASE_URL` is read by `vite.config.ts` to set up a same-origin reverse proxy (avoids CORS).
- `VITE_XNAT_USERNAME` / `VITE_XNAT_PASSWORD` are read by `dev/installDevAuth.ts`, which wraps `globalThis.fetch` to attach a Basic auth header to in-scope requests. **Never ships in the library.**

---

## 3. Project Structure

```
non-dicom-importer-ui/
├── src/
│   ├── components/
│   │   ├── FileDropZone/        # public — drag/drop file picker
│   │   ├── XnatPicker/          # public — project/subject/session picker (5 modes)
│   │   ├── ImportForm/          # public — full upload form
│   │   ├── ProjectSelect/       # internal — project dropdown
│   │   ├── SubjectSelect/       # internal — subject dropdown + new-subject validation
│   │   ├── ExperimentSelect/    # internal — experiment dropdown
│   │   └── SessionInput/        # internal — session text input + blur/Enter validation
│   ├── styles/index.css         # Tailwind entry + @source directive
│   └── index.ts                 # public barrel
├── dev/                         # Vite sandbox (NOT shipped)
│   ├── App.tsx                  # ImportForm + collapsible "Dev tools" panel
│   ├── main.tsx                 # mounts App; calls installDevAuth()
│   ├── installDevAuth.ts        # dev-only Basic-auth fetch wrapper
│   └── vite-env.d.ts            # Vite client types
├── dist/                        # build output (gitignored)
├── index.html                   # Vite dev entry
├── vite.config.ts               # Vite lib + dts rename + dev proxy + Vitest config
├── vitest.setup.ts              # imports @testing-library/jest-dom/vitest
├── tsconfig.json                # source TS config (noEmit)
├── tsconfig.node.json           # config-file TS settings (standalone)
├── package.json                 # exports map → dist/non-dicom-importer.*
├── README.md                    # API reference
├── USING.md                     # integration guide (React / JSP / Electron)
└── PROJECT_STATUS.md            # this file
```

**Convention:** new components go under `src/components/<Name>/` with `<Name>.tsx`, `<Name>.test.tsx`, `index.ts`. Public ones are re-exported from `src/index.ts`.

---

## 4. Recent Changes

- **eb2ee3b** — Changed output artifact name to `non-dicom-importer` instead of `index` (`dist/non-dicom-importer.{js,css,d.ts}`); updated `package.json` exports, docs, and added a dts-rename build plugin.
- **40a1afd** — Added `USING.md` integration guide (React app, JSP/HTML drop-in, Electron).
- **b4a8718** — Layout/messaging changes; moved session-label validation inline (on blur/Enter) instead of on submit; added `sessionStatus` to the picker selection.
- **b013b8b** — Added `README.md`.
- **666b9fb** — Added dev-mode display (mode switcher + JSON inspector behind a "Dev tools" panel).

**Breaking/important since scaffold:**
- Public surface narrowed to `FileDropZone`, `XnatPicker`, `ImportForm` (the per-control exports were removed).
- Session validation moved from submit-time to on-blur/Enter; `XnatPicker` dropped its `sessionError` prop in favor of internal validation + `sessionStatus`.
- `Accept` header changed from `application/json` to `*/*` (XNAT returned HTTP 406 on `application/json`).
- Build artifacts renamed `index.*` → `non-dicom-importer.*`.

---

## 5. Known Issues & Notes

- **Begin Upload button + host CSS:** XNAT styles `button` element-level and unlayered; Tailwind v4 puts utilities in `@layer utilities`, which loses to unlayered host CSS. The button's color utilities therefore use the `!` (important) suffix to win. If other elements collide with XNAT styling, apply the same `!` treatment (or convert to unlayered `@apply` rules).
- **Validation requires blur/Enter on the session field:** Begin Upload stays disabled until the session input is blurred (or Enter pressed) at least once, since that's what triggers validation. Tabbing/clicking away handles this naturally; a user who types and immediately clicks the disabled button must interact with another control first.
- **Not published:** `package.json` has no registry config (version `0.0.1`). Consume locally via `yarn pack` + tarball install, or `yarn link`.
- **Tailwind `@source`:** `src/styles/index.css` scans `../components`. Utility classes used outside `src/components/` won't be detected.
- **Vitest/coverage-v8 pinning:** `vitest` and `@vitest/coverage-v8` must stay on matching majors (both 4.1.6).
- **CORS without the proxy:** hitting a cross-origin XNAT with a Basic auth header triggers a preflight XNAT may reject. The Vite proxy (same-origin) sidesteps this in dev.

---

## 6. Testing Instructions

**Full pipeline:**
```bash
yarn install
yarn typecheck       # TS errors?
yarn test:coverage   # 50 tests pass + coverage ≥ 80%?
yarn build           # dist/non-dicom-importer.{js,css,d.ts}?
```

**Manual UI test (against a real XNAT):**
```bash
# .env.local with VITE_XNAT_BASE_URL + credentials, then:
yarn dev
# Open the Vite URL. Verify, in ImportForm:
#  - Project dropdown populates from /data/projects
#  - Selecting a project populates Subject; selecting/typing a subject works
#  - Typing a new subject validates after you pause (debounce)
#  - Typing a session and tabbing away (or Enter) validates it
#  - Begin Upload enables only when all fields valid + a file is dropped
# Expand "Dev tools" to exercise the other XnatPicker modes and inspect selection JSON.
```

**Library output sanity check** (after `yarn build`):
```bash
ls dist/   # non-dicom-importer.js, non-dicom-importer.css, non-dicom-importer.d.ts
```

---

## 7. Next Steps / Potential Improvements

### Recommended next steps
1. **Wire `onSubmit` to a real upload** — `ImportForm` currently hands the caller `{ projectId, subjectId | newSubjectLabel, session, files }`; the actual archive POST to XNAT is the consumer's responsibility (or could become a built-in option).
2. **Publish / packaging** — set repository + publish config, or document the tarball workflow as the supported path.
3. **CI pipeline** — run `typecheck` + `test:coverage` + `build` on PR.
4. **ESLint + Prettier** — currently only `tsc --noEmit` gates style.

### Optional enhancements
- Upload progress + results UI after Begin Upload.
- Storybook/Ladle for visual component development beyond the dev sandbox.
- Harden against host CSS systematically (scoping wrapper or Shadow DOM) if `!important` whack-a-mole grows.
- Configurable session-validation trigger (idle timeout) in addition to blur/Enter.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| HTTP 406 on REST calls | `Accept: application/json` rejected by XNAT content negotiation | Already fixed — all calls send `Accept: */*` |
| Begin Upload button text invisible / wrong color in XNAT | Host `button` styles override Tailwind utilities | Already fixed — button colors use the `!` important suffix |
| Begin Upload never enables | Session not yet validated (needs blur/Enter), or a field incomplete | Blur the session field; confirm project/subject/file are set |
| CORS / preflight failures in dev | Cross-origin XNAT + auth header | Set `VITE_XNAT_BASE_URL` to enable the same-origin Vite proxy |
| Consumer can't find `dist/style.css` | File is `dist/non-dicom-importer.css` | Import `non-dicom-importer-ui/style.css` (exports map handles the path) |
| `toBeInTheDocument` type error in `yarn build`/typecheck | jest-dom matchers not augmented | `vitest.setup.ts` imports `@testing-library/jest-dom/vitest`; it's in tsconfig `include` |

---

## 9. Git Repository

- **Branch:** `dev` (ahead of `origin/dev` by 1 commit)
- **Status:** clean working tree
- **Remote:** `origin` configured (push pending for the latest commit)
- **Latest commit:** `eb2ee3b` — Changed output to non-dicom-importer instead of index

---

## 10. Technologies Used

| Category | Tech | Version |
|---|---|---|
| Runtime | Node.js | 24.x |
| Package manager | Yarn | 1.22.x |
| Language | TypeScript | ^5.0.0 (5.9.3 bundled) |
| UI framework | React | ^19.0.0 (peer; 18 also supported) |
| Build tool | Vite | ^6.0.0 (6.4.2) |
| Type declarations | vite-plugin-dts | ^4.0.0 |
| Styling | Tailwind CSS | ^4.0.0 |
| Tailwind integration | @tailwindcss/vite | ^4.0.0 |
| Test runner | Vitest | ^4.0.0 (4.1.6) |
| Coverage | @vitest/coverage-v8 | ^4.0.0 (4.1.6) |
| DOM env | jsdom | ^26.0.0 |
| Component testing | @testing-library/react | ^16.0.0 |
| DOM testing core | @testing-library/dom | ^10.0.0 |
| DOM matchers | @testing-library/jest-dom | ^6.0.0 |
| User interactions | @testing-library/user-event | ^14.0.0 |
| React Vite plugin | @vitejs/plugin-react | ^4.0.0 |
