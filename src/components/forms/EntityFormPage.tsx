import type { ReactNode } from 'react'
import './entityFormPage.css'

export type EntityFormPageProps = {
  title: string
  subtitle?: string
  /** e.g. breadcrumb links above the title */
  breadcrumbs?: ReactNode
  /** Right side of header: Edit / Save / Cancel */
  toolbar?: ReactNode
  /** Shown inside the card above children */
  error?: string | null
  wide?: boolean
  children: ReactNode
}

/**
 * Consistent shell for create/edit/view record screens: headline, optional toolbar, card body.
 */
export function EntityFormPage({
  title,
  subtitle,
  breadcrumbs,
  toolbar,
  error,
  wide,
  children,
}: EntityFormPageProps) {
  return (
    <div className={`entity-form-page${wide ? ' entity-form-page--wide' : ''}`}>
      <header className="entity-form-page__header">
        <div className="entity-form-page__headline">
          {breadcrumbs ? <div className="entity-form-page__breadcrumb">{breadcrumbs}</div> : null}
          <h1 className="entity-form-page__title">{title}</h1>
          {subtitle ? <p className="entity-form-page__subtitle">{subtitle}</p> : null}
        </div>
        {toolbar ? <div className="entity-form-page__toolbar">{toolbar}</div> : null}
      </header>
      <div className="entity-form-page__card">
        {error ? <p className="entity-form-page__error">{error}</p> : null}
        <div className="entity-form-page__body">{children}</div>
      </div>
    </div>
  )
}
