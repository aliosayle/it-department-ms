import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalAddProduct } from '@/api/mutations'
import type { ProductTrackingMode } from '@/mocks/domain/types'
import './formPage.css'

const trackingOptions = [
  { value: 'quantity' as const, text: 'Quantity (bulk stock)' },
  { value: 'serialized' as const, text: 'Serialized (MAC / serial per unit)' },
]

export function ProductNewPage() {
  const navigate = useNavigate()
  const perm = useCan('products')
  const [reference, setReference] = useState('')
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [trackingMode, setTrackingMode] = useState<ProductTrackingMode>('quantity')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to create products.')
      return
    }
    if (!reference.trim() || !name.trim()) {
      setError('Reference and name are required.')
      return
    }
    const res = await portalAddProduct({
      reference: reference.trim(),
      sku: sku.trim() || undefined,
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
    navigate(`/products/${res.product.id}/stock`)
  }

  return (
    <div className="form-page form-page--wide">
      <h1 style={{ marginTop: 0 }}>New product</h1>
      {error ? <p className="form-page__error">{error}</p> : null}
      <p className="form-page__hint">
        <Link to="/products">Products</Link> · <strong>Reference</strong> is your stable catalog code (unique).{' '}
        <strong>SKU</strong> is optional (vendor part number). Serialized products are received with MAC/serial via{' '}
        <code>POST /api/v1/inventory/receive-serialized</code> or purchase receive (auto placeholders per line qty).
        After saving, use <Link to="/stock/receive">Receive stock</Link> or <Link to="/purchases">Purchases</Link> for
        quantity items.
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
          disabled={!perm.create}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/products')} />
      </div>
    </div>
  )
}
