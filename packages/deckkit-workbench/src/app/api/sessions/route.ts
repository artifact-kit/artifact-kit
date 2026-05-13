import { NextResponse } from 'next/server'
import { createSession, listSessions } from '@/lib/session-store'
import type { WorkbenchSession } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ sessions: listSessions() })
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      id?: string
      workbenchType: string
      data: unknown
      assets?: WorkbenchSession['assets']
    }
    const session = createSession(body)
    return NextResponse.json({ session })
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 })
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Invalid session payload'
}
