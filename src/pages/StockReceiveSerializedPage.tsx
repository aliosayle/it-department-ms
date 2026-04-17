import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextArea from 'devextreme-react/text-area'
import { useCan } from '@/auth/AuthContext'
import { portalReceiveSerialized } from '@/api/mutations'
import { usePortalBootstrap } from '@/api/usePortalBootstrap'
import { renderBootstrapGate } from '@/components/portal/BootstrapStatus'
import { productOptionText } from '@/domain/inventoryView'
import type { ReceiveStockReason } from '@/mocks/domain/types'
import './formPage.css'

const reasons: ReceiveStockReason[] = ['Purchase', 'Return', 'Transfer', 'Adjustment', 'Other']

export function StockReceiveSerializedPage() {
  const navigate = useNavigate()
  const b = usePortalBootstrap()
  const gate = renderBootstrapGate(b)
  const perm = useCan('stockReceive')

  const [productId, setProductId] = useState<string | null>(null)
  const [storageUnitId, setStorageUnitId] = useState<string | null>(null)
  const [identifiersText, setIdentifiersText] = useState('')
  const [reason, setReason] = useState<ReceiveStockReason>('Purchase')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const snapshot = b.snapshot
  const { products, storageUnits } = snapshot ?? { products: [], storageUnits: [] }

  const serializedProducts = useMemo(() => products.filter((p) => p.trackingMode === 'serialized'), [products])

  const productOptions = useMemo(
    () => serializedProducts.map((p) => ({ value: p.id, text: productOptionText(p) })),
    [serializedProducts],
  )

  const storageOptions = useMemo(
    () =>
      storageUnits
        .filter((u) => u.kind !== 'custody')
        .map((u) => ({ value: u.id, text: `${u.code} — ${u.label}` })),
    [storageUnits],
  )

  const masterDataReady =
    Boolean(snapshot) && serializedProducts.length > 0 && storageUnits.filter((u) => u.kind !== 'custody').length > 0

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to receive stock.')
      return
    }
    const identifiers = identifiersText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!productId || !storageUnitId || identifiers.length < 1) {
      setError('Product, storage unit, and at least one identifier (one per line) are required.')
      return
    }
    const result = await portalReceiveSerialized({
      productId,
      storageUnitId,
      identifiers,
      reason,
      note,
      purchaseId: null,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/stock')
  }

  if (gate) return gate

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}
      <p className="form-page__hint">
        Creates one asset per MAC or serial for <strong>serialized</strong> products. Custody bins are excluded — same
        rules as <Link to="/stock/receive">bulk receive</Link>. For purchase-driven custody receives, use{' '}
        <Link to="/purchases">Purchases</Link>.
      </p>
      {!masterDataReady ? (
        <p className="form-page__hint form-page__hint--warn">
          You need at least one <strong>serialized</strong> product and one non-custody storage unit.{' '}
          <Link to="/products/new">New product</Link> (tracking: serialized) ·{' '}
          <Link to="/stock/storage-units/new">New storage unit</Link>
        </p>
      ) : null}
      <p className="form-page__section" style={{ marginTop: '0.5rem' }}>
        Product and location
      </p>
      <SelectBox
        label="Product (serialized)"
        dataSource={productOptions}
        displayExpr="text"
        valueExpr="value"
        value={productId}
        searchEnabled
        disabled={!masterDataReady}
        onValueChanged={(e) => setProductId(e.value as string | null)}
      />
      <SelectBox
        label="Storage unit"
        dataSource={storageOptions}
        displayExpr="text"
        valueExpr="value"
        value={storageUnitId}
        searchEnabled
        disabled={!masterDataReady}
        onValueChanged={(e) => setStorageUnitId(e.value as string | null)}
      />
      <TextArea
        label="Identifiers (one MAC or serial per line)"
        value={identifiersText}
        height={140}
        onValueChanged={(e) => setIdentifiersText(String(e.value ?? ''))}
      />
      <p className="form-page__section" style={{ marginTop: '0.75rem' }}>
        Classification
      </p>
      <SelectBox
        label="Reason"
        dataSource={reasons}
        value={reason}
        onValueChanged={(e) => setReason(e.value as ReceiveStockReason)}
      />
      <TextArea label="Note" value={note} height={80} onValueChanged={(e) => setNote(String(e.value ?? ''))} />
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.create || !masterDataReady}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/stock')} />
      </div>
    </div>
  )
}
