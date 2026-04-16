import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalAddProduct } from '@/api/mutations'
import './formPage.css'

export function ProductNewPage() {
  const navigate = useNavigate()
  const perm = useCan('products')
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to create products.')
      return
    }
    if (!sku.trim() || !name.trim()) {
      setError('SKU and name are required.')
      return
    }
    const res = await portalAddProduct({
      sku: sku.trim(),
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      description: description.trim(),
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
        SKU must be unique across the catalog. After saving, use <strong>Receive stock</strong> or{' '}
        <strong>Purchases</strong> to put quantities on hand.
      </p>
      <TextBox label="SKU" value={sku} onValueChanged={(e) => setSku(String(e.value ?? ''))} />
      <TextBox label="Name" value={name} onValueChanged={(e) => setName(String(e.value ?? ''))} />
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
