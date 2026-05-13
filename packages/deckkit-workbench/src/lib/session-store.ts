import { randomUUID } from 'node:crypto'
import type { WorkbenchSession } from './types'

const storeKey = Symbol.for('deckkit-workbench.sessions')
const globalStore = globalThis as typeof globalThis & { [storeKey]?: Map<string, WorkbenchSession> }
const sessions = globalStore[storeKey] ?? new Map<string, WorkbenchSession>()
globalStore[storeKey] = sessions

export function createSession(input: {
  id?: string
  data: unknown
  assets?: WorkbenchSession['assets']
}): WorkbenchSession {
  const id = input.id ?? randomUUID()
  const now = new Date().toISOString()
  const session: WorkbenchSession = {
    id,
    data: input.data,
    assets: input.assets,
    createdAt: now,
    updatedAt: now,
  }
  sessions.set(id, session)
  return session
}

export function getSession(id: string): WorkbenchSession {
  const session = sessions.get(id)
  if (!session) throw new Error(`Unknown session: ${id}`)
  return session
}

export function listSessions(): WorkbenchSession[] {
  return Array.from(sessions.values())
}

export function updateSession(sessionId: string, input: { data?: unknown; assets?: WorkbenchSession['assets'] }): WorkbenchSession {
  const session = getSession(sessionId)
  if ('data' in input) session.data = input.data
  if ('assets' in input) session.assets = input.assets
  session.updatedAt = new Date().toISOString()
  return session
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId)
}
