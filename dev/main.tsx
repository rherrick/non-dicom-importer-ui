import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installDevAuth } from './installDevAuth'

installDevAuth({
  baseUrl: import.meta.env.VITE_XNAT_BASE_URL as string | undefined,
  username: import.meta.env.VITE_XNAT_USERNAME as string | undefined,
  password: import.meta.env.VITE_XNAT_PASSWORD as string | undefined,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
