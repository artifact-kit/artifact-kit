import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const baseUrl = process.argv[2] ?? 'http://localhost:3000'
const repoRoot = resolve(import.meta.dirname, '../../..')
const manifest = JSON.parse(await readFile(join(repoRoot, 'examples/1-bbox-work/manifests/header-final.json'), 'utf8'))

const response = await fetch(`${baseUrl}/api/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'example-1-header',
    workbenchType: 'bbox-review',
    data: {
      title: 'Example 1 Header BBox Review',
      imageAssetId: 'source',
      image: {
        width: 1672,
        height: 941,
      },
      activeElementId: 'main_title_group',
      instructions: 'Review each header bbox. The highlighted box should tightly match the described visual element.',
      elements: manifest.boxes,
    },
    assets: [
      {
        id: 'source',
        kind: 'image',
        source: 'workspace-file',
        path: 'examples/1.png',
        mimeType: 'image/png',
      },
    ],
  }),
})

if (!response.ok) {
  throw new Error(`${response.status} ${await response.text()}`)
}

const result = await response.json()
console.log(`${baseUrl}/?id=${result.session.id}`)
