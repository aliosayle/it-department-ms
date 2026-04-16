import { Navigate, useParams } from 'react-router-dom'

export function ProductTabRedirect() {
  const { productId } = useParams<{ productId: string }>()
  return <Navigate to={`/products/${productId}/reports`} replace />
}
