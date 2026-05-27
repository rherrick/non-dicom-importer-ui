import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installDevAuth } from './installDevAuth'

// Components now emit relative URLs (the Vite dev server proxies them to
// VITE_XNAT_BASE_URL), so the dev auth helper attaches Basic creds to
// same-origin requests — no baseUrl needed.
installDevAuth({
  username: import.meta.env.VITE_XNAT_USERNAME as string | undefined,
  password: import.meta.env.VITE_XNAT_PASSWORD as string | undefined,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
