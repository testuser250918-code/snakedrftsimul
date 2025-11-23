import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initAnalytics } from './utils/analytics'

// Initialize Analytics
initAnalytics();

ReactDOM.createRoot(document.getElementById('app')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
