import { NextResponse } from 'next/server'
import { handleMcpRequest, type JsonRpcRequest } from '@/lib/mcp-tools'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json() as JsonRpcRequest

  try {
    const result = await handleMcpRequest(body)
    return NextResponse.json({
      jsonrpc: '2.0',
      id: body.id ?? null,
      result,
    })
  } catch (error) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: body.id ?? null,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : 'Unknown MCP error',
      },
    }, { status: 400 })
  }
}
