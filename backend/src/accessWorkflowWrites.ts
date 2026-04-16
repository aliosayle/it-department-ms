import fs from 'node:fs'
import path from 'node:path'
import type { Pool } from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'
import { nextId } from './id.js'
import { ALL_PAGE_KEYS, type PageCrud, type PageKey } from './pageKeys.js'

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'task-attachments')
const ALLOWED = new Set(['application/pdf', 'image/png', 'image/jpeg', 'text/plain'])
const MAX_BYTES = 5 * 1024 * 1024

function sanitizeFilename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120)
}

export async function upsertRoleWithPermissions(
  pool: Pool,
  input: { id?: string; name: string; description?: string; permissions: Record<PageKey, PageCrud> },
) {
  const roleId = (input.id || '').trim() || nextId('rol')
  const name = input.name.trim()
  if (!name) return { ok: false as const, error: 'Role name is required.' }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [[existing]] = await conn.query<RowDataPacket[]>('SELECT id FROM roles WHERE id = ?', [roleId])
    if (existing) {
      await conn.query('UPDATE roles SET name = ?, description = ? WHERE id = ?', [name, input.description ?? '', roleId])
      await conn.query('DELETE FROM role_page_permissions WHERE role_id = ?', [roleId])
    } else {
      await conn.query('INSERT INTO roles (id, name, description) VALUES (?,?,?)', [roleId, name, input.description ?? ''])
    }
    for (const key of ALL_PAGE_KEYS) {
      const p = input.permissions[key]
      if (!p) continue
      await conn.query(
        'INSERT INTO role_page_permissions (role_id, page_key, can_view, can_edit, can_delete, can_create) VALUES (?,?,?,?,?,?)',
        [roleId, key, p.view ? 1 : 0, p.edit ? 1 : 0, p.delete ? 1 : 0, p.create ? 1 : 0],
      )
    }
    await conn.commit()
    return { ok: true as const, roleId }
  } catch (e) {
    await conn.rollback()
    return { ok: false as const, error: e instanceof Error ? e.message : 'Role write failed' }
  } finally {
    conn.release()
  }
}

export async function replaceUserRolesAndOverrides(
  pool: Pool,
  input: { userId: string; roleIds: string[]; overrides?: Partial<Record<PageKey, PageCrud>> },
) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('DELETE FROM user_roles WHERE user_id = ?', [input.userId])
    for (const roleId of input.roleIds) {
      await conn.query('INSERT INTO user_roles (user_id, role_id) VALUES (?,?)', [input.userId, roleId])
    }
    await conn.query('DELETE FROM user_page_permission_overrides WHERE user_id = ?', [input.userId])
    for (const key of ALL_PAGE_KEYS) {
      const p = input.overrides?.[key]
      if (!p) continue
      await conn.query(
        'INSERT INTO user_page_permission_overrides (user_id, page_key, can_view, can_edit, can_delete, can_create) VALUES (?,?,?,?,?,?)',
        [input.userId, key, p.view ? 1 : 0, p.edit ? 1 : 0, p.delete ? 1 : 0, p.create ? 1 : 0],
      )
    }
    await conn.commit()
    return { ok: true as const }
  } catch (e) {
    await conn.rollback()
    return { ok: false as const, error: e instanceof Error ? e.message : 'User role update failed' }
  } finally {
    conn.release()
  }
}

export async function createTask(pool: Pool, input: { title: string; description?: string; assignedToUserId: string; reviewerUserId?: string | null; dueDate?: string | null; createdByUserId: string }) {
  const title = input.title.trim()
  if (!title) return { ok: false as const, error: 'Title is required.' }
  const id = nextId('tsk')
  await pool.query(
    'INSERT INTO tasks (id, title, description, created_by_user_id, assigned_to_user_id, reviewer_user_id, due_date) VALUES (?,?,?,?,?,?,?)',
    [id, title, input.description ?? '', input.createdByUserId, input.assignedToUserId, input.reviewerUserId ?? null, input.dueDate ?? null],
  )
  return { ok: true as const, taskId: id }
}

export async function addTaskAttachment(pool: Pool, input: { taskId: string; uploadedByUserId: string; filename: string; mimeType: string; contentBase64: string }) {
  const mime = input.mimeType.trim().toLowerCase()
  if (!ALLOWED.has(mime)) return { ok: false as const, error: 'Unsupported file type.' }
  const buf = Buffer.from(input.contentBase64, 'base64')
  if (!buf.length) return { ok: false as const, error: 'Empty attachment.' }
  if (buf.length > MAX_BYTES) return { ok: false as const, error: 'Attachment too large (max 5MB).' }
  const safeName = sanitizeFilename(input.filename || 'attachment.bin')
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true })
  const id = nextId('att')
  const full = path.join(UPLOAD_DIR, `${id}-${safeName}`)
  await fs.promises.writeFile(full, buf, { mode: 0o600 })
  await pool.query(
    'INSERT INTO task_attachments (id, task_id, uploaded_by_user_id, filename, mime_type, size_bytes, storage_path) VALUES (?,?,?,?,?,?,?)',
    [id, input.taskId, input.uploadedByUserId, safeName, mime, buf.length, full],
  )
  return { ok: true as const, attachmentId: id }
}

export async function reviewTask(pool: Pool, input: { taskId: string; reviewerUserId: string; decision: 'approved' | 'changes_requested'; comment?: string }) {
  const [[task]] = await pool.query<RowDataPacket[]>('SELECT id, reviewer_user_id AS reviewerUserId FROM tasks WHERE id = ?', [input.taskId])
  if (!task) return { ok: false as const, error: 'Task not found.' }
  if (task.reviewerUserId && String(task.reviewerUserId) !== input.reviewerUserId) {
    return { ok: false as const, error: 'Only assigned reviewer can review this task.' }
  }
  await pool.query(
    'UPDATE tasks SET status = ?, reviewer_user_id = ?, reviewed_at = NOW(6) WHERE id = ?',
    [input.decision, input.reviewerUserId, input.taskId],
  )
  await pool.query(
    'INSERT INTO task_reviews (id, task_id, reviewer_user_id, decision, comment) VALUES (?,?,?,?,?)',
    [nextId('trv'), input.taskId, input.reviewerUserId, input.decision, input.comment ?? ''],
  )
  return { ok: true as const }
}
