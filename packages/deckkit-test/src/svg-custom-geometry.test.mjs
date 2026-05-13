import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import DeckKit from '@artifact-kit/deckkit'
import { CustomGeometry, Deck, Slide, renderPptx } from '@artifact-kit/deckkit-jsx'
import deckkitPro from '@artifact-kit/deckkit-pro'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '../../..')
const outDir = join(__dirname, '../tmp')
const fixturePath = join(root, 'packages/deckkit-pro/test/fixtures/project-header-icon.svg')

test('deckkit-pro renders SVG custom geometry through JSX', async () => {
	const svg = await readFile(fixturePath, 'utf8')
	const pptx = new DeckKit()
	pptx.use(deckkitPro())

	const deck = Deck({
		layout: { name: 'LAYOUT_CUSTOM_WIDE', width: 13.333, height: 7.5 },
		children: [
			Slide({
				children: [
					CustomGeometry({
						svg,
						x: 0.7,
						y: 0.7,
						w: 0.58,
						h: 0.4,
					}),
				],
			}),
		],
	})

	await mkdir(outDir, { recursive: true })
	const outFile = join(outDir, 'svg-custom-geometry.pptx')
	await renderPptx(deck, { pptx, fileName: outFile })

	const buffer = await readFile(outFile)
	const zip = await JSZip.loadAsync(buffer)
	const slideXml = await zip.file('ppt/slides/slide1.xml').async('string')

	assert.equal((slideXml.match(/<a:custGeom>/g) || []).length, 7)
	assert.match(slideXml, /<a:cubicBezTo>/)
})
