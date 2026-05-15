import { NextResponse } from 'next/server'
import { getCurrentJob, updateCurrentJob } from '@/lib/job-store'
import type { WorkbenchSession } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ session: await getCurrentJob() })
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 404 })
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { data: unknown; assets?: WorkbenchSession['assets'] }
    return NextResponse.json({ session: await updateCurrentJob(body) })
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 })
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as { data: unknown; assets?: WorkbenchSession['assets']; complete?: boolean }
    const session = await updateCurrentJob({ ...body, complete: true })
    setTimeout(() => process.exit(0), 750)
    return NextResponse.json({ session })
  } catch (error) {
    return NextResponse.json({ error: formatError(error) }, { status: 400 })
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Invalid job payload'
}
