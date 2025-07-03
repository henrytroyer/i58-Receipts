import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { GlobalStateProvider } from './contexts/GlobalStateContext'
import { AuthProvider } from './contexts/AuthContext'
import { BudgetProvider } from './contexts/BudgetContext'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { registerSW } from 'virtual:pwa-register'

const root = createRoot(document.getElementById('root')!)

const theme = createTheme({
  palette: {
    primary: {
      main: '#232946',
    },
    secondary: {
      main: '#3b6ea5',
    },
  },
})

// Log the environment variable to verify it's loaded
console.log("VITE_GOOGLE_APPS_SCRIPT_URL at startup:", import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL);

root.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <GlobalStateProvider>
        <AuthProvider>
          <BudgetProvider>
            <App />
          </BudgetProvider>
        </AuthProvider>
      </GlobalStateProvider>
    </LocalizationProvider>
  </ThemeProvider>
)

// Register service worker
registerSW()
