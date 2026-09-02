import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/app.css'
import { App } from './App'
import { handleRedirectIfPresent } from './dropbox/authClient'
import { useAppStore } from './store/useAppStore'

async function bootstrap() {
  try {
    await handleRedirectIfPresent()
  } catch (err) {
    console.error('Login Dropbox fallito:', err)
  }
  await useAppStore.getState().init()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
