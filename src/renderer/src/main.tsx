/** Renderer entry: mount the React app. */
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.js'
import ErrorBoundary from './components/ErrorBoundary.js'
import './index.css'

// Report uncaught errors / rejections to the main-process log.
window.addEventListener('error', (e) => window.api?.app.reportError(String(e.error ?? e.message)))
window.addEventListener('unhandledrejection', (e) =>
  window.api?.app.reportError(String(e.reason))
)

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
