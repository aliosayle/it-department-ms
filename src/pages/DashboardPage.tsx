import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { dashboardMock } from '@/mocks'
import { useMockStore } from '@/mocks/mockStore'
import './DashboardPage.css'

const timeFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function DashboardPage() {
  const { recentActivity } = dashboardMock
  const snap = useMockStore()
  const { companies, sites, personnel, suppliers, products, storageUnits, serviceDeskTickets, purchases, tasks } =
    snap
  const { can } = useAuth()

  const kpis = useMemo(() => {
    const openIncidents = serviceDeskTickets.filter(
      (t) => String(t.id).startsWith('INC') && !/resolved|closed/i.test(String(t.status)),
    ).length
    const changesInflight = purchases.filter((p) => p.status === 'ordered').length
    const slaRisk = tasks.filter((t) => String(t.status) === 'pending_review').length
    const queuedRequests = serviceDeskTickets.filter((t) => String(t.status) === 'Queued').length
    return [
      {
        id: 'incidents',
        label: 'Open incidents',
        value: openIncidents,
        hint: 'INC tickets excluding resolved or closed',
      },
      {
        id: 'changes',
        label: 'Changes in flight',
        value: changesInflight,
        hint: 'Purchases with status ordered',
      },
      {
        id: 'sla',
        label: 'SLA at risk',
        value: slaRisk,
        hint: 'Tasks awaiting review',
      },
      {
        id: 'requests',
        label: 'Queued requests',
        value: queuedRequests,
        hint: 'Service desk tickets in Queued status',
      },
    ]
  }, [serviceDeskTickets, purchases, tasks])

  const showSetup =
    companies.length === 0 ||
    sites.length === 0 ||
    personnel.length === 0 ||
    suppliers.length === 0 ||
    products.length === 0 ||
    storageUnits.length === 0

  return (
    <div className="dashboard">
      {showSetup ? (
        <section className="dashboard__setup" aria-label="Getting started" style={{ marginBottom: '1.5rem' }}>
          <h2 className="dashboard__section-title">Getting started</h2>
          <p className="dashboard__empty" style={{ marginBottom: '0.75rem' }}>
            Use this order so purchases, receives, and transfers validate correctly:
          </p>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.6 }}>
            {companies.length === 0 && can('companies', 'create') ? (
              <li>
                <Link to="/master-data/companies/new">Add a company</Link>
              </li>
            ) : null}
            {sites.length === 0 && can('sites', 'create') ? (
              <li>
                <Link to="/master-data/sites/new">Add a site</Link> (needs a company)
              </li>
            ) : null}
            {personnel.length === 0 && can('personnel', 'create') ? (
              <li>
                <Link to="/master-data/personnel/new">Add personnel</Link> (needs company + site)
              </li>
            ) : null}
            {suppliers.length === 0 && can('suppliers', 'create') ? (
              <li>
                <Link to="/master-data/suppliers/new">Add a supplier</Link>
              </li>
            ) : null}
            {products.length === 0 && can('products', 'create') ? (
              <li>
                <Link to="/products/new">Add products</Link> (unique SKU per item)
              </li>
            ) : null}
            {storageUnits.length === 0 && can('storageUnits', 'create') ? (
              <li>
                <Link to="/stock/storage-units/new">Add storage units</Link> (bins per site; use custody for person
                bins)
              </li>
            ) : null}
            <li>
              Then <Link to="/stock/receive">receive stock</Link> or <Link to="/purchases/new">create a purchase</Link>
              .
            </li>
          </ol>
        </section>
      ) : null}
      <section className="dashboard__kpis" aria-label="Key metrics">
        {kpis.map((k) => (
          <article key={k.id} className="kpi-card">
            <p className="kpi-card__label">{k.label}</p>
            <p className="kpi-card__value">{k.value.toLocaleString()}</p>
            <p className="kpi-card__hint">{k.hint}</p>
          </article>
        ))}
      </section>

      <section className="dashboard__activity" aria-label="Recent activity">
        <h2 className="dashboard__section-title">Recent activity</h2>
        {recentActivity.length === 0 ? (
          <p className="dashboard__empty">No recent activity to display.</p>
        ) : (
          <ul className="activity-list">
            {recentActivity.map((item) => (
              <li key={item.id} className="activity-list__item">
                <time className="activity-list__time" dateTime={item.time}>
                  {timeFmt.format(new Date(item.time))}
                </time>
                <span className="activity-list__text">{item.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
