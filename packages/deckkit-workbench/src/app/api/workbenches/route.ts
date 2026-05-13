import { NextResponse } from 'next/server'
import { listWorkbenches } from '@/lib/workbench-registry'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ workbenches: listWorkbenches() })
}
