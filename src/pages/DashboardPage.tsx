import { dashboardMock } from '@/mocks'
import './DashboardPage.css'

const timeFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function DashboardPage() {
  const { kpis, recentActivity } = dashboardMock

  return (
    <div className="dashboard">
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
