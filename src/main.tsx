import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { useAuth, handleUnauthorized } from './store/useAuth'
import './index.css'

void useAuth.getState().check()
window.addEventListener('auth:unauthorized', handleUnauthorized)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
