import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const workDir = join(__dirname, '..')
const sourcePath = join(workDir, '..', '1.png')
const require = createRequire(join(workDir, '..', '..', 'packages', 'deckkit-pro', 'package.json'))
const sharp = require('sharp')

const colors = {
  canvas: '#111827',
  section: '#dc2626',
  'text-group': '#7c3aed',
  text: '#2563eb',
  'decorative-background': '#0891b2',
  'decorative-line': '#0d9488',
  'decorative-shape': '#0284c7',
  'section-header': '#16a34a',
  'section-body': '#64748b',
  icon: '#f59e0b',
  'content-row': '#ea580c',
  'architecture-box': '#9333ea',
  card: '#db2777',
  footer: '#0f766e'
}

function svgEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

async function loadManifest(name) {
  return JSON.parse(await readFile(join(workDir, 'manifests', `${name}.json`), 'utf8'))
}

function overlaySvg(manifest) {
  const { width, height } = manifest.image
  const boxes = manifest.boxes
    .filter(item => item.id !== 'slide')
    .map((item, index) => {
      const color = colors[item.kind] ?? '#111827'
      const { x, y, w, h } = item.bbox
      const labelY = y > 18 ? y - 4 : y + 14
      return `
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${color}" stroke-width="2"/>
        <rect x="${x}" y="${Math.max(0, labelY - 13)}" width="${Math.min(w, item.id.length * 8 + 26)}" height="16" fill="${color}" opacity="0.86"/>
        <text x="${x + 4}" y="${Math.max(12, labelY)}" font-family="Arial, sans-serif" font-size="11" fill="#fff">${index + 1}. ${svgEscape(item.id)}</text>`
    })
    .join('\n')

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${boxes}</svg>`)
}

async function cropAll(manifestName) {
  const manifest = await loadManifest(manifestName)
  const cropDir = join(workDir, 'crops', manifestName)
  await mkdir(cropDir, { recursive: true })

  for (const item of manifest.boxes) {
    const { x, y, w, h } = item.bbox
    await sharp(sourcePath)
      .extract({ left: x, top: y, width: w, height: h })
      .png()
      .toFile(join(cropDir, `${item.id}.png`))
  }

  await sharp(sourcePath)
    .composite([{ input: overlaySvg(manifest), left: 0, top: 0 }])
    .png()
    .toFile(join(workDir, `overlay-${manifestName}.png`))

  await makeContactSheet(manifest, cropDir, join(workDir, `contact-${manifestName}.png`))
}

async function makeContactSheet(manifest, cropDir, output) {
  const thumbW = 220
  const thumbH = 140
  const labelH = 34
  const gap = 14
  const cols = 4
  const rows = Math.ceil(manifest.boxes.length / cols)
  const width = cols * thumbW + (cols + 1) * gap
  const height = rows * (thumbH + labelH) + (rows + 1) * gap
  const composites = []

  for (let index = 0; index < manifest.boxes.length; index += 1) {
    const item = manifest.boxes[index]
    const col = index % cols
    const row = Math.floor(index / cols)
    const left = gap + col * (thumbW + gap)
    const top = gap + row * (thumbH + labelH + gap)
    const crop = await sharp(join(cropDir, `${item.id}.png`))
      .resize({ width: thumbW, height: thumbH, fit: 'contain', background: '#ffffff' })
      .extend({ top: 0, bottom: labelH, left: 0, right: 0, background: '#ffffff' })
      .composite([{ input: labelSvg(item, thumbW, labelH), left: 0, top: thumbH }])
      .png()
      .toBuffer()
    composites.push({ input: crop, left, top })
  }

  await sharp({ create: { width, height, channels: 4, background: '#f8fafc' } })
    .composite(composites)
    .png()
    .toFile(output)
}

function labelSvg(item, width, height) {
  const text = `${item.id}  (${item.bbox.x},${item.bbox.y},${item.bbox.w},${item.bbox.h})`
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>
    <text x="7" y="14" font-family="Arial, sans-serif" font-size="10" fill="#0f172a">${svgEscape(text)}</text>
    <text x="7" y="28" font-family="Arial, sans-serif" font-size="10" fill="#475569">${svgEscape(item.label)}</text>
  </svg>`)
}

async function compareChanged() {
  const beforeName = process.argv[2] ?? 'boxes-v1'
  const afterName = process.argv[3] ?? 'boxes-final'
  const before = await loadManifest(beforeName)
  const after = await loadManifest(afterName)
  const beforeById = new Map(before.boxes.map(item => [item.id, item]))
  const outDir = join(workDir, 'compare', `${beforeName}-to-${afterName}`)
  await mkdir(outDir, { recursive: true })

  for (const item of after.boxes) {
    const prev = beforeById.get(item.id)
    if (!prev || JSON.stringify(prev.bbox) === JSON.stringify(item.bbox)) continue

    const beforePath = join(workDir, 'crops', beforeName, `${item.id}.png`)
    const afterPath = join(workDir, 'crops', afterName, `${item.id}.png`)
    const beforeInfo = await sharp(beforePath).metadata()
    const afterInfo = await sharp(afterPath).metadata()
    const width = (beforeInfo.width ?? 0) + (afterInfo.width ?? 0) + 12
    const height = Math.max(beforeInfo.height ?? 0, afterInfo.height ?? 0)
    await sharp({ create: { width, height, channels: 4, background: '#ffffff' } })
      .composite([
        { input: beforePath, left: 0, top: 0 },
        { input: afterPath, left: (beforeInfo.width ?? 0) + 12, top: 0 }
      ])
      .png()
      .toFile(join(outDir, `${item.id}.png`))
  }
}

const beforeName = process.argv[2] ?? 'boxes-v1'
const afterName = process.argv[3] ?? 'boxes-final'

await cropAll(beforeName)
await cropAll(afterName)
await compareChanged()
await writeFile(join(workDir, 'README.md'), `# examples/1 bbox work

Source: \`examples/1.png\` (1672 x 941 px)

Generated artifacts:

- \`overlay-boxes-v1.png\`: first visual pass bbox overlay.
- \`overlay-boxes-final.png\`: refined bbox overlay after crop review.
- \`contact-boxes-v1.png\`: first-pass crop contact sheet.
- \`contact-boxes-final.png\`: refined crop contact sheet.
- \`crops/boxes-final/*.png\`: final crops for each semantic element.
- \`compare/*.png\`: before/after crop pairs for boxes changed by the loop.
- \`overlay-header-final.png\`: refined header-only bbox overlay.
- \`contact-header-final.png\`: refined header-only crop contact sheet.

The current element level intentionally includes large sections, grouped header labels, individual title text, icon/text header parts, content rows, architecture boxes, cards, and the footer. It does not yet split every paragraph line or every small icon inside cards.

Run a focused pass with:

\`\`\`bash
node examples/1-bbox-work/scripts/render-bboxes.mjs header-v1 header-final
\`\`\`
`)
