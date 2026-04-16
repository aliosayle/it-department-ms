import { Link, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import { useMockStore } from '@/mocks/mockStore'
import './formPage.css'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="identity-card__label">{label}</dt>
      <dd className="identity-card__value">{value || '—'}</dd>
    </>
  )
}

export function UserEquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { userEquipment } = useMockStore()
  const row = id ? userEquipment.find((e) => e.id === id) : undefined

  if (!row) {
    return (
      <div className="identity-card">
        <p>Equipment not found.</p>
        <Link to="/inventory/equipment">
          <Button text="Back to list" type="default" stylingMode="contained" />
        </Link>
      </div>
    )
  }

  return (
    <div className="identity-card">
      <h2>{row.name}</h2>
      <dl className="identity-card__grid">
        <Field label="Department" value={row.department} />
        <Field label="Form factor" value={row.formFactor} />
        <Field label="Brand" value={row.brand} />
        <Field label="OS installed" value={row.osInstalled} />
        <Field label="Specs" value={row.specs} />
        <Field label="IP addresses" value={row.ipAddresses} />
        <Field label="MAC address" value={row.macAddress} />
      </dl>
      <section className="identity-card__section" aria-label="Accessories">
        <h3>Screen and accessories</h3>
        <p className="identity-card__value" style={{ gridColumn: '1 / -1' }}>
          {row.screenAccessories}
        </p>
      </section>
      <section className="identity-card__section" aria-label="Peripherals">
        <h3>Printer, scanner, other</h3>
        <p className="identity-card__value" style={{ gridColumn: '1 / -1' }}>
          {row.printerScannerOther}
        </p>
      </section>
      <div className="form-page__actions" style={{ marginTop: '1.25rem' }}>
        <Link to="/inventory/equipment">
          <Button text="Back to list" type="default" stylingMode="contained" />
        </Link>
      </div>
    </div>
  )
}
