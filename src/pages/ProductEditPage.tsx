import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalUpdateProduct } from '@/api/mutations'
import { usePortalBootstrap } from '@/api/usePortalBootstrap'
import { renderBootstrapGate } from '@/components/portal/BootstrapStatus'
import { getProductByIdFromState } from '@/domain/inventoryView'
import type { ProductTrackingMode } from '@/mocks/domain/types'
import type { StoreState } from '@/mocks/mockStore'
import './formPage.css'

const trackingOptions = [
  { value: 'quantity' as const, text: 'Quantity (bulk stock)' },
  { value: 'serialized' as const, text: 'Serialized (MAC / serial per unit)' },
]

function trackingChangeBlocked(snapshot: StoreState, productId: string): boolean {
  const qty = snapshot.stockPositions.some((p) => p.productId === productId && p.quantity > 0)
  const ser = snapshot.serializedAssets.some((a) => a.productId === productId)
  return qty || ser
}

export function ProductEditPage() {
  const navigate = useNavigate()
  const { productId = '' } = useParams<{ productId: string }>()
  const b = usePortalBootstrap()
  const gate = renderBootstrapGate(b)
  const perm = useCan('products')

  const [reference, setReference] = useState('')
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [trackingMode, setTrackingMode] = useState<ProductTrackingMode>('quantity')
  const [error, setError] = useState<string | null>(null)

  const snapshot = b.snapshot
  const product = snapshot && productId ? getProductByIdFromState(snapshot, productId) : undefined
  const trackingLocked = snapshot && productId ? trackingChangeBlocked(snapshot, productId) : true

  useEffect(() => {
    if (!product) return
    setReference(product.reference)
    setSku(product.sku ?? '')
    setName(product.name)
    setBrand(product.brand)
    setCategory(product.category)
    setDescription(product.description)
    setTrackingMode(product.trackingMode)
  }, [product])

  if (gate) return gate

  if (!snapshot) {
    return (
      <div className="form-page form-page--wide">
        <h1 style={{ marginTop: 0 }}>Edit product</h1>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="form-page form-page--wide">
        <h1 style={{ marginTop: 0 }}>Edit product</h1>
        <p className="form-page__hint form-page__hint--warn">
          Product not found. <Link to="/products">Back to products</Link>
        </p>
      </div>
    )
  }

  const submit = async () => {
    setError(null)
    if (!perm.edit) {
      setError('You do not have permission to edit products.')
      return
    }
    if (!reference.trim() || !name.trim()) {
      setError('Reference and name are required.')
      return
    }
    const res = await portalUpdateProduct(productId, {
      reference: reference.trim(),
      sku: sku.trim() === '' ? null : sku.trim(),
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      description: description.trim(),
      trackingMode,
    })
    if (!res.ok) {
      setError(res.error)
      return
    }
    navigate(`/products/${productId}/reports`)
  }

  return (
    <div className="form-page form-page--wide">
      <h1 style={{ marginTop: 0 }}>Edit product</h1>
      {error ? <p className="form-page__error">{error}</p> : null}
      <p className="form-page__hint">
        <Link to={`/products/${productId}/reports`}>Product</Link> · <strong>Reference</strong> is your stable catalog
        code (unique). <strong>SKU</strong> is optional.
        {trackingLocked ? (
          <> Tracking mode cannot be changed while this product has on-hand quantity or serialized units.</>
        ) : null}
      </p>
      <TextBox
        label="Reference (required, unique)"
        value={reference}
        onValueChanged={(e) => setReference(String(e.value ?? ''))}
      />
      <TextBox label="SKU (optional)" value={sku} onValueChanged={(e) => setSku(String(e.value ?? ''))} />
      <TextBox label="Name" value={name} onValueChanged={(e) => setName(String(e.value ?? ''))} />
      <SelectBox
        label="Tracking mode"
        dataSource={trackingOptions}
        displayExpr="text"
        valueExpr="value"
        value={trackingMode}
        readOnly={trackingLocked}
        onValueChanged={(e) => setTrackingMode(e.value as ProductTrackingMode)}
      />
      <TextBox label="Brand" value={brand} onValueChanged={(e) => setBrand(String(e.value ?? ''))} />
      <TextBox label="Category" value={category} onValueChanged={(e) => setCategory(String(e.value ?? ''))} />
      <TextBox label="Description" value={description} onValueChanged={(e) => setDescription(String(e.value ?? ''))} />
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.edit}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate(`/products/${productId}/reports`)} />
      </div>
    </div>
  )
}
