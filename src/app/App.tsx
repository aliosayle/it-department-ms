import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { enableEvalWatermarkMitigation } from '@/config/license'
import { hideDevExtremeWatermark } from '@/utils/hideDevExtremeWatermark'
import { AppRoutes } from './router'

export default function App() {
  useEffect(() => {
    if (!enableEvalWatermarkMitigation()) return
    return hideDevExtremeWatermark()
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
