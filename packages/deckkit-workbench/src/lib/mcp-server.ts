import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import * as z from 'zod/v4'
import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  updateSession,
} from './session-store'
import type { WorkbenchSession } from './types'
import { listWorkbenches } from './workbench-registry'

export async function handleMcpRequest(request: Request): Promise<Response> {
  const server = createMcpServer()
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  await server.connect(transport)
  return transport.handleRequest(request)
}

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'deckkit-workbench',
    version: '0.0.0',
  })

  server.registerTool('list_sessions', {
    description: 'List in-memory workbench sessions.',
    inputSchema: {},
  }, async () => content(listSessions().map(session => ({
    id: session.id,
    workbenchType: session.workbenchType,
    updatedAt: session.updatedAt,
  }))))

  server.registerTool('list_workbenches', {
    description: 'List available workbenches and the JSON data schema each session must provide.',
    inputSchema: {},
  }, async () => content(listWorkbenches()))

  server.registerTool('create_session', {
    description: 'Create an in-memory JSON session for any workbench page.',
    inputSchema: {
      id: z.string().optional(),
      workbenchType: z.string(),
      data: jsonObjectSchema,
      assets: assetsSchema.optional(),
    },
  }, async ({ id, workbenchType, data, assets }) => content(createSession({
    id,
    workbenchType,
    data,
    assets: assets as WorkbenchSession['assets'],
  })))

  server.registerTool('get_session', {
    description: 'Read a full in-memory session state.',
    inputSchema: {
      id: z.string(),
    },
  }, async ({ id }) => content(getSession(id)))

  server.registerTool('update_session', {
    description: 'Replace session data/assets after a human or agent edit.',
    inputSchema: {
      id: z.string(),
      data: jsonObjectSchema,
      assets: assetsSchema.optional(),
    },
  }, async ({ id, data, assets }) => content(updateSession(id, {
    data,
    assets: assets as WorkbenchSession['assets'],
  })))

  server.registerTool('delete_session', {
    description: 'Delete an in-memory session.',
    inputSchema: {
      id: z.string(),
    },
  }, async ({ id }) => content({ ok: deleteSession(id) }))

  return server
}

const assetsSchema = z.array(z.object({
  id: z.string(),
  kind: z.enum(['image', 'json', 'text', 'other']),
  source: z.enum(['url', 'data-url', 'workspace-file']),
  src: z.string().optional(),
  dataUrl: z.string().optional(),
  path: z.string().optional(),
  mimeType: z.string().optional(),
}))

const jsonObjectSchema = z.record(z.string(), z.unknown())

function content(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  }
}
