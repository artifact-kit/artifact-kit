import { NextResponse } from 'next/server'
import { deleteSession, getSession, updateSession } from '@/lib/session-store'
import type { WorkbenchSession } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params
  return NextResponse.json({ session: getSession(id) })
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params
  const body = await request.json() as { data: unknown; assets?: WorkbenchSession['assets'] }
  return NextResponse.json({ session: updateSession(id, body) })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await context.params
  return NextResponse.json({ ok: deleteSession(id) })
}
