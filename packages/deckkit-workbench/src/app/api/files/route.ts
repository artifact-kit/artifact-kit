import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { isSingleJobMode } from '@/lib/job-store'

export const runtime = 'nodejs'

const repoRoot = resolve(process.cwd(), '../..')

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const relativePath = url.searchParams.get('path')
  if (!relativePath) return new Response('Missing path', { status: 400 })

  const filePath = isAbsolute(relativePath) ? relativePath : resolve(repoRoot, relativePath)
  if (!isSingleJobMode() && !filePath.startsWith(repoRoot)) return new Response('Path escapes workspace', { status: 400 })

  const file = await readFile(filePath)
  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': contentType(filePath),
      'Cache-Control': 'no-store',
    },
  })
}

function contentType(path: string): string {
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}
