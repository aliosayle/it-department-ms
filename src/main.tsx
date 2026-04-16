import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import config from 'devextreme/core/config'
import 'devextreme/dist/css/dx.light.css'
import './styles/devextreme-license-fix.css'
import './styles/tokens.css'
import './index.css'
import App from '@/app/App'
import { DEVEXTREME_LICENSE_KEY } from '@/config/license'
import { queryClient } from '@/lib/queryClient'

config({ licenseKey: DEVEXTREME_LICENSE_KEY })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
