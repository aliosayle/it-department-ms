import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from 'devextreme-react/button'
import DateBox from 'devextreme-react/date-box'
import NumberBox from 'devextreme-react/number-box'
import SelectBox from 'devextreme-react/select-box'
import TextArea from 'devextreme-react/text-area'
import TextBox from 'devextreme-react/text-box'
import { useCan } from '@/auth/AuthContext'
import { portalCreateAssignment } from '@/api/mutations'
import { useMockStore } from '@/mocks/mockStore'
import type { AssignmentSource } from '@/mocks/domain/types'
import './formPage.css'

export function AssignmentNewPage() {
  const navigate = useNavigate()
  const { stockPositions, products, storageUnits, serializedAssets, companies, sites, personnel } = useMockStore()
  const perm = useCan('assignment')

  const [source, setSource] = useState<AssignmentSource>('external')
  const [stockPositionId, setStockPositionId] = useState<string | null>(null)
  const [serializedAssetId, setSerializedAssetId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number | null>(1)
  const [itemReceivedDate, setItemReceivedDate] = useState<Date | null>(new Date())
  const [itemDescription, setItemDescription] = useState('')
  const [deliveredTo, setDeliveredTo] = useState('')
  const [siteLabel, setSiteLabel] = useState('')
  const [dateDelivered, setDateDelivered] = useState<Date | null>(new Date())
  const [description, setDescription] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [siteId, setSiteId] = useState<string | null>(null)
  const [personnelId, setPersonnelId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (companyId !== null || companies.length === 0) return
    setCompanyId(companies[0].id)
  }, [companies, companyId])

  useEffect(() => {
    if (!companyId) {
      setSiteId(null)
      return
    }
    const first = sites.find((s) => s.companyId === companyId)
    setSiteId((sid) => {
      if (sid && sites.some((s) => s.id === sid && s.companyId === companyId)) return sid
      return first?.id ?? null
    })
  }, [companyId, sites])

  useEffect(() => {
    if (!companyId || !siteId) {
      setPersonnelId(null)
      return
    }
    const first = personnel.find((p) => p.companyId === companyId && p.siteId === siteId)
    setPersonnelId((pid) => {
      if (pid && personnel.some((p) => p.id === pid && p.siteId === siteId && p.companyId === companyId)) {
        return pid
      }
      return first?.id ?? null
    })
  }, [companyId, siteId, personnel])

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

  const stockOptions = useMemo(() => {
    return stockPositions
      .filter((pos) => pos.quantity > 0)
      .map((pos) => {
        const pr = products.find((p) => p.id === pos.productId)
        const su = storageUnits.find((u) => u.id === pos.storageUnitId)
        if (su?.kind === 'custody') return null
        if (siteId && su?.siteId !== siteId) return null
        if (pr?.trackingMode === 'serialized') return null
        const ref = pr?.reference || pr?.sku || pos.productId
        const loc = su ? `${su.code} — ${su.label}` : '—'
        return {
          value: pos.id,
          text: `${ref} @ ${loc} (qty ${pos.quantity})`,
        }
      })
      .filter((x): x is { value: string; text: string } => x != null)
  }, [stockPositions, products, storageUnits, siteId])

  const assetOptions = useMemo(() => {
    if (!siteId) return []
    return serializedAssets
      .map((a) => {
        const pr = products.find((p) => p.id === a.productId)
        const su = storageUnits.find((u) => u.id === a.storageUnitId)
        if (!pr || pr.trackingMode !== 'serialized') return null
        if (su?.kind === 'custody') return null
        if (su?.siteId !== siteId) return null
        const loc = su ? `${su.code} — ${su.label}` : '—'
        return {
          value: a.id,
          text: `${a.identifier} · ${pr.reference || pr.sku || pr.name} @ ${loc}`,
        }
      })
      .filter((x): x is { value: string; text: string } => x != null)
  }, [serializedAssets, products, storageUnits, siteId])

  const maxQty = useMemo(() => {
    if (!stockPositionId) return undefined
    const row = stockPositions.find((s) => s.id === stockPositionId)
    return row?.quantity
  }, [stockPositionId, stockPositions])

  const recipientHasCustody = useMemo(() => {
    if (!personnelId) return false
    return storageUnits.some((u) => u.personnelId === personnelId && u.kind === 'custody')
  }, [personnelId, storageUnits])

  const submit = async () => {
    setError(null)
    if (!perm.create) {
      setError('You do not have permission to create assignments.')
      return
    }
    if (!companyId || !siteId || !personnelId) {
      setError('Company, site, and recipient are required.')
      return
    }
    if (source === 'stock') {
      if (!stockPositionId && !serializedAssetId) {
        setError('Select a warehouse stock position or a serialized asset at this site.')
        return
      }
      if (!recipientHasCustody) {
        setError(
          'Recipient needs a custody storage unit. Create one at Storage units (kind: custody) for this person.',
        )
        return
      }
    }
    const receivedStr =
      source === 'external' && itemReceivedDate
        ? itemReceivedDate.toISOString().slice(0, 10)
        : null
    const deliveredStr = dateDelivered ? dateDelivered.toISOString().slice(0, 10) : ''

    const result = await portalCreateAssignment({
      source,
      stockPositionId: source === 'stock' && !serializedAssetId ? stockPositionId : null,
      serializedAssetId: source === 'stock' ? serializedAssetId : null,
      quantity: serializedAssetId ? 1 : quantity ?? 0,
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
    navigate('/assignments')
  }

  const fromStock = source === 'stock'
  const masterDataReady = companies.length > 0 && sites.length > 0 && personnel.length > 0

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}

      {!masterDataReady ? (
        <p className="form-page__hint form-page__hint--warn">
          Add at least one <Link to="/master-data/companies/new">company</Link>,{' '}
          <Link to="/master-data/sites/new">site</Link>, and <Link to="/master-data/personnel/new">personnel</Link>{' '}
          before creating an assignment.
        </p>
      ) : null}

      <p className="form-page__hint">
        <strong>From stock (bulk):</strong> quantity is removed from the selected warehouse bin and added to the
        recipient’s <strong>custody</strong> bin. <strong>Serialized asset:</strong> one MAC/serial unit moves into
        custody (quantity fixed to 1).{' '}
        <Link to="/stock/storage-units/new">New storage unit</Link> — kind <strong>custody</strong> for the recipient.
      </p>

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
          setStockPositionId(null)
          setSerializedAssetId(null)
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
          setStockPositionId(null)
          setSerializedAssetId(null)
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
      {personnelId && !recipientHasCustody ? (
        <p className="form-page__hint form-page__hint--warn">
          This person has no <strong>custody</strong> bin yet — stock-based assignment will fail until you add one (
          <Link to="/stock/storage-units/new">new storage unit</Link>, same site, kind custody, holder = this person).
        </p>
      ) : null}

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
          setSource(e.value as AssignmentSource)
          setError(null)
        }}
      />

      {fromStock ? (
        <>
          <SelectBox
            label="Stock position (quantity products, this site)"
            dataSource={stockOptions}
            displayExpr="text"
            valueExpr="value"
            value={stockPositionId}
            searchEnabled
            onValueChanged={(e) => {
              setStockPositionId(e.value as string | null)
              if (e.value) setSerializedAssetId(null)
            }}
          />
          <SelectBox
            label="Or: serialized asset (MAC/serial in warehouse at this site)"
            dataSource={assetOptions}
            displayExpr="text"
            valueExpr="value"
            value={serializedAssetId}
            searchEnabled
            onValueChanged={(e) => {
              setSerializedAssetId(e.value as string | null)
              if (e.value) {
                setStockPositionId(null)
                setQuantity(1)
              }
            }}
          />
          {stockOptions.length === 0 && assetOptions.length === 0 ? (
            <p className="form-page__hint">
              No bulk positions or serialized assets at this site in non-custody storage. Use{' '}
              <Link to="/stock/receive">Receive stock</Link>, receive-serialized API, or <Link to="/purchases">Purchases</Link>.
            </p>
          ) : null}
          <NumberBox
            label="Quantity (bulk only; 1 when serialized asset is selected)"
            value={serializedAssetId ? 1 : (quantity ?? undefined)}
            min={1}
            max={serializedAssetId ? 1 : maxQty}
            showSpinButtons
            disabled={!!serializedAssetId}
            onValueChanged={(e) => setQuantity(e.value as number | null)}
          />
          <p className="form-page__hint">
            Item received date is not used when the source is stock. Choose either a bulk position or one serialized
            asset, not both.
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
        label="Assigned to (override label)"
        value={deliveredTo}
        onValueChanged={(e) => setDeliveredTo(String(e.value ?? ''))}
      />
      <TextBox
        label="Site label (override)"
        value={siteLabel}
        onValueChanged={(e) => setSiteLabel(String(e.value ?? ''))}
      />
      <DateBox
        label="Date assigned"
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
          text="Create assignment"
          type="default"
          stylingMode="contained"
          disabled={!perm.create || !masterDataReady}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/assignments')} />
      </div>
    </div>
  )
}
