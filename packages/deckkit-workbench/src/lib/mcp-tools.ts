import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  updateSession,
} from './session-store'
import type { WorkbenchSession } from './types'

export interface JsonRpcRequest {
  jsonrpc?: '2.0'
  id?: string | number | null
  method: string
  params?: unknown
}

export async function handleMcpRequest(request: JsonRpcRequest): Promise<unknown> {
  switch (request.method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'deckkit-workbench', version: '0.0.0' },
      }
    case 'tools/list':
      return { tools: toolsList() }
    case 'tools/call':
      return callTool(readObject(request.params).name as string, readObject(request.params).arguments)
    default:
      throw new Error(`Unsupported MCP method: ${request.method}`)
  }
}

async function callTool(name: string, args: unknown): Promise<unknown> {
  const input = readObject(args)

  switch (name) {
    case 'list_sessions':
      return content(listSessions().map(session => ({ id: session.id, updatedAt: session.updatedAt })))
    case 'create_session':
      return content(createSession({
        id: typeof input.id === 'string' ? input.id : undefined,
        data: input.data ?? null,
        assets: readAssets(input.assets),
      }))
    case 'get_session':
      return content(getSession(readString(input.id, 'id')))
    case 'update_session':
      return content(updateSession(readString(input.id, 'id'), {
        data: input.data,
        assets: 'assets' in input ? readAssets(input.assets) : undefined,
      }))
    case 'delete_session':
      return content({ ok: deleteSession(readString(input.id, 'id')) })
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

function toolsList() {
  return [
    tool('list_sessions', 'List in-memory workbench sessions.', {}),
    tool('create_session', 'Create an in-memory JSON session for any workbench page.', {
      id: { type: 'string' },
      data: {},
      assets: { type: 'array' },
    }, ['data']),
    tool('get_session', 'Read a full in-memory session state.', { id: { type: 'string' } }, ['id']),
    tool('update_session', 'Replace session data/assets after a human or agent edit.', {
      id: { type: 'string' },
      data: {},
      assets: { type: 'array' },
    }, ['id', 'data']),
    tool('delete_session', 'Delete an in-memory session.', { id: { type: 'string' } }, ['id']),
  ]
}

function tool(name: string, description: string, properties: Record<string, unknown>, required: string[] = []) {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    },
  }
}

function content(value: unknown): unknown {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structured_content: value,
    structuredContent: value,
  }
}

function readObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {}
  return value as Record<string, unknown>
}

function readString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Missing ${name}`)
  return value
}

function readAssets(value: unknown): WorkbenchSession['assets'] {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new Error('assets must be an array')
  return value as WorkbenchSession['assets']
}

function readNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Missing ${name}`)
  return value
}
