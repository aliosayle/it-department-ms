import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribeApiForbidden } from '@/api/forbiddenBus'

/** Navigates to `/access-denied` when the live API returns 403 (aligned with `PageGuard` UX). */
export function ApiForbiddenBridge() {
  const navigate = useNavigate()
  useEffect(() => {
    return subscribeApiForbidden(() => {
      navigate('/access-denied', { replace: true, state: { reason: 'api' as const } })
    })
  }, [navigate])
  return null
}
