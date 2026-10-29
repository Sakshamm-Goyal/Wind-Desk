import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'

// Data is a fixed snapshot: cache forever, never refetch on focus.
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode><QueryClientProvider client={qc}><App /></QueryClientProvider></StrictMode>,
)
