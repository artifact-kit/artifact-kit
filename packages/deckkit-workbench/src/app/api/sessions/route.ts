import { NextResponse } from 'next/server'
import { createSession, listSessions } from '@/lib/session-store'
import type { WorkbenchSession } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ sessions: listSessions() })
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json() as {
    id?: string
    data: unknown
    assets?: WorkbenchSession['assets']
  }
  const session = createSession(body)
  return NextResponse.json({ session })
}
