import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import NumberBox from 'devextreme-react/number-box'
import SelectBox from 'devextreme-react/select-box'
import TextArea from 'devextreme-react/text-area'
import { useCan } from '@/auth/AuthContext'
import { portalTransferStock } from '@/api/mutations'
import { formatStorageUnitLabel, useMockStore } from '@/mocks/mockStore'
import './formPage.css'

export function StockTransferPage() {
  const navigate = useNavigate()
  const { stockPositions, products, storageUnits } = useMockStore()
  const perm = useCan('stockTransfer')

  const [fromStockPositionId, setFromStockPositionId] = useState<string | null>(null)
  const [toStorageUnitId, setToStorageUnitId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number | null>(1)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const positionOptions = useMemo(() => {
    return stockPositions
      .filter((pos) => {
        if (pos.quantity <= 0) return false
        const su = storageUnits.find((u) => u.id === pos.storageUnitId)
        return su?.kind !== 'custody'
      })
      .map((pos) => {
        const pr = products.find((p) => p.id === pos.productId)
        const su = storageUnits.find((u) => u.id === pos.storageUnitId)
        return {
          value: pos.id,
          text: `${pr?.sku ?? pos.productId} · ${formatStorageUnitLabel(su)} · qty ${pos.quantity}`,
        }
      })
  }, [stockPositions, products, storageUnits])

  const fromPos = stockPositions.find((p) => p.id === fromStockPositionId)

  const masterDataReady = products.length > 0 && storageUnits.length > 0
  const hasTransferableQty = stockPositions.some((p) => {
    if (p.quantity <= 0) return false
    const su = storageUnits.find((u) => u.id === p.storageUnitId)
    return su?.kind !== 'custody'
  })

  const storageOptions = useMemo(() => {
    return storageUnits
      .filter((u) => u.kind !== 'custody' && (!fromPos || u.id !== fromPos.storageUnitId))
      .map((u) => ({ value: u.id, text: `${u.code} — ${u.label}` }))
  }, [storageUnits, fromPos])

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to transfer stock.')
      return
    }
    if (!fromStockPositionId || !toStorageUnitId || quantity == null) {
      setError('Source position, destination storage, and quantity are required.')
      return
    }
    const result = await portalTransferStock({
      fromStockPositionId,
      toStorageUnitId,
      quantity,
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
        Moves quantity between non-custody storage units at the same site. Custody is updated only via{' '}
        <Link to="/assignments/new">Assignments</Link>.
      </p>
      {!masterDataReady ? (
        <p className="form-page__hint form-page__hint--warn">
          Add products and storage units first. <Link to="/products/new">New product</Link> ·{' '}
          <Link to="/stock/storage-units/new">New storage unit</Link>
        </p>
      ) : null}
      {masterDataReady && !hasTransferableQty ? (
        <p className="form-page__hint form-page__hint--warn">
          No stock positions with quantity yet. <Link to="/stock/receive">Receive stock</Link> or{' '}
          <Link to="/purchases">receive a purchase</Link>.
        </p>
      ) : null}
      <SelectBox
        label="From stock position"
        dataSource={positionOptions}
        displayExpr="text"
        valueExpr="value"
        value={fromStockPositionId}
        searchEnabled
        disabled={!masterDataReady || !hasTransferableQty}
        onValueChanged={(e) => setFromStockPositionId(e.value as string | null)}
      />
      <SelectBox
        label="To storage unit"
        dataSource={storageOptions}
        displayExpr="text"
        valueExpr="value"
        value={toStorageUnitId}
        searchEnabled
        disabled={!masterDataReady || !hasTransferableQty}
        onValueChanged={(e) => setToStorageUnitId(e.value as string | null)}
      />
      <NumberBox
        label="Quantity"
        value={quantity ?? undefined}
        min={1}
        showSpinButtons
        onValueChanged={(e) => setQuantity(e.value as number | null)}
      />
      <TextArea
        label="Note"
        value={note}
        height={80}
        onValueChanged={(e) => setNote(String(e.value ?? ''))}
      />
      <div className="form-page__actions">
        <Button
          text="Transfer"
          type="default"
          stylingMode="contained"
          disabled={!perm.create || !masterDataReady || !hasTransferableQty}
          onClick={submit}
        />
        <Button text="Cancel" onClick={() => navigate('/stock')} />
      </div>
    </div>
  )
}
