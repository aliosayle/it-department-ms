import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import DateBox from 'devextreme-react/date-box'
import NumberBox from 'devextreme-react/number-box'
import SelectBox from 'devextreme-react/select-box'
import TextArea from 'devextreme-react/text-area'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalCreatePurchase } from '@/api/mutations'
import { useMockStore } from '@/mocks/mockStore'
import './formPage.css'

type LineDraft = {
  productId: string | null
  quantity: number | null
  unitPrice: number | null
  storageUnitId: string | null
}

const emptyLine = (): LineDraft => ({
  productId: null,
  quantity: 1,
  unitPrice: 0,
  storageUnitId: null,
})

export function PurchaseNewPage() {
  const navigate = useNavigate()
  const { suppliers, personnel, sites, companies, products, storageUnits } = useMockStore()
  const perm = useCan('purchases')

  const [bonNumber, setBonNumber] = useState('')
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState('')
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [siteId, setSiteId] = useState<string | null>(null)
  const [issuedByPersonnelId, setIssuedByPersonnelId] = useState<string | null>(null)
  const [orderedAt, setOrderedAt] = useState<Date | null>(new Date())
  const [expectedAt, setExpectedAt] = useState<Date | null>(null)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()])
  const [receiveImmediately, setReceiveImmediately] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (siteId !== null || sites.length === 0) return
    setSiteId(sites[0].id)
  }, [sites, siteId])

  useEffect(() => {
    if (!siteId) return
    setIssuedByPersonnelId((pid) => {
      if (pid && personnel.some((p) => p.id === pid && p.siteId === siteId)) return pid
      return personnel.find((p) => p.siteId === siteId)?.id ?? null
    })
  }, [siteId, personnel])

  useEffect(() => {
    if (!siteId) return
    setLines((prev) =>
      prev.map((line) => {
        if (!line.storageUnitId) return line
        const u = storageUnits.find((x) => x.id === line.storageUnitId)
        if (u?.siteId === siteId) return line
        return { ...line, storageUnitId: null }
      }),
    )
  }, [siteId, storageUnits])

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: s.id, text: s.name })),
    [suppliers],
  )

  const siteOptions = useMemo(
    () =>
      sites.map((s) => {
        const co = companies.find((c) => c.id === s.companyId)
        return { value: s.id, text: `${s.name} — ${co?.name ?? ''}` }
      }),
    [sites, companies],
  )

  const issuerOptions = useMemo(() => {
    if (!siteId) return []
    return personnel
      .filter((p) => p.siteId === siteId)
      .map((p) => ({ value: p.id, text: `${p.fullName} <${p.email}>` }))
  }, [personnel, siteId])

  const productOptions = useMemo(
    () => products.map((p) => ({ value: p.id, text: `${p.sku} — ${p.name}` })),
    [products],
  )

  const storageOptions = useMemo(() => {
    if (!siteId) return []
    const atSite = storageUnits.filter((u) => u.siteId === siteId)
    const warehouse = atSite
      .filter((u) => u.kind !== 'custody')
      .map((u) => ({ value: u.id, text: `${u.code} — ${u.label}` }))
    const custody = atSite
      .filter((u) => u.kind === 'custody' && u.personnelId)
      .map((u) => {
        const p = personnel.find((x) => x.id === u.personnelId)
        const who = p?.fullName ?? u.personnelId ?? '—'
        return { value: u.id, text: `Custody: ${u.code} — ${u.label} (${who})` }
      })
    return [...custody, ...warehouse]
  }, [storageUnits, siteId, personnel])

  const addLine = () => setLines((prev) => [...prev, emptyLine()])
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx))

  const setLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to create purchases.')
      return
    }
    if (!supplierId) {
      setError('Supplier is required.')
      return
    }
    if (!siteId || !issuedByPersonnelId) {
      setError('Site and issued-by personnel are required.')
      return
    }
    if (!orderedAt) {
      setError('Order date is required.')
      return
    }
    const orderedStr = orderedAt.toISOString().slice(0, 10)
    const expectedStr = expectedAt ? expectedAt.toISOString().slice(0, 10) : null

    const normalizedLines = lines
      .filter((l) => l.productId && l.storageUnitId && l.quantity != null && l.quantity >= 1)
      .map((l) => ({
        productId: l.productId!,
        storageUnitId: l.storageUnitId!,
        quantity: Math.floor(l.quantity!),
        unitPrice: Number(l.unitPrice ?? 0),
      }))

    if (normalizedLines.length < 1) {
      setError('Add at least one complete line (product, storage at this site, quantity ≥ 1).')
      return
    }

    const result = await portalCreatePurchase({
      bonNumber,
      supplierInvoiceRef,
      supplierId: supplierId ?? '',
      issuedByPersonnelId: issuedByPersonnelId ?? '',
      siteId: siteId ?? '',
      orderedAt: orderedStr,
      expectedAt: expectedStr,
      notes,
      receiveImmediately,
      lines: normalizedLines,
    })

    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(`/purchases/${result.purchase.id}`)
  }

  const prerequisites =
    suppliers.length > 0 && sites.length > 0 && personnel.length > 0 && products.length > 0 && storageUnits.length > 0

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}
      <p className="form-page__hint">
        <Link to="/purchases">Purchases</Link> · <Link to="/master-data/suppliers">Suppliers</Link> ·{' '}
        <Link to="/products/new">New product</Link> · <Link to="/stock/storage-units/new">New storage unit</Link>
      </p>

      {!prerequisites ? (
        <p className="form-page__hint form-page__hint--warn">
          You need suppliers, sites, personnel, products, and storage units. Storage on each line must belong to the
          selected site.
        </p>
      ) : null}

      <p className="form-page__section" style={{ marginTop: '1rem' }}>
        Commercial references
      </p>
      <TextBox
        label="Delivery note number (bon / GRN) — required"
        value={bonNumber}
        onValueChanged={(e) => setBonNumber(String(e.value ?? ''))}
      />
      <TextBox
        label="Supplier invoice / quote ref (optional)"
        value={supplierInvoiceRef}
        onValueChanged={(e) => setSupplierInvoiceRef(String(e.value ?? ''))}
      />
      <SelectBox
        label="Supplier"
        dataSource={supplierOptions}
        displayExpr="text"
        valueExpr="value"
        value={supplierId}
        searchEnabled
        onValueChanged={(e) => setSupplierId(e.value as string | null)}
      />
      <p className="form-page__section" style={{ marginTop: '1rem' }}>
        Receipt context
      </p>
      <SelectBox
        label="Site (receipt context — lines must use storage at this site)"
        dataSource={siteOptions}
        displayExpr="text"
        valueExpr="value"
        value={siteId}
        searchEnabled
        onValueChanged={(e) => {
          setSiteId(e.value as string | null)
          setIssuedByPersonnelId(null)
        }}
      />
      <SelectBox
        label="Issued by (internal — must be at this site)"
        dataSource={issuerOptions}
        displayExpr="text"
        valueExpr="value"
        value={issuedByPersonnelId}
        searchEnabled
        onValueChanged={(e) => setIssuedByPersonnelId(e.value as string | null)}
      />
      {siteId && storageOptions.length === 0 ? (
        <p className="form-page__hint form-page__hint--warn">
          No storage units at this site. <Link to="/stock/storage-units/new">Add one</Link> with the same site.
        </p>
      ) : null}
      <p className="form-page__section" style={{ marginTop: '1rem' }}>
        Schedule
      </p>
      <DateBox
        label="Order date"
        type="date"
        value={orderedAt}
        onValueChanged={(e) => setOrderedAt(e.value as Date | null)}
      />
      <DateBox
        label="Expected delivery (optional)"
        type="date"
        value={expectedAt}
        onValueChanged={(e) => setExpectedAt(e.value as Date | null)}
      />
      <TextArea label="Notes" value={notes} height={72} onValueChanged={(e) => setNotes(String(e.value ?? ''))} />

      <p className="form-page__section" style={{ marginTop: '1rem' }}>
        Receiving
      </p>
      <label className="form-page__checkbox-row">
        <input
          type="checkbox"
          checked={receiveImmediately}
          onChange={(e) => setReceiveImmediately(e.target.checked)}
        />{' '}
        Receive into stock immediately (skip the separate receive step). If unchecked, use Receive on the purchase
        detail page when goods arrive; purchase receive is required for lines that target custody.
      </label>

      <p className="form-page__section" style={{ marginTop: '1.25rem' }}>
        Line items — receipt destination
      </p>
      {prerequisites ? (
        <p className="form-page__hint">
          Each line is where that quantity will post when the purchase is received: site bins for warehouse stock, or a
          labeled <strong>Custody</strong> row to book goods straight to a holder (same site). Custody posting always
          happens through purchase receive, not the generic stock-receive screen.
        </p>
      ) : null}
      {lines.map((line, idx) => (
        <div
          key={idx}
          style={{
            display: 'grid',
            gap: 8,
            marginBottom: 12,
            padding: 12,
            border: '1px solid var(--color-border, #ddd)',
            borderRadius: 8,
          }}
        >
          <SelectBox
            label={`Product #${idx + 1}`}
            dataSource={productOptions}
            displayExpr="text"
            valueExpr="value"
            value={line.productId}
            searchEnabled
            onValueChanged={(e) => setLine(idx, { productId: e.value as string | null })}
          />
          <SelectBox
            label="Receive into storage or custody (this site only)"
            dataSource={storageOptions}
            displayExpr="text"
            valueExpr="value"
            value={line.storageUnitId}
            searchEnabled
            onValueChanged={(e) => setLine(idx, { storageUnitId: e.value as string | null })}
          />
          <NumberBox
            label="Quantity"
            value={line.quantity ?? undefined}
            min={1}
            showSpinButtons
            onValueChanged={(e) => setLine(idx, { quantity: e.value as number | null })}
          />
          <NumberBox
            label="Unit price"
            value={line.unitPrice ?? undefined}
            min={0}
            showSpinButtons
            format="#,##0.##"
            onValueChanged={(e) => setLine(idx, { unitPrice: e.value as number | null })}
          />
          {lines.length > 1 ? (
            <Button text="Remove line" onClick={() => removeLine(idx)} />
          ) : null}
        </div>
      ))}
      <Button text="Add line" onClick={addLine} />

      <div className="form-page__actions" style={{ marginTop: 16 }}>
        <Button
          text="Create purchase"
          type="default"
          stylingMode="contained"
          disabled={!perm.create || !prerequisites}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/purchases')} />
      </div>
    </div>
  )
}
