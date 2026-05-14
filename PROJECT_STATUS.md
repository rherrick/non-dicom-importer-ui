# Project Status — non-dicom-importer-ui

**Last updated:** 2026-05-26
**Current status:** Initial scaffold complete — ready for component development

---

## 1. Project Overview

A reusable React component library for importing non-DICOM data into XNAT. Built as an embeddable component so it can be dropped into both XNAT's web UI and a future Electron desktop application.

**Architecture:** Vite library-mode build that emits a single ESM bundle plus a separate CSS file. Each UI component lives in its own folder under `src/components/` and is exported via a single barrel (`src/index.ts`). `react` and `react-dom` are peer dependencies — the host app provides them.

**Technology stack:**
- React 19 + TypeScript 5 (ESM, `"type": "module"`)
- Vite 6 (library mode) + `vite-plugin-dts` for bundled type declarations
- Tailwind CSS v4 via `@tailwindcss/vite` (no PostCSS config needed)
- Vitest 4 + `@vitest/coverage-v8` for tests and V8-native coverage
- Yarn 1.x for package management

---

## 2. Current Implementation Status

### ✅ Completed

**Build pipeline**
- Vite library mode emits `dist/index.js`, `dist/index.css`, `dist/index.d.ts`
- `vite-plugin-dts` with `rollupTypes: true` bundles all `.d.ts` into one file
- Test files excluded from type declaration generation
- `react`, `react-dom`, `react/jsx-runtime` marked external

**Tailwind v4 setup**
- `@tailwindcss/vite` plugin handles CSS transformation in dev and build
- `src/styles/index.css` uses `@import "tailwindcss"` + `@source "../components"` directive
- CSS imported as a side effect from `src/index.ts`; `sideEffects: ["**/*.css"]` in `package.json` prevents tree-shaking from dropping it

**Dev sandbox**
- `index.html` at project root → `dev/main.tsx` → `dev/App.tsx`
- Imports the library via relative path (`../src`) for live HMR while iterating

**Components**
- `FileDropZone` — drag-and-drop file picker with optional `accept` filter and `multiple` flag
  - Exports: `FileDropZone`, `FileDropZoneProps`
  - 8 tests covering rendering, accept hints, file input upload, drag-over/leave styling, drop event, and single-file mode

**Testing & coverage**
- Vitest configured with `jsdom`, globals, `@testing-library/jest-dom` matchers
- V8 coverage with **80% threshold** on lines/functions/branches/statements
- Coverage scope: `src/components/**` (excludes barrels and tests)
- Current coverage: 100% lines/functions/statements, 88.88% branches

### 🔧 Configuration

| Command | Purpose |
|---|---|
| `yarn dev` | Start Vite dev server with HMR |
| `yarn build` | Build library to `dist/` |
| `yarn typecheck` | TypeScript check without emit |
| `yarn test` | Vitest watch mode |
| `yarn test:run` | Single test run |
| `yarn test:coverage` | Run tests with coverage report; fails if < 80% |

**Consumer import pattern:**
```ts
import { FileDropZone } from 'non-dicom-importer-ui'
import 'non-dicom-importer-ui/style.css'
```

---

## 3. Project Structure

```
non-dicom-importer-ui/
├── src/
│   ├── components/
│   │   └── FileDropZone/              # Self-contained — copy folder to extract
│   │       ├── FileDropZone.tsx       # Component implementation
│   │       ├── FileDropZone.test.tsx  # Vitest + Testing Library tests
│   │       └── index.ts               # Local barrel
│   ├── styles/
│   │   └── index.css                  # Tailwind entry + @source directive
│   └── index.ts                       # Library barrel — add new components here
├── dev/                               # Dev sandbox (NOT shipped in dist)
│   ├── App.tsx
│   └── main.tsx
├── dist/                              # Build output (gitignored)
├── coverage/                          # Coverage reports (gitignored)
├── index.html                         # Vite dev server entry
├── vite.config.ts                     # Vite + library + Vitest + coverage config
├── vitest.setup.ts                    # Imports jest-dom matchers
├── tsconfig.json                      # Source TS config (noEmit)
├── tsconfig.node.json                 # Config-file TS settings
├── package.json                       # exports map, peerDeps, scripts
└── .gitignore
```

**Convention:** new components go under `src/components/<Name>/` with `<Name>.tsx`, `<Name>.test.tsx`, `index.ts`. Add the export to `src/index.ts`. The folder structure is intentionally self-contained so any component can later be lifted into its own package.

---

## 4. Recent Changes

- **9a7d098** — Initial project scaffold (root commit). React + TS + ESM library scaffold with Vite library mode, Tailwind v4, Vitest + v8 coverage at 80% threshold, FileDropZone starter component.

---

## 5. Known Issues & Notes

- **Yarn 1.x peer-dep hoisting:** `@testing-library/dom` had to be declared as an explicit dev dep because yarn 1 didn't hoist it through `@testing-library/react`. If switching to yarn 3+/pnpm, this can be revisited.
- **Vitest/coverage-v8 version pinning:** `vitest` and `@vitest/coverage-v8` must stay on matching major versions (currently both 4.1.6). Upgrades should bump them together.
- **Vite 6 + React plugin warnings:** the `@vitejs/plugin-react` build emits deprecation warnings about `esbuild` options being superseded by `oxc`. Harmless on Vite 6, will be cleaned up when the plugin updates.
- **Branch coverage at 88.88%:** the one uncovered branch is the `accept?.join(',')` optional chain on `FileDropZone` when `accept` is undefined. Above threshold, so not blocking.

---

## 6. Testing Instructions

**Quick verification (full pipeline):**
```bash
yarn install
yarn typecheck       # TS errors?
yarn test:coverage   # Tests pass + coverage ≥ 80%?
yarn build           # Clean library build with dts?
```

**Manual UI test:**
```bash
yarn dev
# Open the dev server URL (typically http://localhost:5173)
# Verify:
#  - FileDropZone renders with drop area
#  - Dragging files over highlights the border blue
#  - Dropping files lists their names below
#  - Clicking "browse" opens native file picker
```

**Library consumption sanity check** (after `yarn build`):
```bash
ls dist/
# Expected: index.js, index.css, index.d.ts
```

---

## 7. Next Steps / Potential Improvements

### Recommended next steps
1. **Define the importer's component surface** — flesh out the additional sub-components needed beyond `FileDropZone` (e.g. metadata form, project selector, import progress, results panel).
2. **Wire up XNAT API client** — decide whether to take it as a prop/dependency or bundle a thin client.
3. **Add ESLint + Prettier** — currently no linting beyond `tsc --noEmit`.
4. **CI pipeline** — GitHub Actions (or equivalent) running `typecheck` + `test:coverage` + `build` on PR.

### Optional enhancements
- Storybook (or Ladle) for visual component development beyond the single `dev/App.tsx` sandbox
- Bundle-size budget check in CI
- Publish dry-run / `npm pack` check to catch `exports` / `files` regressions
- Switch to yarn 3+ (Berry) with PnP or zero-installs once team is ready
- Tailwind theme tokens centralized in `src/styles/index.css` via `@theme`

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module '@testing-library/dom'` | Yarn 1 didn't hoist transitive peer dep | Already pinned as direct dev dep; reinstall: `yarn install` |
| `error TS2339: 'toBeInTheDocument' does not exist` during `yarn build` | dts plugin type-checking test files | Already excluded via `dts({ exclude: ['src/**/*.test.{ts,tsx}'] })` |
| Coverage below threshold blocks `test:coverage` | New code without tests | Add tests OR adjust threshold in `vite.config.ts` (intentional — don't lower silently) |
| `dist/style.css` not found by consumer | CSS file is actually `dist/index.css` | The `exports` map points `./style.css` → `./dist/index.css`; consumer should import `non-dicom-importer-ui/style.css` |
| Drag-and-drop tests fail with `dataTransfer is null` | Synthetic event missing `dataTransfer` | Use `fireEvent.drop(zone, { dataTransfer: { files: [...] } })` — see `FileDropZone.test.tsx` |

---

## 9. Git Repository

- **Status:** clean working tree on `main`
- **Branch:** `main` (root)
- **Remote:** none configured yet
- **Latest commit:** `9a7d098` — Initial project scaffold

---

## 10. Technologies Used

| Category | Tech | Version |
|---|---|---|
| Runtime | Node.js | 24.14.0 |
| Package manager | Yarn | 1.22.22 |
| Language | TypeScript | ^5.0.0 |
| UI framework | React | ^19.0.0 (peer) |
| Build tool | Vite | ^6.0.0 |
| Type declarations | vite-plugin-dts | ^4.0.0 |
| Styling | Tailwind CSS | ^4.0.0 |
| Tailwind integration | @tailwindcss/vite | ^4.0.0 |
| Test runner | Vitest | ^4.0.0 (4.1.6) |
| Coverage | @vitest/coverage-v8 | ^4.0.0 (4.1.6) |
| DOM test environment | jsdom | ^26.0.0 |
| Component testing | @testing-library/react | ^16.0.0 |
| DOM testing core | @testing-library/dom | ^10.0.0 |
| DOM matchers | @testing-library/jest-dom | ^6.0.0 |
| User interactions | @testing-library/user-event | ^14.0.0 |
| React Vite plugin | @vitejs/plugin-react | ^4.0.0 |
