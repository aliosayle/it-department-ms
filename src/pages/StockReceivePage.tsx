import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import NumberBox from 'devextreme-react/number-box'
import SelectBox from 'devextreme-react/select-box'
import TextArea from 'devextreme-react/text-area'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalReceiveStock } from '@/api/mutations'
import { useMockStore } from '@/mocks/mockStore'
import type { ReceiveStockReason } from '@/mocks/domain/types'
import './formPage.css'

const reasons: ReceiveStockReason[] = ['Purchase', 'Return', 'Transfer', 'Adjustment', 'Other']

export function StockReceivePage() {
  const navigate = useNavigate()
  const { products, storageUnits } = useMockStore()
  const perm = useCan('stockReceive')

  const [productId, setProductId] = useState<string | null>(null)
  const [storageUnitId, setStorageUnitId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number | null>(1)
  const [status, setStatus] = useState('Available')
  const [reason, setReason] = useState<ReceiveStockReason>('Purchase')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const productOptions = useMemo(
    () => products.map((p) => ({ value: p.id, text: `${p.sku} — ${p.name}` })),
    [products],
  )

  const storageOptions = useMemo(
    () => storageUnits.map((u) => ({ value: u.id, text: `${u.code} — ${u.label}` })),
    [storageUnits],
  )

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to receive stock.')
      return
    }
    if (!productId || !storageUnitId || quantity == null) {
      setError('Product, storage unit, and quantity are required.')
      return
    }
    const result = await portalReceiveStock({
      productId,
      storageUnitId,
      quantity,
      status: status.trim(),
      reason,
      note,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/stock')
  }

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}
      <p className="form-page__hint">
        Records inbound quantity against a storage location and updates the inventory ledger. For
        supplier shipments with a delivery note (bon), use{' '}
        <Link to="/purchases">Purchases</Link> to receive lines so movements stay tied to the order.{' '}
        <Link to="/master-data/suppliers">Suppliers</Link>.
      </p>
      <p className="form-page__section" style={{ marginTop: '0.5rem' }}>
        Product and location
      </p>
      <SelectBox
        label="Product"
        dataSource={productOptions}
        displayExpr="text"
        valueExpr="value"
        value={productId}
        searchEnabled
        onValueChanged={(e) => setProductId(e.value as string | null)}
      />
      <SelectBox
        label="Storage unit"
        dataSource={storageOptions}
        displayExpr="text"
        valueExpr="value"
        value={storageUnitId}
        searchEnabled
        onValueChanged={(e) => setStorageUnitId(e.value as string | null)}
      />
      <NumberBox
        label="Quantity"
        value={quantity ?? undefined}
        min={1}
        showSpinButtons
        onValueChanged={(e) => setQuantity(e.value as number | null)}
      />
      <p className="form-page__section" style={{ marginTop: '0.75rem' }}>
        Classification
      </p>
      <TextBox
        label="Status"
        value={status}
        onValueChanged={(e) => setStatus(String(e.value ?? ''))}
      />
      <SelectBox
        label="Reason"
        dataSource={reasons}
        value={reason}
        onValueChanged={(e) => setReason(e.value as ReceiveStockReason)}
      />
      <TextArea
        label="Note"
        value={note}
        height={80}
        onValueChanged={(e) => setNote(String(e.value ?? ''))}
      />
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.create}
          onClick={submit}
        />
        <Button text="Cancel" onClick={() => navigate('/stock')} />
      </div>
    </div>
  )
}
