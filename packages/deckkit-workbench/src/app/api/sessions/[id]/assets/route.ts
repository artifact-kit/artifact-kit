import { NextResponse } from 'next/server'
import { getSession, updateSession } from '@/lib/session-store'
import type { WorkbenchSession } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await context.params
    return NextResponse.json({ assets: getSession(id).assets ?? [] })
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 404 })
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await context.params
    const body = await request.json() as { assets?: WorkbenchSession['assets'] } | WorkbenchSession['assets']
    const assets = Array.isArray(body) ? body : body?.assets
    if (!Array.isArray(assets)) throw new Error('Missing assets array')
    return NextResponse.json({ assets: updateSession(id, { assets }).assets ?? [] })
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 })
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Invalid session assets'
}
