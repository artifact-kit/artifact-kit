import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import DeckKit from '@artifact-kit/deckkit'
import { Deck, Image, Shape, Slide, Text, renderPptx } from '@artifact-kit/deckkit-jsx'
import deckkitPro, { writeSvgToPng } from '@artifact-kit/deckkit-pro'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')
const workDir = join(repoRoot, 'examples/iot-innovation-project-bbox-work')
const manifestPath = join(workDir, 'manifests/reconstruction-manifest.json')
const outDir = join(repoRoot, 'packages/deckkit-test/tmp/iot-innovation-project')
const outFile = join(outDir, 'iot-innovation-project-basic.pptx')
const svgDir = join(workDir, 'svg')
const svgRenderDir = join(workDir, 'svg-renders')

const SLIDE_W = 13.333
const SLIDE_H = 7.5
const SOURCE_W = 1672
const SOURCE_H = 941

const BLUE = '0B55CC'
const DARK_BLUE = '071D73'
const RED = 'CB0018'
const LIGHT_BLUE = '2F75FF'
const LIGHT_RED = 'F29AA0'
const TEXT_DARK = '111827'
const MUTED = '374151'
const FONT = 'Microsoft YaHei'

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const elements = manifest.elements
const byId = new Map(elements.map((element) => [element.id, element]))

const pptx = new DeckKit()
pptx.use(deckkitPro())
const slideChildren = []
const vectorImagePaths = new Map()

function box(elementOrId) {
	const element = typeof elementOrId === 'string' ? byId.get(elementOrId) : elementOrId
	if (!element) throw new Error(`Unknown element: ${elementOrId}`)
	const { x, y, w, h } = element.bbox
	return {
		x: round((x / SOURCE_W) * SLIDE_W),
		y: round((y / SOURCE_H) * SLIDE_H),
		w: round((w / SOURCE_W) * SLIDE_W),
		h: round((h / SOURCE_H) * SLIDE_H),
	}
}

function round(value) {
	return Math.round(value * 1000) / 1000
}

function cropPath(element) {
	return join(workDir, element.crop)
}

function vectorImagePath(id) {
	const path = vectorImagePaths.get(id)
	if (!path) throw new Error(`Missing generated SVG render: ${id}`)
	return path
}

async function prepareSvgAssets() {
	await mkdir(svgDir, { recursive: true })
	await mkdir(svgRenderDir, { recursive: true })

	for (const id of SVG_ASSET_IDS) {
		const element = byId.get(id)
		if (!element) continue
		const svg = svgForElement(id, element)
		const svgPath = join(svgDir, `${id}.svg`)
		const pngPath = join(svgRenderDir, `${id}.png`)
		await writeFile(svgPath, `${svg}\n`)
		await writeSvgToPng(svg, pngPath, {
			width: element.bbox.w,
			height: element.bbox.h,
			fit: 'fill',
		})
		vectorImagePaths.set(id, pngPath)
	}
}

function drawTopImage() {
	const topRight = byId.get('top_right_visual')
	if (!topRight) return
	addImage({ path: cropPath(topRight), ...box(topRight) })
}

function drawShapeSkeleton() {
	drawSectionFrames()

	const drawOrder = [
		'system_sensing_layer',
		'system_edge_layer',
		'system_platform_layer',
		'system_application_layer',
		'system_service_layer',
		'application_card_1',
		'application_card_2',
		'application_card_3',
		'application_card_4',
		'innovation_card_1',
		'innovation_card_2',
		'innovation_card_3',
		'footer',
		'innovation_card_1_badge',
		'innovation_card_2_badge',
		'innovation_card_3_badge',
	]

	for (const id of drawOrder) {
		const element = byId.get(id)
		if (!element) continue
		drawNativeShape(element)
	}

	drawArrowLine('sensor_to_edge_arrow', 'dash')
	drawArrowLine('edge_to_platform_arrow', 'dash')
	drawPlatformBranchArrows()
	drawFooterDividers()
	drawSubtitleRules()
}

function drawSectionFrames() {
	for (const frame of [
		{ headerId: 'project_header_pill', bodyId: 'project_body_box', color: BLUE, border: '9AB8F8', tail: 'E8F1FF' },
		{ headerId: 'system_header_pill', bodyId: 'system_body_box', color: BLUE, border: '9AB8F8', tail: 'E8F1FF' },
		{ headerId: 'innovation_header_pill', bodyId: 'innovation_body_box', color: RED, border: LIGHT_RED, tail: 'FBE4E7' },
		{ headerId: 'application_header_pill', bodyId: 'application_body_box', color: BLUE, border: '9AB8F8', tail: 'E8F1FF' },
	]) {
		drawSectionBody(frame.bodyId, frame.border)
		drawSectionHeader(frame.headerId, frame.color, frame.tail)
	}
}

function drawSectionBody(bodyId, borderColor) {
	const element = byId.get(bodyId)
	if (!element) return
	addShape('roundRect', {
		...box(element),
		rectRadius: 0.045,
		line: { color: borderColor, width: 0.8, transparency: 12 },
		fill: { color: 'FFFFFF', transparency: 2 },
	})
}

function drawSectionHeader(headerId, color, tailColor) {
	const element = byId.get(headerId)
	if (!element) return
	addImage({ path: vectorImagePath(headerId), ...box(element) })
}

function drawNativeShape(element) {
	const b = box(element)
	const isRed = element.id.startsWith('innovation') || element.id === 'footer'
	const borderColor = isRed ? LIGHT_RED : '9AB8F8'

	if (element.id === 'footer') {
		addShape('rect', {
			...b,
			line: { color: RED, transparency: 100 },
			fill: {
				type: 'gradient',
				angle: 0,
				stops: [
					{ position: 0, color: '0047BA' },
					{ position: 0.58, color: '9F1745' },
					{ position: 1, color: 'D8001E' },
				],
			},
		})
		return
	}

	if (element.kind === 'decorative-shape' && element.id.includes('badge')) {
		addShape('ellipse', {
			...b,
			line: { color: RED, transparency: 100 },
			fill: { color: RED },
		})
		return
	}

	addShape('roundRect', {
		...b,
		rectRadius: element.kind === 'card' || element.kind === 'architecture-box' ? 0.06 : 0.04,
		line: { color: borderColor, width: 0.8, transparency: element.kind === 'section-body' ? 15 : 0 },
		fill: { color: 'FFFFFF', transparency: element.kind === 'section-body' ? 3 : 0 },
	})
}

function drawArrowLine(id, dashType = 'solid') {
	const element = byId.get(id)
	if (!element) return
	const b = box(element)
	addShape('line', {
		x: b.x,
		y: b.y + b.h / 2,
		w: b.w,
		h: 0,
		line: { color: BLUE, width: 1.2, dashType, endArrowType: 'triangle' },
	})
}

function drawPlatformBranchArrows() {
	const b = box('platform_to_app_arrows')
	const line = { color: BLUE, width: 1.4, endArrowType: 'triangle' }
	const x0 = b.x + b.w * 0.15
	const x1 = b.x + b.w * 0.95
	const yTop = b.y + b.h * 0.1
	const yMid = b.y + b.h * 0.5
	const yBottom = b.y + b.h * 0.9
	addShape('line', { x: x0, y: yTop, w: 0, h: yBottom - yTop, line: { color: BLUE, width: 1.4 } })
	addShape('line', { x: x0, y: yTop, w: x1 - x0, h: 0, line })
	addShape('line', { x: x0, y: yMid, w: x1 - x0, h: 0, line: { ...line, beginArrowType: 'triangle', endArrowType: 'none' } })
	addShape('line', { x: x0, y: yBottom, w: x1 - x0, h: 0, line })
}

function drawFooterDividers() {
	const b = box('footer_dividers')
	const xs = [0, 0.405, 0.745, 1]
	for (const ratio of xs) {
		const x = b.x + b.w * ratio
		addShape('line', {
			x,
			y: b.y + 0.02,
			w: 0,
			h: b.h - 0.04,
			line: { color: 'FFFFFF', width: 0.8, transparency: 35 },
		})
	}
}

function drawSubtitleRules() {
	const group = box('subtitle_group')
	const y = group.y + group.h * 0.53
	for (const [x, w] of [
		[group.x, 0.48],
		[group.x + group.w - 0.48, 0.48],
	]) {
		addShape('line', { x, y, w, h: 0, line: { color: DARK_BLUE, width: 1.1 } })
	}
}

function drawImagePlaceholders() {
	const placeholderIds = [
		'red_blue_swoosh',
		'project_header_icon',
		'project_item_1_icon',
		'project_item_2_icon',
		'project_item_3_icon',
		'system_header_icon',
		'system_sensing_icons',
		'system_edge_device',
		'system_platform_cloud',
		'system_application_devices',
		'system_service_icons',
		'innovation_header_icon',
		'innovation_card_1_icon',
		'innovation_card_2_icon',
		'innovation_card_3_icon',
		'application_header_icon',
		'application_card_1_image',
		'application_card_2_image',
		'application_card_3_image',
		'application_card_4_image',
	]

	for (const id of placeholderIds) {
		const element = byId.get(id)
		if (!element) continue
		const vectorPath = vectorImagePaths.get(id)
		if (vectorPath) {
			addImage({ path: vectorPath, ...box(element) })
		} else {
			addImage({ path: cropPath(element), ...box(element) })
		}
	}
}

const SVG_ASSET_IDS = [
	'red_blue_swoosh',
	'project_header_pill',
	'system_header_pill',
	'innovation_header_pill',
	'application_header_pill',
	'project_header_icon',
	'project_item_1_icon',
	'project_item_2_icon',
	'project_item_3_icon',
	'system_header_icon',
	'system_sensing_icons',
	'system_platform_cloud',
	'system_service_icons',
	'innovation_header_icon',
	'innovation_card_1_icon',
	'innovation_card_2_icon',
	'innovation_card_3_icon',
	'application_header_icon',
]

function svgForElement(id, element) {
	switch (id) {
		case 'red_blue_swoosh':
			return swooshSvg(element.bbox.w, element.bbox.h)
		case 'project_header_pill':
		case 'system_header_pill':
		case 'application_header_pill':
			return sectionHeaderSvg(element.bbox.w, element.bbox.h, BLUE, 'E8F1FF')
		case 'innovation_header_pill':
			return sectionHeaderSvg(element.bbox.w, element.bbox.h, RED, 'FBE4E7')
		case 'project_header_icon':
			return documentSearchSvg('FFFFFF')
		case 'system_header_icon':
			return hierarchySvg('FFFFFF')
		case 'innovation_header_icon':
			return bulbSvg('FFFFFF')
		case 'application_header_icon':
			return schoolSvg('FFFFFF')
		case 'project_item_1_icon':
			return iconBadgeSvg(thermoDropSvg(BLUE))
		case 'project_item_2_icon':
			return iconBadgeSvg(networkSvg(BLUE))
		case 'project_item_3_icon':
			return iconBadgeSvg(chartGrowthSvg(BLUE))
		case 'system_sensing_icons':
			return sensingGridSvg()
		case 'system_platform_cloud':
			return cloudServerSvg(BLUE)
		case 'system_service_icons':
			return serviceIconsSvg()
		case 'innovation_card_1_icon':
			return batteryLeafSvg(RED)
		case 'innovation_card_2_icon':
			return gaugeSvg(RED)
		case 'innovation_card_3_icon':
			return bellSvg(RED)
		default:
			throw new Error(`No SVG factory for ${id}`)
	}
}

function svgWrap(body, { width = 100, height = 100, viewBox = `0 0 ${width} ${height}` } = {}) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">${body}</svg>`
}

function sectionHeaderSvg(w, h, color, tailColor) {
	const mainEnd = Math.round(w * 0.83)
	const sweepStart = Math.round(w * 0.74)
	const sweepMid = Math.round(w * 0.89)
	const radius = Math.round(h * 0.5)
	return svgWrap(
		`<path d="M${sweepStart} 0H${w}C${sweepMid} ${Math.round(h * 0.12)} ${sweepMid} ${Math.round(h * 0.88)} ${sweepStart} ${h}H${Math.round(w * 0.64)}C${Math.round(w * 0.74)} ${Math.round(h * 0.72)} ${Math.round(w * 0.77)} ${Math.round(h * 0.28)} ${sweepStart} 0Z" fill="#${tailColor}"/>
		<path d="M${radius} 0H${mainEnd}C${Math.round(w * 0.79)} ${Math.round(h * 0.08)} ${Math.round(w * 0.75)} ${Math.round(h * 0.86)} ${Math.round(w * 0.64)} ${h}H0V${radius}C0 ${Math.round(h * 0.22)} ${Math.round(h * 0.22)} 0 ${radius} 0Z" fill="#${color}"/>
		<path d="M${Math.round(w * 0.86)} 1C${Math.round(w * 0.8)} ${Math.round(h * 0.22)} ${Math.round(w * 0.76)} ${Math.round(h * 0.76)} ${Math.round(w * 0.67)} ${h - 1}" fill="none" stroke="#ffffff" stroke-width="${Math.max(1.2, h * 0.045)}"/>`,
		{ width: w, height: h },
	)
}

function swooshSvg(w, h) {
	return svgWrap(
		`<path d="M0 ${h}C70 ${Math.round(h * 0.56)} 126 ${Math.round(h * 0.25)} 214 0H${w}C238 76 186 157 120 ${h}Z" fill="#0B55CC"/>
		<path d="M126 ${h}C178 ${Math.round(h * 0.55)} 212 ${Math.round(h * 0.24)} 266 0H${w}C283 ${Math.round(h * 0.46)} 236 ${Math.round(h * 0.78)} 180 ${h}Z" fill="#CB0018"/>
		<path d="M105 ${h}C159 ${Math.round(h * 0.58)} 198 ${Math.round(h * 0.25)} 244 0" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.85"/>`,
		{ width: w, height: h },
	)
}

function iconBadgeSvg(inner) {
	return svgWrap(`<circle cx="50" cy="50" r="47" fill="#EEF5FF" stroke="#D5E0F7" stroke-width="2"/>${inner}`)
}

function documentSearchSvg(color) {
	return svgWrap(`<g fill="none" stroke="#${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M19 10h42l20 20v58H19z"/>
		<path d="M61 10v20h20"/>
		<path d="M34 43h24M34 58h25M34 73h18"/>
		<circle cx="76" cy="74" r="10"/>
		<path d="M84 82l12 12"/>
	</g>`)
}

function hierarchySvg(color) {
	return svgWrap(`<g fill="none" stroke="#${color}" stroke-width="5" stroke-linejoin="round">
		<rect x="37" y="8" width="26" height="22"/>
		<rect x="8" y="70" width="26" height="22"/>
		<rect x="37" y="70" width="26" height="22"/>
		<rect x="66" y="70" width="26" height="22"/>
		<path d="M50 30v22M21 52h58M21 52v18M50 52v18M79 52v18"/>
	</g>`)
}

function bulbSvg(color) {
	return svgWrap(`<g fill="none" stroke="#${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M32 37a18 18 0 1 1 36 0c0 10-7 14-10 22H42c-3-8-10-12-10-22z"/>
		<path d="M40 67h20M42 78h16M50 3v10M10 37H0M100 37H90M19 10l8 8M81 10l-8 8"/>
	</g>`)
}

function schoolSvg(color) {
	return svgWrap(`<g fill="none" stroke="#${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M8 42l42-26 42 26"/>
		<rect x="16" y="42" width="68" height="44"/>
		<rect x="42" y="62" width="16" height="24"/>
		<path d="M28 55h10M62 55h10"/>
	</g>`)
}

function thermoDropSvg(color) {
	return `<g fill="none" stroke="#${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M35 18v39a13 13 0 1 0 16 0V18a8 8 0 0 0-16 0z"/>
		<path d="M43 30v33"/>
		<path d="M65 31c13 10 13 27 0 37"/>
	</g>`
}

function networkSvg(color) {
	return `<g fill="none" stroke="#${color}" stroke-width="5" stroke-linejoin="round">
		<circle cx="50" cy="23" r="9"/><circle cx="27" cy="68" r="9"/><circle cx="73" cy="68" r="9"/>
		<path d="M46 31L31 60M54 31l15 29M36 68h28"/>
	</g>`
}

function chartGrowthSvg(color) {
	return `<g fill="#${color}" stroke="#${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
		<rect x="25" y="60" width="8" height="22"/><rect x="41" y="49" width="8" height="33"/><rect x="57" y="37" width="8" height="45"/><rect x="73" y="27" width="8" height="55"/>
		<path d="M20 84h64" fill="none"/>
		<path d="M22 55l20-13 13 6 28-27" fill="none"/>
	</g>`
}

function cloudServerSvg(color) {
	return svgWrap(`<path d="M30 72h50a18 18 0 0 0 2-36 28 28 0 0 0-52-9 22 22 0 0 0 0 45z" fill="#${color}"/>
		<rect x="43" y="38" width="29" height="33" rx="3" fill="#fff"/>
		<g stroke="#${color}" stroke-width="3" stroke-linecap="round"><path d="M53 47h14M53 55h14M53 63h14"/></g>
		<g fill="#${color}"><circle cx="48" cy="47" r="2.2"/><circle cx="48" cy="55" r="2.2"/><circle cx="48" cy="63" r="2.2"/></g>`)
}

function batteryLeafSvg(color) {
	return svgWrap(`<g fill="none" stroke="#${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
		<rect x="22" y="9" width="52" height="58" rx="6"/>
		<path d="M37 4h22"/>
		<path d="M50 25l-8 15h12l-7 16"/>
		<path d="M50 69c16 2 27 11 33 24C66 91 54 84 50 69z"/>
		<path d="M50 70L28 96"/>
	</g>`)
}

function gaugeSvg(color) {
	return svgWrap(`<g fill="none" stroke="#${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M16 70a34 34 0 0 1 68 0"/>
		<path d="M50 61l22-29"/>
		<path d="M50 20v10M24 48l10 4M76 48l-10 4"/>
		<circle cx="50" cy="61" r="5" fill="#${color}"/>
	</g>`)
}

function bellSvg(color) {
	return svgWrap(`<g fill="none" stroke="#${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M28 66V42a22 22 0 0 1 44 0v24"/>
		<path d="M22 66h56"/>
		<path d="M43 80c3 6 11 6 14 0"/>
		<circle cx="80" cy="18" r="11" fill="#fff"/>
	</g><text x="80" y="24" text-anchor="middle" font-size="18" font-weight="700" fill="#${color}" font-family="${FONT}">!</text>`)
}

function sensingGridSvg() {
	const labels = ['温湿度传感器', '光照传感器', '空气质量传感器', '人体红外传感器', '水位传感器', '电能采集模块']
	const iconBodies = [thermoDropSvg(BLUE), '<circle cx="50" cy="37" r="16" fill="none" stroke="#0B55CC" stroke-width="5"/><g stroke="#0B55CC" stroke-width="4" stroke-linecap="round"><path d="M50 10v8M50 56v8M23 37h8M69 37h8M31 18l5 5M69 18l-5 5M31 56l5-5M69 56l-5-5"/></g>', '<path d="M25 56c18 0 34-15 44-37 10 25 1 47-18 53-12 4-22 0-26-16z" fill="none" stroke="#2F9E62" stroke-width="5"/><path d="M31 58l32-28" stroke="#2F9E62" stroke-width="4"/>', '<g fill="none" stroke="#0B55CC" stroke-width="5" stroke-linecap="round"><circle cx="34" cy="25" r="8"/><path d="M34 34v30M21 46h26"/><path d="M62 31c10 8 10 22 0 30M73 24c15 14 15 34 0 48"/></g>', '<g fill="none" stroke="#0B55CC" stroke-width="5" stroke-linecap="round"><circle cx="50" cy="43" r="24"/><path d="M34 43h32M40 54h20"/></g>', '<path d="M52 8L33 48h17l-7 36 25-46H51z" fill="#0B55CC"/>']
	const cells = labels.map((label, index) => {
		const col = index % 2
		const row = Math.floor(index / 2)
		const x = col * 50
		const y = row * 32
		return `<g transform="translate(${x} ${y}) scale(0.5)">
			${iconBodies[index]}
			<text x="50" y="94" text-anchor="middle" font-size="11" fill="#${TEXT_DARK}" font-family="${FONT}">${label}</text>
		</g>`
	}).join('')
	return svgWrap(cells)
}

function serviceIconsSvg() {
	const labels = ['业务系统', '数据分析', 'AI 算法', '开放接口']
	const icons = [
		'<path d="M22 24l28-14 28 14v34L50 72 22 58zM22 24l28 14 28-14M50 38v34" fill="none" stroke="#0B55CC" stroke-width="5"/>',
		'<g fill="#0B55CC"><rect x="22" y="50" width="10" height="24"/><rect x="45" y="36" width="10" height="38"/><rect x="68" y="20" width="10" height="54"/></g><path d="M18 76h65M25 47l22-14 24-16" fill="none" stroke="#0B55CC" stroke-width="4"/>',
		'<g fill="none" stroke="#0B55CC" stroke-width="5" stroke-linecap="round"><path d="M25 44c-8-18 18-30 28-15 10-15 36-3 28 15"/><path d="M31 45v24h38V45M39 69v13M61 69v13"/></g>',
		'<rect x="14" y="28" width="72" height="38" rx="4" fill="none" stroke="#0B55CC" stroke-width="5"/><text x="50" y="55" text-anchor="middle" font-size="22" font-weight="700" fill="#0B55CC" font-family="Arial">API</text>',
	]
	const cells = labels.map((label, index) => `<g transform="translate(${index * 25} 0) scale(0.25)">
		${icons[index]}
		<text x="50" y="96" text-anchor="middle" font-size="15" fill="#${TEXT_DARK}" font-family="${FONT}">${label}</text>
	</g>`).join('')
	return svgWrap(cells)
}

function drawNativeIcon(id) {
	const frame = box(id)
	const blue = BLUE
	const red = RED
	switch (id) {
		case 'project_header_icon':
			drawDocumentSearchIcon(frame, 'FFFFFF')
			return true
		case 'system_header_icon':
			drawHierarchyIcon(frame, 'FFFFFF')
			return true
		case 'innovation_header_icon':
			drawBulbIcon(frame, 'FFFFFF')
			return true
		case 'application_header_icon':
			drawSchoolIcon(frame, 'FFFFFF')
			return true
		case 'project_item_1_icon':
			drawIconCircle(frame)
			drawThermoDropIcon(frame, blue)
			return true
		case 'project_item_2_icon':
			drawIconCircle(frame)
			drawNetworkIcon(frame, blue)
			return true
		case 'project_item_3_icon':
			drawIconCircle(frame)
			drawChartGrowthIcon(frame, blue)
			return true
		case 'system_platform_cloud':
			drawCloudServerIcon(frame, blue)
			return true
		case 'innovation_card_1_icon':
			drawBatteryLeafIcon(frame, red)
			return true
		case 'innovation_card_2_icon':
			drawGaugeIcon(frame, red)
			return true
		case 'innovation_card_3_icon':
			drawBellIcon(frame, red)
			return true
		case 'system_sensing_icons':
			drawSensingLayerGrid(frame)
			return true
		case 'system_service_icons':
			drawServiceIconRow(frame)
			return true
		default:
			return false
	}
}

function pt(frame, x, y) {
	return {
		x: round(frame.x + frame.w * x),
		y: round(frame.y + frame.h * y),
	}
}

function rectIn(frame, x, y, w, h) {
	return {
		x: round(frame.x + frame.w * x),
		y: round(frame.y + frame.h * y),
		w: round(frame.w * w),
		h: round(frame.h * h),
	}
}

function noFill() {
	return { color: 'FFFFFF', transparency: 100 }
}

function lineIn(frame, from, to, color, width = 1, extra = {}) {
	const a = pt(frame, from.x, from.y)
	const b = pt(frame, to.x, to.y)
	addShape('line', {
		x: a.x,
		y: a.y,
		w: round(b.x - a.x),
		h: round(b.y - a.y),
		line: { color, width, ...extra },
	})
}

function textIn(frame, x, y, w, h, text, fontSize, color = TEXT_DARK, extra = {}) {
	addText({
		...rectIn(frame, x, y, w, h),
		text,
		fontFace: FONT,
		fontSize,
		color,
		margin: 0,
		align: 'center',
		valign: 'mid',
		fit: 'shrink',
		...extra,
	})
}

function drawIconCircle(frame) {
	addShape('ellipse', {
		...rectIn(frame, 0.03, 0.03, 0.94, 0.94),
		fill: { color: 'EEF5FF' },
		line: { color: 'D5E0F7', width: 0.8 },
	})
}

function drawDocumentSearchIcon(frame, color) {
	addShape('rect', { ...rectIn(frame, 0.16, 0.1, 0.48, 0.76), fill: noFill(), line: { color, width: 1.4 } })
	lineIn(frame, { x: 0.64, y: 0.1 }, { x: 0.84, y: 0.31 }, color, 1.4)
	lineIn(frame, { x: 0.84, y: 0.31 }, { x: 0.84, y: 0.86 }, color, 1.4)
	lineIn(frame, { x: 0.32, y: 0.42 }, { x: 0.58, y: 0.42 }, color, 1.1)
	lineIn(frame, { x: 0.32, y: 0.58 }, { x: 0.58, y: 0.58 }, color, 1.1)
	lineIn(frame, { x: 0.32, y: 0.74 }, { x: 0.52, y: 0.74 }, color, 1.1)
	addShape('ellipse', { ...rectIn(frame, 0.64, 0.66, 0.24, 0.22), fill: noFill(), line: { color, width: 1.2 } })
	lineIn(frame, { x: 0.82, y: 0.84 }, { x: 0.95, y: 0.97 }, color, 1.2)
}

function drawHierarchyIcon(frame, color) {
	addShape('rect', { ...rectIn(frame, 0.37, 0.08, 0.26, 0.22), fill: noFill(), line: { color, width: 1.2 } })
	for (const x of [0.08, 0.37, 0.66]) {
		addShape('rect', { ...rectIn(frame, x, 0.7, 0.26, 0.22), fill: noFill(), line: { color, width: 1.2 } })
	}
	lineIn(frame, { x: 0.5, y: 0.3 }, { x: 0.5, y: 0.52 }, color, 1.2)
	lineIn(frame, { x: 0.21, y: 0.52 }, { x: 0.79, y: 0.52 }, color, 1.2)
	lineIn(frame, { x: 0.21, y: 0.52 }, { x: 0.21, y: 0.7 }, color, 1.2)
	lineIn(frame, { x: 0.5, y: 0.52 }, { x: 0.5, y: 0.7 }, color, 1.2)
	lineIn(frame, { x: 0.79, y: 0.52 }, { x: 0.79, y: 0.7 }, color, 1.2)
}

function drawBulbIcon(frame, color) {
	addShape('ellipse', { ...rectIn(frame, 0.28, 0.12, 0.44, 0.45), fill: noFill(), line: { color, width: 1.2 } })
	lineIn(frame, { x: 0.38, y: 0.58 }, { x: 0.62, y: 0.58 }, color, 1.2)
	lineIn(frame, { x: 0.4, y: 0.7 }, { x: 0.6, y: 0.7 }, color, 1.2)
	lineIn(frame, { x: 0.5, y: 0.0 }, { x: 0.5, y: 0.08 }, color, 1)
	lineIn(frame, { x: 0.12, y: 0.32 }, { x: 0.02, y: 0.32 }, color, 1)
	lineIn(frame, { x: 0.88, y: 0.32 }, { x: 0.98, y: 0.32 }, color, 1)
	lineIn(frame, { x: 0.2, y: 0.08 }, { x: 0.27, y: 0.16 }, color, 1)
	lineIn(frame, { x: 0.8, y: 0.08 }, { x: 0.73, y: 0.16 }, color, 1)
}

function drawSchoolIcon(frame, color) {
	addShape('rect', { ...rectIn(frame, 0.16, 0.42, 0.68, 0.44), fill: noFill(), line: { color, width: 1.2 } })
	lineIn(frame, { x: 0.08, y: 0.42 }, { x: 0.5, y: 0.16 }, color, 1.2)
	lineIn(frame, { x: 0.5, y: 0.16 }, { x: 0.92, y: 0.42 }, color, 1.2)
	addShape('rect', { ...rectIn(frame, 0.42, 0.62, 0.16, 0.24), fill: noFill(), line: { color, width: 1.1 } })
	lineIn(frame, { x: 0.28, y: 0.54 }, { x: 0.38, y: 0.54 }, color, 1)
	lineIn(frame, { x: 0.62, y: 0.54 }, { x: 0.72, y: 0.54 }, color, 1)
}

function drawThermoDropIcon(frame, color) {
	addShape('rect', { ...rectIn(frame, 0.31, 0.17, 0.13, 0.46), rectRadius: 0.08, fill: noFill(), line: { color, width: 1.8 } })
	addShape('ellipse', { ...rectIn(frame, 0.25, 0.56, 0.25, 0.25), fill: noFill(), line: { color, width: 1.8 } })
	lineIn(frame, { x: 0.375, y: 0.25 }, { x: 0.375, y: 0.62 }, color, 1.4)
	addShape('arc', { ...rectIn(frame, 0.57, 0.28, 0.22, 0.34), angleRange: [200, 520], fill: noFill(), line: { color, width: 1.8 } })
}

function drawNetworkIcon(frame, color) {
	for (const [x, y] of [[0.5, 0.22], [0.26, 0.68], [0.74, 0.68]]) {
		addShape('ellipse', { ...rectIn(frame, x - 0.09, y - 0.09, 0.18, 0.18), fill: noFill(), line: { color, width: 1.8 } })
	}
	lineIn(frame, { x: 0.5, y: 0.31 }, { x: 0.26, y: 0.59 }, color, 1.8)
	lineIn(frame, { x: 0.5, y: 0.31 }, { x: 0.74, y: 0.59 }, color, 1.8)
	lineIn(frame, { x: 0.35, y: 0.68 }, { x: 0.65, y: 0.68 }, color, 1.8)
}

function drawChartGrowthIcon(frame, color) {
	for (const [x, y, h] of [[0.24, 0.61, 0.22], [0.4, 0.49, 0.34], [0.56, 0.37, 0.46], [0.72, 0.27, 0.56]]) {
		addShape('rect', { ...rectIn(frame, x, y, 0.08, h), fill: { color }, line: { color, transparency: 100 } })
	}
	lineIn(frame, { x: 0.2, y: 0.84 }, { x: 0.82, y: 0.84 }, color, 1.5)
	lineIn(frame, { x: 0.22, y: 0.54 }, { x: 0.42, y: 0.42 }, color, 1.5)
	lineIn(frame, { x: 0.42, y: 0.42 }, { x: 0.55, y: 0.48 }, color, 1.5)
	lineIn(frame, { x: 0.55, y: 0.48 }, { x: 0.82, y: 0.22 }, color, 1.5)
}

function drawCloudServerIcon(frame, color) {
	addShape('cloud', { ...rectIn(frame, 0.03, 0.08, 0.94, 0.82), fill: { color }, line: { color, transparency: 100 } })
	addShape('rect', { ...rectIn(frame, 0.42, 0.34, 0.28, 0.4), fill: { color: 'FFFFFF' }, line: { color: 'FFFFFF', transparency: 100 } })
	for (const y of [0.42, 0.52, 0.62]) {
		lineIn(frame, { x: 0.5, y }, { x: 0.65, y }, color, 1)
		addShape('ellipse', { ...rectIn(frame, 0.455, y - 0.02, 0.035, 0.04), fill: { color }, line: { color, transparency: 100 } })
	}
}

function drawBatteryLeafIcon(frame, color) {
	addShape('rect', { ...rectIn(frame, 0.18, 0.06, 0.55, 0.62), rectRadius: 0.04, fill: noFill(), line: { color, width: 1.8 } })
	lineIn(frame, { x: 0.32, y: 0.02 }, { x: 0.58, y: 0.02 }, color, 1.5)
	addShape('lightningBolt', { ...rectIn(frame, 0.34, 0.24, 0.24, 0.28), fill: { color }, line: { color, transparency: 100 } })
	addShape('arc', { ...rectIn(frame, 0.34, 0.67, 0.52, 0.26), angleRange: [210, 520], fill: noFill(), line: { color, width: 1.8 } })
	lineIn(frame, { x: 0.5, y: 0.68 }, { x: 0.28, y: 0.95 }, color, 1.6)
}

function drawGaugeIcon(frame, color) {
	addShape('arc', { ...rectIn(frame, 0.12, 0.16, 0.76, 0.72), angleRange: [200, 520], fill: noFill(), line: { color, width: 1.8 } })
	lineIn(frame, { x: 0.5, y: 0.58 }, { x: 0.72, y: 0.32 }, color, 1.8)
	addShape('ellipse', { ...rectIn(frame, 0.45, 0.52, 0.1, 0.1), fill: { color }, line: { color, transparency: 100 } })
	for (const [x1, y1, x2, y2] of [[0.5,0.2,0.5,0.3],[0.22,0.46,0.32,0.5],[0.78,0.46,0.68,0.5]]) lineIn(frame, { x: x1, y: y1 }, { x: x2, y: y2 }, color, 1.3)
}

function drawBellIcon(frame, color) {
	addShape('arc', { ...rectIn(frame, 0.18, 0.18, 0.56, 0.5), angleRange: [180, 540], fill: noFill(), line: { color, width: 1.8 } })
	lineIn(frame, { x: 0.18, y: 0.68 }, { x: 0.76, y: 0.68 }, color, 1.8)
	lineIn(frame, { x: 0.28, y: 0.68 }, { x: 0.28, y: 0.42 }, color, 1.8)
	lineIn(frame, { x: 0.66, y: 0.68 }, { x: 0.66, y: 0.42 }, color, 1.8)
	addShape('arc', { ...rectIn(frame, 0.4, 0.75, 0.18, 0.14), angleRange: [0, 180], fill: noFill(), line: { color, width: 1.5 } })
	addShape('ellipse', { ...rectIn(frame, 0.68, 0.1, 0.22, 0.22), fill: { color: 'FFFFFF' }, line: { color, width: 1.6 } })
	textIn(frame, 0.68, 0.1, 0.22, 0.22, '!', 6, color, { bold: true })
}

function drawSensingLayerGrid(frame) {
	const items = [
		{ x: 0.04, y: 0.02, icon: drawMiniDroplets, label: '温湿度传感器' },
		{ x: 0.54, y: 0.02, icon: drawMiniSun, label: '光照传感器' },
		{ x: 0.04, y: 0.34, icon: drawMiniLeaf, label: '空气质量传感器' },
		{ x: 0.54, y: 0.34, icon: drawMiniPersonWave, label: '人体红外传感器' },
		{ x: 0.04, y: 0.66, icon: drawMiniWaterLevel, label: '水位传感器' },
		{ x: 0.54, y: 0.66, icon: drawMiniLightning, label: '电能采集模块' },
	]
	for (const item of items) {
		const cell = rectIn(frame, item.x, item.y, 0.42, 0.28)
		item.icon(cell, BLUE)
		textIn(cell, 0, 0.68, 1, 0.3, item.label, 4.4, TEXT_DARK)
	}
}

function drawServiceIconRow(frame) {
	const items = [
		{ x: 0.02, icon: drawMiniCube, label: '业务系统' },
		{ x: 0.27, icon: drawMiniBarChart, label: '数据分析' },
		{ x: 0.52, icon: drawMiniBrain, label: 'AI 算法' },
		{ x: 0.77, icon: drawMiniApi, label: '开放接口' },
	]
	for (const item of items) {
		const cell = rectIn(frame, item.x, 0, 0.21, 1)
		item.icon(rectIn(cell, 0.16, 0.03, 0.68, 0.55), BLUE)
		textIn(cell, 0, 0.62, 1, 0.32, item.label, 5.2, TEXT_DARK)
	}
}

function drawMiniDroplets(frame, color) {
	addShape('arc', { ...rectIn(frame, 0.14, 0.1, 0.22, 0.5), angleRange: [200, 520], fill: noFill(), line: { color, width: 1.3 } })
	addShape('arc', { ...rectIn(frame, 0.5, 0.16, 0.24, 0.42), angleRange: [200, 520], fill: noFill(), line: { color, width: 1.3 } })
	lineIn(frame, { x: 0.25, y: 0.1 }, { x: 0.25, y: 0.02 }, color, 1.1)
}

function drawMiniSun(frame, color) {
	addShape('sun', { ...rectIn(frame, 0.24, 0.04, 0.52, 0.52), fill: noFill(), line: { color, width: 1.2 } })
}

function drawMiniLeaf(frame, color) {
	addShape('arc', { ...rectIn(frame, 0.16, 0.1, 0.58, 0.42), angleRange: [205, 525], fill: noFill(), line: { color: '2F9E62', width: 1.4 } })
	lineIn(frame, { x: 0.22, y: 0.5 }, { x: 0.7, y: 0.18 }, '2F9E62', 1)
}

function drawMiniPersonWave(frame, color) {
	addShape('ellipse', { ...rectIn(frame, 0.2, 0.08, 0.18, 0.18), fill: noFill(), line: { color, width: 1.1 } })
	lineIn(frame, { x: 0.29, y: 0.27 }, { x: 0.29, y: 0.56 }, color, 1.2)
	lineIn(frame, { x: 0.16, y: 0.38 }, { x: 0.42, y: 0.38 }, color, 1.1)
	addShape('arc', { ...rectIn(frame, 0.52, 0.12, 0.24, 0.38), angleRange: [260, 460], fill: noFill(), line: { color, width: 1.1 } })
	addShape('arc', { ...rectIn(frame, 0.62, 0.06, 0.3, 0.5), angleRange: [260, 460], fill: noFill(), line: { color, width: 1.1 } })
}

function drawMiniWaterLevel(frame, color) {
	addShape('ellipse', { ...rectIn(frame, 0.25, 0.06, 0.5, 0.5), fill: noFill(), line: { color, width: 1.2 } })
	lineIn(frame, { x: 0.32, y: 0.35 }, { x: 0.68, y: 0.35 }, color, 1)
	lineIn(frame, { x: 0.38, y: 0.45 }, { x: 0.62, y: 0.45 }, color, 1)
}

function drawMiniLightning(frame, color) {
	addShape('lightningBolt', { ...rectIn(frame, 0.32, 0.04, 0.36, 0.52), fill: { color }, line: { color, transparency: 100 } })
}

function drawMiniCube(frame, color) {
	addShape('cube', { ...rectIn(frame, 0.16, 0.05, 0.68, 0.58), fill: noFill(), line: { color, width: 1.2 } })
}

function drawMiniBarChart(frame, color) {
	for (const [x, y, h] of [[0.16, 0.55, 0.28], [0.38, 0.38, 0.45], [0.6, 0.2, 0.63]]) {
		addShape('rect', { ...rectIn(frame, x, y, 0.12, h), fill: { color }, line: { color, transparency: 100 } })
	}
	lineIn(frame, { x: 0.12, y: 0.85 }, { x: 0.82, y: 0.85 }, color, 1)
	lineIn(frame, { x: 0.18, y: 0.52 }, { x: 0.38, y: 0.38 }, color, 1)
	lineIn(frame, { x: 0.45, y: 0.38 }, { x: 0.66, y: 0.2 }, color, 1)
}

function drawMiniBrain(frame, color) {
	addShape('arc', { ...rectIn(frame, 0.1, 0.08, 0.42, 0.36), angleRange: [90, 360], fill: noFill(), line: { color, width: 1.2 } })
	addShape('arc', { ...rectIn(frame, 0.4, 0.08, 0.42, 0.36), angleRange: [180, 450], fill: noFill(), line: { color, width: 1.2 } })
	lineIn(frame, { x: 0.28, y: 0.46 }, { x: 0.28, y: 0.78 }, color, 1.1)
	lineIn(frame, { x: 0.64, y: 0.46 }, { x: 0.64, y: 0.78 }, color, 1.1)
	lineIn(frame, { x: 0.28, y: 0.78 }, { x: 0.64, y: 0.78 }, color, 1.1)
}

function drawMiniApi(frame, color) {
	addShape('rect', { ...rectIn(frame, 0.08, 0.2, 0.84, 0.44), fill: noFill(), line: { color, width: 1.2 } })
	textIn(frame, 0.08, 0.22, 0.84, 0.4, 'API', 7, color, { bold: true })
}

function drawTexts() {
	for (const [id, entry] of Object.entries(TEXT)) {
		const element = byId.get(id)
		if (!element) continue
		const opts = {
			...box(element),
			fontFace: FONT,
			color: entry.color ?? TEXT_DARK,
			fontSize: entry.fontSize,
			bold: entry.bold,
			align: entry.align ?? 'left',
			valign: entry.valign ?? 'mid',
			margin: entry.margin ?? 0.02,
			breakLine: entry.breakLine,
			fit: 'shrink',
			isTextBox: true,
		}
		addText(entry.runs ? { runs: entry.runs, ...opts } : { text: entry.text, ...opts })
	}
}

function addShape(shape, props) {
	slideChildren.push(Shape({ shape, ...props }))
}

function addImage(props) {
	slideChildren.push(Image(props))
}

function addText(props) {
	slideChildren.push(Text(props))
}

const bodyRun = (heading, body, color = BLUE) => [
	{ text: `${heading}\n`, options: { bold: true, color, breakLine: true } },
	{ text: body, options: { color: TEXT_DARK } },
]

const TEXT = {
	title_iot: { text: 'IoT', fontSize: 35, color: RED, bold: true, margin: 0 },
	title_cn: { text: '物联网创新项目', fontSize: 34, color: DARK_BLUE, bold: true, margin: 0 },
	subtitle_smart_sensing: { text: '智慧感知', fontSize: 18, color: RED, bold: true, align: 'center', margin: 0 },
	subtitle_collaboration: { text: '互联协同', fontSize: 18, color: DARK_BLUE, bold: true, align: 'center', margin: 0 },
	subtitle_data_driven: { text: '数据驱动', fontSize: 18, color: RED, bold: true, align: 'center', margin: 0 },
	exhibition_line: { text: '大学生创新创业竞赛答辩展示', fontSize: 13, color: DARK_BLUE, align: 'center', margin: 0 },

	project_header_text: { text: '项目背景', fontSize: 14.5, color: 'FFFFFF', bold: true, align: 'center', margin: 0 },
	project_item_1_text: { runs: bodyRun('智能感知需求增长', '各行业对环境、设备与行为的智能感知需求持续提升。'), fontSize: 8.5, margin: 0.01 },
	project_item_2_text: { runs: bodyRun('设备互联趋势明显', '海量终端接入与互联互通，推动万物互联时代到来。'), fontSize: 8.5, margin: 0.01 },
	project_item_3_text: { runs: bodyRun('数据驱动精细化管理', '数据价值不断释放，助力决策优化与业务创新。'), fontSize: 8.5, margin: 0.01 },

	system_header_text: { text: '系统架构', fontSize: 14.5, color: 'FFFFFF', bold: true, align: 'center', margin: 0 },
	system_sensing_title: { text: '感知层（终端设备）', fontSize: 8.5, color: DARK_BLUE, bold: true, align: 'center', margin: 0 },
	system_sensing_more_text: { text: '... 更多传感器接入', fontSize: 7.2, color: TEXT_DARK, align: 'center', margin: 0 },
	sensor_to_edge_protocols: { text: 'LoRa / NB-IoT\nWi-Fi / BLE', fontSize: 6.8, color: TEXT_DARK, align: 'center', margin: 0 },
	system_edge_title: { text: '边缘层（边缘网关）', fontSize: 8.5, color: DARK_BLUE, bold: true, align: 'center', margin: 0 },
	system_edge_bullets: { text: '• 数据采集与协议转换\n• 本地缓存与边缘计算\n• 设备管理与安全加密', fontSize: 6.7, color: TEXT_DARK, margin: 0 },
	edge_to_platform_protocols: { text: 'MQTT\nTLS 加密', fontSize: 6.5, color: TEXT_DARK, align: 'center', margin: 0 },
	system_platform_title: { text: '平台层（云平台）', fontSize: 8.5, color: DARK_BLUE, bold: true, align: 'center', margin: 0 },
	system_platform_bullets: { text: '• 设备接入与管理\n• 数据存储与处理\n• 规则引擎与告警\n• 可视化与开放 API', fontSize: 6.7, color: TEXT_DARK, margin: 0 },
	system_application_title: { text: '应用层（移动端/大屏）', fontSize: 8.5, color: DARK_BLUE, bold: true, align: 'center', margin: 0 },
	system_service_title: { text: '服务层（第三方系统）', fontSize: 8.5, color: DARK_BLUE, bold: true, align: 'center', margin: 0 },

	innovation_header_text: { text: '核心创新', fontSize: 14.5, color: 'FFFFFF', bold: true, align: 'center', margin: 0 },
	innovation_card_1_badge: { text: '01', fontSize: 10, color: 'FFFFFF', bold: true, align: 'center', margin: 0 },
	innovation_card_2_badge: { text: '02', fontSize: 10, color: 'FFFFFF', bold: true, align: 'center', margin: 0 },
	innovation_card_3_badge: { text: '03', fontSize: 10, color: 'FFFFFF', bold: true, align: 'center', margin: 0 },
	innovation_card_1_text: { runs: bodyRun('低功耗感知设计', '采用低功耗硬件与休眠策略，延长设备续航，降低运维成本。', RED), fontSize: 8.5, margin: 0.01 },
	innovation_card_2_text: { runs: bodyRun('实时监测与可视化', '毫秒级数据采集与传输，多维度可视化展示，掌握运行全局态势。', RED), fontSize: 8.5, margin: 0.01 },
	innovation_card_3_text: { runs: bodyRun('智能告警与联动', '基于规则与AI模型的智能告警，支持多渠道推送与自动化联动控制。', RED), fontSize: 8.5, margin: 0.01 },

	application_header_text: { text: '应用场景', fontSize: 14.5, color: 'FFFFFF', bold: true, align: 'center', margin: 0 },
	application_card_1_title: { text: '智慧校园', fontSize: 8.5, color: DARK_BLUE, bold: true, align: 'center', margin: 0 },
	application_card_1_text: { text: '环境监测 | 能耗管理\n安防预警 | 设备管理', fontSize: 7.2, color: TEXT_DARK, align: 'center', margin: 0 },
	application_card_2_title: { text: '智慧农业', fontSize: 8.5, color: DARK_BLUE, bold: true, align: 'center', margin: 0 },
	application_card_2_text: { text: '墒情监测 | 气象监测\n灌溉控制 | 病虫害预警', fontSize: 7.2, color: TEXT_DARK, align: 'center', margin: 0 },
	application_card_3_title: { text: '智慧家庭', fontSize: 8.5, color: DARK_BLUE, bold: true, align: 'center', margin: 0 },
	application_card_3_text: { text: '环境感知 | 安防监控\n智能控制 | 能耗管理', fontSize: 7.2, color: TEXT_DARK, align: 'center', margin: 0 },
	application_card_4_title: { text: '工业监测', fontSize: 8.5, color: DARK_BLUE, bold: true, align: 'center', margin: 0 },
	application_card_4_text: { text: '设备状态监测 | 预测性维护\n能耗分析 | 安全预警', fontSize: 7.2, color: TEXT_DARK, align: 'center', margin: 0 },

	footer_slogan: { text: '连接万物 · 智慧未来', fontSize: 10.5, color: 'FFFFFF', bold: true, align: 'center', margin: 0 },
	footer_team: { text: '团队名称：智联未来团队', fontSize: 10, color: 'FFFFFF', align: 'center', margin: 0 },
	footer_school: { text: '所属院校：XX大学', fontSize: 10, color: 'FFFFFF', align: 'center', margin: 0 },
	footer_owner: { text: '负责人：张三', fontSize: 10, color: 'FFFFFF', align: 'center', margin: 0 },
	footer_date: { text: '2024年5月', fontSize: 10, color: 'FFFFFF', align: 'center', margin: 0 },
}

await mkdir(outDir, { recursive: true })
await prepareSvgAssets()
drawTopImage()
drawShapeSkeleton()
drawImagePlaceholders()
drawTexts()
await renderPptx(
	Deck({
		title: 'IoT Innovation Project Basic Reconstruction',
		author: 'Artifact Kit',
		company: 'Artifact Kit',
		subject: 'IoT innovation project reconstruction baseline',
		layout: { name: 'IOT_SOURCE', width: SLIDE_W, height: SLIDE_H },
		theme: {
			headFontFace: FONT,
			bodyFontFace: FONT,
			lang: 'zh-CN',
		},
		children: [
			Slide({
				background: { color: 'FFFFFF' },
				children: slideChildren,
			}),
		],
	}),
	{ pptx, fileName: outFile },
)
console.log(outFile)
