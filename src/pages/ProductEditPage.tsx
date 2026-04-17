import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalUpdateProduct } from '@/api/mutations'
import { usePortalBootstrap } from '@/api/usePortalBootstrap'
import { renderBootstrapGate } from '@/components/portal/BootstrapStatus'
import { DefinitionList, DlRow } from '@/components/forms/DefinitionList'
import { EntityFormPage } from '@/components/forms/EntityFormPage'
import { getProductByIdFromState } from '@/domain/inventoryView'
import type { Product, ProductTrackingMode } from '@/mocks/domain/types'
import type { StoreState } from '@/mocks/mockStore'
import '@/pages/formPage.css'

const trackingOptions = [
  { value: 'quantity' as const, text: 'Quantity (bulk stock)' },
  { value: 'serialized' as const, text: 'Serialized (MAC / serial per unit)' },
]

function trackingChangeBlocked(snapshot: StoreState, productId: string): boolean {
  const qty = snapshot.stockPositions.some((p) => p.productId === productId && p.quantity > 0)
  const ser = snapshot.serializedAssets.some((a) => a.productId === productId)
  return qty || ser
}

function trackingLabel(mode: ProductTrackingMode): string {
  return mode === 'serialized' ? 'Serialized (MAC / serial per unit)' : 'Quantity (bulk stock)'
}

function hydrateFromProduct(p: Product, setters: {
  setReference: (v: string) => void
  setSku: (v: string) => void
  setName: (v: string) => void
  setBrand: (v: string) => void
  setCategory: (v: string) => void
  setDescription: (v: string) => void
  setTrackingMode: (v: ProductTrackingMode) => void
}) {
  setters.setReference(p.reference)
  setters.setSku(p.sku ?? '')
  setters.setName(p.name)
  setters.setBrand(p.brand)
  setters.setCategory(p.category)
  setters.setDescription(p.description)
  setters.setTrackingMode(p.trackingMode)
}

export function ProductEditPage() {
  const navigate = useNavigate()
  const { productId = '' } = useParams<{ productId: string }>()
  const b = usePortalBootstrap()
  const gate = renderBootstrapGate(b)
  const perm = useCan('products')

  const [mode, setMode] = useState<'view' | 'edit'>('view')
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

  const resetDraft = useCallback(() => {
    if (!product) return
    hydrateFromProduct(product, {
      setReference,
      setSku,
      setName,
      setBrand,
      setCategory,
      setDescription,
      setTrackingMode,
    })
  }, [product])

  useEffect(() => {
    if (!product) return
    hydrateFromProduct(product, {
      setReference,
      setSku,
      setName,
      setBrand,
      setCategory,
      setDescription,
      setTrackingMode,
    })
  }, [product])

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
    setMode('view')
    setError(null)
  }

  if (gate) return gate

  if (!snapshot) {
    return (
      <EntityFormPage title="Edit product" wide>
        <p className="form-page__hint">Loading…</p>
      </EntityFormPage>
    )
  }

  if (!product) {
    return (
      <EntityFormPage
        title="Product"
        subtitle="This catalog entry could not be found."
        wide
        toolbar={<Button text="Back to catalog" onClick={() => navigate('/products')} />}
      >
        <p className="form-page__hint form-page__hint--warn">
          <Link to="/products">Return to products</Link>
        </p>
      </EntityFormPage>
    )
  }

  const breadcrumbs = (
    <>
      <Link to="/products">Products</Link>
      {' · '}
      <Link to={`/products/${productId}/reports`}>{product.reference}</Link>
    </>
  )

  const toolbar = (
    <>
      {mode === 'view' ? (
        <>
          <Button text="Back to product" onClick={() => navigate(`/products/${productId}/reports`)} />
          {perm.edit ? (
            <Button
              text="Edit"
              type="default"
              stylingMode="contained"
              onClick={() => {
                setError(null)
                resetDraft()
                setMode('edit')
              }}
            />
          ) : null}
        </>
      ) : (
        <>
          <Button
            text="Cancel"
            onClick={() => {
              setError(null)
              resetDraft()
              setMode('view')
            }}
          />
          <Button
            text="Save changes"
            type="default"
            stylingMode="contained"
            disabled={!perm.edit}
            onClick={() => void submit()}
          />
        </>
      )}
    </>
  )

  const hint =
    mode === 'edit'
      ? 'Reference is the stable catalog code (unique). SKU is optional.' +
          (trackingLocked ? ' Tracking mode is locked while quantity or serialized units exist.' : '')
      : 'Review catalog fields below. Use Edit to change them.'

  return (
    <EntityFormPage
      title={mode === 'view' ? 'Product details' : 'Edit product'}
      subtitle={hint}
      breadcrumbs={breadcrumbs}
      toolbar={toolbar}
      error={error}
      wide
    >
      {mode === 'view' ? (
        <DefinitionList>
          <DlRow label="Reference" value={product.reference} />
          <DlRow label="SKU" value={product.sku} />
          <DlRow label="Name" value={product.name} />
          <DlRow label="Tracking" value={trackingLabel(product.trackingMode)} />
          <DlRow label="Brand" value={product.brand} />
          <DlRow label="Category" value={product.category} />
          <DlRow label="Description" value={product.description} />
        </DefinitionList>
      ) : (
        <div className="entity-form-page__body entity-form-page__body--fields">
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
        </div>
      )}
    </EntityFormPage>
  )
}
