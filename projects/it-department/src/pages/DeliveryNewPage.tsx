import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import DateBox from 'devextreme-react/date-box'
import NumberBox from 'devextreme-react/number-box'
import SelectBox from 'devextreme-react/select-box'
import TextArea from 'devextreme-react/text-area'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalCreateDelivery } from '@/api/mutations'
import { useMockStore } from '@/mocks/mockStore'
import type { DeliverySource } from '@/mocks/domain/types'
import './formPage.css'

export function DeliveryNewPage() {
  const navigate = useNavigate()
  const { stockPositions, products, storageUnits, companies, sites, personnel } = useMockStore()
  const perm = useCan('delivery')

  const [source, setSource] = useState<DeliverySource>('external')
  const [stockPositionId, setStockPositionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number | null>(1)
  const [itemReceivedDate, setItemReceivedDate] = useState<Date | null>(new Date())
  const [itemDescription, setItemDescription] = useState('')
  const [deliveredTo, setDeliveredTo] = useState('')
  const [siteLabel, setSiteLabel] = useState('')
  const [dateDelivered, setDateDelivered] = useState<Date | null>(new Date())
  const [description, setDescription] = useState('')
  /* Defaults align with seeds (Astra / Av 24 / Haj Abed). */
  const [companyId, setCompanyId] = useState<string | null>('co-1')
  const [siteId, setSiteId] = useState<string | null>('site-1')
  const [personnelId, setPersonnelId] = useState<string | null>('per-1')
  const [error, setError] = useState<string | null>(null)

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, text: c.name })),
    [companies],
  )

  const siteOptions = useMemo(() => {
    if (!companyId) return []
    return sites
      .filter((s) => s.companyId === companyId)
      .map((s) => ({ value: s.id, text: `${s.name} — ${s.location}` }))
  }, [companyId, sites])

  const personnelOptions = useMemo(() => {
    if (!companyId || !siteId) return []
    return personnel
      .filter((p) => p.companyId === companyId && p.siteId === siteId)
      .map((p) => ({ value: p.id, text: `${p.fullName} <${p.email}>` }))
  }, [companyId, siteId, personnel])

  const stockOptions = useMemo(
    () =>
      stockPositions
        .filter((pos) => pos.quantity > 0)
        .map((pos) => {
          const pr = products.find((p) => p.id === pos.productId)
          const su = storageUnits.find((u) => u.id === pos.storageUnitId)
          return {
            value: pos.id,
            text: `${pos.id} — ${pr?.sku ?? '?'} @ ${su?.code ?? '?'} (qty ${pos.quantity})`,
          }
        }),
    [stockPositions, products, storageUnits],
  )

  const maxQty = useMemo(() => {
    if (!stockPositionId) return undefined
    const row = stockPositions.find((s) => s.id === stockPositionId)
    return row?.quantity
  }, [stockPositionId, stockPositions])

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to create deliveries.')
      return
    }
    if (!companyId || !siteId || !personnelId) {
      setError('Company, site, and recipient are required.')
      return
    }
    const receivedStr =
      source === 'external' && itemReceivedDate
        ? itemReceivedDate.toISOString().slice(0, 10)
        : null
    const deliveredStr = dateDelivered ? dateDelivered.toISOString().slice(0, 10) : ''

    const result = await portalCreateDelivery({
      source,
      stockPositionId: source === 'stock' ? stockPositionId : null,
      quantity: quantity ?? 0,
      itemReceivedDate: receivedStr,
      itemDescription: itemDescription.trim(),
      deliveredTo: deliveredTo.trim(),
      site: siteLabel.trim(),
      dateDelivered: deliveredStr,
      description: description.trim(),
      companyId,
      siteId,
      personnelId,
    })

    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/delivery')
  }

  const fromStock = source === 'stock'

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}

      <p className="form-page__section">Recipient</p>
      <SelectBox
        label="Company"
        dataSource={companyOptions}
        displayExpr="text"
        valueExpr="value"
        value={companyId}
        onValueChanged={(e) => {
          setCompanyId(e.value as string | null)
          setSiteId(null)
          setPersonnelId(null)
        }}
      />
      <SelectBox
        label="Site"
        dataSource={siteOptions}
        displayExpr="text"
        valueExpr="value"
        value={siteId}
        searchEnabled
        onValueChanged={(e) => {
          setSiteId(e.value as string | null)
          setPersonnelId(null)
        }}
      />
      <SelectBox
        label="Recipient (personnel)"
        dataSource={personnelOptions}
        displayExpr="text"
        valueExpr="value"
        value={personnelId}
        searchEnabled
        onValueChanged={(e) => setPersonnelId(e.value as string | null)}
      />

      <p className="form-page__section" style={{ marginTop: '1rem' }}>
        Source and quantity
      </p>
      <SelectBox
        label="Source"
        dataSource={[
          { value: 'stock', text: 'Stock' },
          { value: 'external', text: 'External' },
        ]}
        displayExpr="text"
        valueExpr="value"
        value={source}
        onValueChanged={(e) => {
          setSource(e.value as DeliverySource)
          setError(null)
        }}
      />

      {fromStock ? (
        <>
          <SelectBox
            label="Stock position"
            dataSource={stockOptions}
            displayExpr="text"
            valueExpr="value"
            value={stockPositionId}
            searchEnabled
            onValueChanged={(e) => setStockPositionId(e.value as string | null)}
          />
          <NumberBox
            label="Quantity"
            value={quantity ?? undefined}
            min={1}
            max={maxQty}
            showSpinButtons
            onValueChanged={(e) => setQuantity(e.value as number | null)}
          />
          <p className="form-page__hint">
            Item received date is not used when the source is stock. Stock quantity will
            decrease for the selected position.
          </p>
        </>
      ) : (
        <DateBox
          label="Item received date"
          type="date"
          value={itemReceivedDate}
          onValueChanged={(e) => setItemReceivedDate(e.value as Date | null)}
        />
      )}

      <p className="form-page__section" style={{ marginTop: '1rem' }}>
        Documentation and labels
      </p>
      <TextBox
        label="Item description"
        value={itemDescription}
        onValueChanged={(e) => setItemDescription(String(e.value ?? ''))}
      />
      <TextBox
        label="Delivered to (override label)"
        value={deliveredTo}
        onValueChanged={(e) => setDeliveredTo(String(e.value ?? ''))}
      />
      <TextBox
        label="Site label (override)"
        value={siteLabel}
        onValueChanged={(e) => setSiteLabel(String(e.value ?? ''))}
      />
      <DateBox
        label="Date delivered"
        type="date"
        value={dateDelivered}
        onValueChanged={(e) => setDateDelivered(e.value as Date | null)}
      />
      <TextArea
        label="Description"
        value={description}
        height={90}
        onValueChanged={(e) => setDescription(String(e.value ?? ''))}
      />

      <div className="form-page__actions">
        <Button
          text="Create delivery"
          type="default"
          stylingMode="contained"
          disabled={!perm.create}
          onClick={submit}
        />
        <Button text="Cancel" onClick={() => navigate('/delivery')} />
      </div>
    </div>
  )
}
