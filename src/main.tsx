import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { warmup } from './api/client'
import './index.css'

// Start warming the backend immediately — by the time the user reads the
// login screen and submits, the free-tier instance has already booted.
warmup()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
