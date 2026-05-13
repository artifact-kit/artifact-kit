import { NextResponse } from 'next/server'
import { getSession, updateSession } from '@/lib/session-store'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await context.params
    return NextResponse.json(getSession(id).data)
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 404 })
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await context.params
    const data = await request.json()
    return NextResponse.json(updateSession(id, { data }).data)
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 })
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Invalid session data'
}
