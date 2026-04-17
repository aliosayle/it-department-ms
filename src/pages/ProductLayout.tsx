import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useCan } from '@/auth/AuthContext'
import '@/pages/productLayout.css'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `product-layout__tab${isActive ? ' product-layout__tab--active' : ''}`

export function ProductLayout() {
  const { productId } = useParams<{ productId: string }>()
  const base = `/products/${productId}`
  const productsPerm = useCan('products')

  return (
    <div className="product-layout">
      <nav className="product-layout__tabs" aria-label="Product sections">
        {productsPerm.edit ? (
          <NavLink to={`${base}/edit`} className={tabClass}>
            Edit catalog
          </NavLink>
        ) : null}
        <NavLink to={`${base}/reports`} className={tabClass} end>
          Reports
        </NavLink>
        <NavLink to={`${base}/history`} className={tabClass}>
          History
        </NavLink>
        <NavLink to={`${base}/stock`} className={tabClass}>
          Stock
        </NavLink>
        <NavLink to={`${base}/storage`} className={tabClass}>
          Storage
        </NavLink>
        <NavLink to={`${base}/purchases`} className={tabClass}>
          Purchases
        </NavLink>
      </nav>
      <div className="product-layout__outlet">
        <Outlet />
      </div>
    </div>
  )
}
