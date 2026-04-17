import type { ReactNode } from 'react'
import './entityFormPage.css'

export function DefinitionList({ children }: { children: ReactNode }) {
  return <dl className="entity-form-page__dl">{children}</dl>
}

export function DlRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="entity-form-page__dt">{label}</dt>
      <dd className="entity-form-page__dd">{value === '' || value == null ? '—' : value}</dd>
    </>
  )
}
