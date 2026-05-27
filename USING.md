# Using non-dicom-importer-ui

This guide walks through embedding the importer in the three host environments it's designed for: a React application, a server-rendered HTML/JSP page (the most common XNAT scenario), and an Electron shell.

There are two common host environments. Pick the one that matches yours.

## A) From another React app

The library ships an ESM bundle plus a CSS file, with `react` / `react-dom` as peer deps. So in any React 18/19 app:

```ts
import { ImportForm } from 'non-dicom-importer-ui'
import 'non-dicom-importer-ui/style.css'

export function Page() {
  return <ImportForm onSubmit={(data) => upload(data)} />
}
```

The bundler in the host app (Vite, Next, webpack, etc.) handles everything from there.

**Caveat: it isn't published yet** (`package.json` has no registry config and the version is `0.0.1`). For local consumption right now:

```bash
# In this repo
yarn build
yarn pack            # produces non-dicom-importer-ui-v0.0.1.tgz

# In the consuming app
yarn add /absolute/path/to/non-dicom-importer-ui-v0.0.1.tgz
```

Or symlink with `yarn link` during dev.

## B) From a server-rendered HTML/JSP page (likely the XNAT path)

XNAT pages aren't React apps — they're JSP/HTML with whatever scripts the page includes. To drop the importer onto one of them:

### Step 1 — Build and host the assets

```bash
yarn build
# Copies needed:
#   dist/non-dicom-importer.js   → /assets/non-dicom-importer-ui/non-dicom-importer.js
#   dist/non-dicom-importer.css  → /assets/non-dicom-importer-ui/non-dicom-importer.css
```

Serve those two files as static assets from XNAT (any path under `webapp/` works).

### Step 2 — Add a mount point and a tiny loader to the JSP page

The library bundle is ESM and externalizes React, so the page needs to (a) include React/ReactDOM as ES modules and (b) link them by bare specifier. Modern browsers solve both with an import map:

```html
<link rel="stylesheet" href="/assets/non-dicom-importer-ui/non-dicom-importer.css">

<div id="importer-root"></div>

<script type="importmap">
{
  "imports": {
    "react":          "https://esm.sh/react@19.0.0",
    "react-dom":      "https://esm.sh/react-dom@19.0.0",
    "react-dom/client": "https://esm.sh/react-dom@19.0.0/client",
    "react/jsx-runtime": "https://esm.sh/react@19.0.0/jsx-runtime"
  }
}
</script>

<script type="module">
  import React from 'react'
  import { createRoot } from 'react-dom/client'
  import { ImportForm } from '/assets/non-dicom-importer-ui/non-dicom-importer.js'

  const root = createRoot(document.getElementById('importer-root'))
  root.render(
    React.createElement(ImportForm, {
      onSubmit: (data) => {
        console.log('upload payload', data)
        // hand off to your upload flow
      },
    })
  )
</script>
```

If you'd rather not pull React from a CDN, host the two React UMD/ESM files yourself and point the import map at those URLs instead. The only requirement is that the bare specifiers `react`, `react-dom`, `react-dom/client`, and `react/jsx-runtime` resolve to the same React installation.

### Step 3 — Auth and base URL

Because the page is served from the XNAT origin, the components emit relative URLs like `/data/projects` and inherit the XNAT session cookie via `credentials: 'include'`. No `baseUrl` prop, no `Authorization` header, nothing else to configure. That's the whole reason the library has no auth knowledge of its own.

If you ever embed it on a *different* origin (e.g., a separate admin app), pass `baseUrl="https://xnat.example/"` to `<ImportForm />` and arrange for the host to provide credentials (typically a same-site session cookie, or a reverse proxy like the dev sandbox uses).

## C) For an Electron shell

Same as (A), but you also control the network layer — your preload script (or main process) can short-circuit fetches that match `/data/...` and route them through whatever XNAT auth/session you've already established. The relative-URL convention makes that trivial.

---

A few practical notes:

- **The bundle is small** (~15 KB JS gzipped, ~3 KB CSS gzipped, excluding React). It's fine to load on a JSP page that doesn't need it on every navigation, but you'll probably want lazy loading if you're embedding into XNAT's main shell.
- **Tailwind styles are scoped to component class names** in the emitted CSS, so they shouldn't fight existing XNAT page styles. If you do see bleed (e.g., a global `box-sizing` reset), the fix is to load the importer's CSS *after* XNAT's, or wrap the mount in a scoping class.
- **Hot reload during integration**: it's usually easier to debug the importer in `yarn dev` (where the Vite proxy + Basic auth env vars already work) than in JSP. Get the UI right against a real XNAT in the sandbox, then ship the built `dist/` to XNAT's static assets.
