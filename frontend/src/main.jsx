import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <App />
      <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1e2035',
          color: '#e2e8f0',
          border: '1px solid #2d3154'
        }
      }}
    />
    </ThemeProvider>
  </BrowserRouter>
)
