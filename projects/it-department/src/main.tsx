import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import config from 'devextreme/core/config'
import 'devextreme/dist/css/dx.light.css'
import './styles/devextreme-license-fix.css'
import './styles/tokens.css'
import './index.css'
import App from '@/app/App'
import { DEVEXTREME_LICENSE_KEY } from '@/config/license'

config({ licenseKey: DEVEXTREME_LICENSE_KEY })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
