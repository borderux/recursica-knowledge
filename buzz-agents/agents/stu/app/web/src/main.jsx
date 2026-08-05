import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@mantine/core/styles.css'
import './index.css'
// Written into web/ by @recursica/official-release's postinstall, not stored in this repo.
import '../recursica_variables_scoped.css'
import '@recursica/mantine-adapter/style.css'
import { MantineProvider } from '@mantine/core'
import { RecursicaThemeProvider } from '@recursica/mantine-adapter'
import { BrowserRouter } from 'react-router'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider>
      <RecursicaThemeProvider theme="light">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </RecursicaThemeProvider>
    </MantineProvider>
  </StrictMode>,
)
