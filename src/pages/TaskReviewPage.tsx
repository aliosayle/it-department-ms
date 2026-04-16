import { useMemo, useState } from 'react'
import Button from 'devextreme-react/button'
import TextArea from 'devextreme-react/text-area'
import TextBox from 'devextreme-react/text-box'
import SelectBox from 'devextreme-react/select-box'
import { useMockStore } from '@/mocks/mockStore'
import { portalCreateTask, portalReviewTask, portalUploadTaskAttachment } from '@/api'

export function TaskReviewPage() {
  const snap = useMockStore() as unknown as {
    users: Array<{ id: string; displayName: string }>
    tasks?: Array<{ id: string; title: string; status: string; assignedToUserId: string; reviewerUserId?: string | null }>
  }
  const tasks = snap.tasks ?? []
  const users = snap.users
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedToUserId, setAssignedToUserId] = useState('')
  const [reviewerUserId, setReviewerUserId] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [comment, setComment] = useState('')
  const [msg, setMsg] = useState('')

  const userItems = useMemo(() => users.map((u) => ({ id: u.id, label: u.displayName })), [users])

  const create = async () => {
    const r = await portalCreateTask({ title, description, assignedToUserId, reviewerUserId: reviewerUserId || null })
    setMsg(r.ok ? 'Task created.' : r.error)
  }

  const review = async (decision: 'approved' | 'changes_requested') => {
    const r = await portalReviewTask({ taskId: selectedTaskId, decision, comment })
    setMsg(r.ok ? 'Review saved.' : r.error)
  }

  const onFile = async (file: File | null) => {
    if (!file || !selectedTaskId) return
    const b64 = await file.arrayBuffer().then((buf) => {
      let binary = ''
      const bytes = new Uint8Array(buf)
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
      return btoa(binary)
    })
    const r = await portalUploadTaskAttachment({ taskId: selectedTaskId, filename: file.name, mimeType: file.type, contentBase64: b64 })
    setMsg(r.ok ? 'Attachment uploaded.' : r.error)
  }

  return <div className="form-page form-page--wide">
    <h2 style={{ marginTop: 0 }}>Task Review Workflow</h2>
    {msg ? <p className="form-page__hint">{msg}</p> : null}
    <h3>Create task</h3>
    <TextBox label="Title" value={title} onValueChanged={(e) => setTitle(String(e.value ?? ''))} />
    <TextArea label="Description" value={description} onValueChanged={(e) => setDescription(String(e.value ?? ''))} />
    <SelectBox dataSource={userItems} valueExpr="id" displayExpr="label" value={assignedToUserId} onValueChanged={(e) => setAssignedToUserId(String(e.value ?? ''))} placeholder="Assignee" />
    <SelectBox dataSource={userItems} valueExpr="id" displayExpr="label" value={reviewerUserId} onValueChanged={(e) => setReviewerUserId(String(e.value ?? ''))} placeholder="Reviewer" />
    <Button text="Create task" type="default" onClick={() => void create()} />

    <h3 style={{ marginTop: 16 }}>Review / upload</h3>
    <SelectBox dataSource={tasks} valueExpr="id" displayExpr="title" value={selectedTaskId} onValueChanged={(e) => setSelectedTaskId(String(e.value ?? ''))} placeholder="Select task" />
    <TextArea label="Review comment" value={comment} onValueChanged={(e) => setComment(String(e.value ?? ''))} />
    <div style={{ display: 'flex', gap: 10 }}>
      <Button text="Approve" onClick={() => void review('approved')} />
      <Button text="Request changes" onClick={() => void review('changes_requested')} />
      <input type="file" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
    </div>
  </div>
}
