import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextBox from 'devextreme-react/text-box'
import { isLiveApi } from '@/api/config'
import { portalUpdateServiceDeskTicket } from '@/api/mutations'
import { useCan } from '@/auth/AuthContext'
import { useMockStore } from '@/mocks/mockStore'
import type { Ticket } from '@/mocks/types'
import './formPage.css'

const priorities: Ticket['priority'][] = ['P1', 'P2', 'P3', 'P4']

export function ServiceDeskTicketEditPage() {
  const { ticketId = '' } = useParams<{ ticketId: string }>()
  const navigate = useNavigate()
  const { serviceDeskTickets } = useMockStore()
  const perm = useCan('serviceDesk')
  const row = serviceDeskTickets.find((t) => t.id === ticketId)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Ticket['priority']>('P3')
  const [status, setStatus] = useState('')
  const [assignee, setAssignee] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!row) return
    setTitle(row.title)
    setPriority(row.priority)
    setStatus(row.status)
    setAssignee(row.assignee)
  }, [row])

  const submit = async () => {
    setError(null)
    if (isLiveApi()) {
      setError('Ticket edits are available only without API mode (client-side store).')
      return
    }
    if (!perm.edit) {
      setError('You do not have permission to edit tickets.')
      return
    }
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    const r = await portalUpdateServiceDeskTicket(ticketId, {
      title: title.trim(),
      priority,
      status: status.trim(),
      assignee: assignee.trim(),
      updatedAt: new Date().toISOString(),
    })
    if (!r.ok) {
      setError(r.error)
      return
    }
    navigate('/service-desk')
  }

  if (!row) {
    return (
      <div className="form-page">
        <p className="form-page__error">Ticket not found.</p>
        <Button text="Back" onClick={() => navigate('/service-desk')} />
      </div>
    )
  }

  return (
    <div className="form-page form-page--wide">
      {error ? <p className="form-page__error">{error}</p> : null}
      <TextBox label="Title" value={title} onValueChanged={(e) => setTitle(String(e.value ?? ''))} />
      <SelectBox
        label="Priority"
        dataSource={priorities}
        value={priority}
        onValueChanged={(e) => setPriority((e.value as Ticket['priority']) ?? 'P3')}
      />
      <TextBox label="Status" value={status} onValueChanged={(e) => setStatus(String(e.value ?? ''))} />
      <TextBox label="Assignee" value={assignee} onValueChanged={(e) => setAssignee(String(e.value ?? ''))} />
      <div className="form-page__actions">
        <Button
          text="Save"
          type="default"
          stylingMode="contained"
          disabled={!perm.edit}
          onClick={() => void submit()}
        />
        <Button text="Cancel" onClick={() => navigate('/service-desk')} />
      </div>
    </div>
  )
}
