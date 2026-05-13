import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import DeckKit from '@artifact-kit/deckkit'
import { CustomGeometry, Deck, Image, Shape, Slide, Text, renderPptx } from '@artifact-kit/deckkit-jsx'
import deckkitPro, { compareImages, renderSvgToPng, svgToCustomGeometry, writeImage } from '@artifact-kit/deckkit-pro'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')
const workDir = join(repoRoot, 'examples/iot-innovation-project-bbox-work')
const manifestPath = join(workDir, 'manifests/reconstruction-manifest.json')
const outDir = join(repoRoot, 'packages/deckkit-test/tmp/iot-innovation-project')
const outFile = join(outDir, 'iot-innovation-project-basic.pptx')
const diagnosticDir = join(outDir, 'svg-diagnostic')
const svgFixtureDir = join(repoRoot, 'packages/deckkit-test/fixtures/iot-innovation-project/svg')

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
const svgAssets = await loadSvgAssets()

const pptx = new DeckKit()
pptx.use(deckkitPro())
const slideChildren = []

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

function drawTopImage() {
	const topRight = byId.get('top_right_visual')
	if (!topRight) return
	addImage({ path: cropPath(topRight), ...box(topRight) })
}

function drawShapeSkeleton() {
	const drawOrder = [
		'project_body_box',
		'system_body_box',
		'innovation_body_box',
		'application_body_box',
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
		'project_header_pill',
		'system_header_pill',
		'innovation_header_pill',
		'application_header_pill',
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

	if (element.kind === 'section-header') {
		addShape('roundRect', {
			...b,
			rectRadius: 0.18,
			line: { color: isRed ? RED : BLUE, transparency: 100 },
			fill: { color: isRed ? RED : BLUE },
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
	addShape('line', { x: x1, y: yMid, w: x0 - x1, h: 0, line: { ...line, beginArrowType: 'triangle', endArrowType: 'none' } })
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
		const svg = svgAssets.get(id)
		if (svg) {
			addCustomGeometry({
				svg,
				...box(element),
			})
		} else {
			addImage({ path: cropPath(element), ...box(element) })
		}
	}
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

function addCustomGeometry(props) {
	slideChildren.push(CustomGeometry(props))
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

async function loadSvgAssets() {
	const entries = [
		['project_header_icon', 'project_header_icon.svg'],
		['system_header_icon', 'system_header_icon.svg'],
		['innovation_header_icon', 'innovation_header_icon.svg'],
		['application_header_icon', 'application_header_icon.svg'],
	]
	const assets = new Map()
	for (const [id, file] of entries) {
		assets.set(id, await readFile(join(svgFixtureDir, file), 'utf8'))
	}
	return assets
}

async function writeSvgReviewImages() {
	const renderDir = join(outDir, 'svg-renders')
	const compareDir = join(outDir, 'svg-compare')

	for (const [id, svg] of svgAssets) {
		const element = byId.get(id)
		if (!element) continue
		const background = id === 'innovation_header_icon' ? `#${RED}` : `#${BLUE}`
		const render = await renderSvgToPng(svg, {
			width: element.bbox.w,
			height: element.bbox.h,
			fit: 'contain',
			background,
		})
		await writeImage(render, join(renderDir, `${id}.png`))
		await writeImage(
			await compareImages(cropPath(element), render, { background: '#ffffff', gap: 8 }),
			join(compareDir, `${id}.png`),
		)
	}
}

await mkdir(diagnosticDir, { recursive: true })
await writeSvgReviewImages()
await writeSvgDiagnostic(process.argv[2] ?? 'system_header_icon')
await renderPptx(
	Deck({
		title: 'IoT SVG Custom Geometry Diagnostic',
		author: 'Artifact Kit',
		company: 'Artifact Kit',
		subject: 'Single SVG custom geometry diagnostic',
		layout: { name: 'IOT_SOURCE', width: SLIDE_W, height: SLIDE_H },
		theme: {
			headFontFace: FONT,
			bodyFontFace: FONT,
			lang: 'zh-CN',
		},
		children: [
			Slide({
				background: { color: BLUE },
				children: slideChildren,
			}),
		],
	}),
	{ pptx, fileName: outFile },
)
console.log(outFile)

async function writeSvgDiagnostic(id) {
	const svg = svgAssets.get(id)
	if (!svg) throw new Error(`No SVG asset registered for ${id}`)

	const paperResult = svgToCustomGeometry(svg, {
		x: 4.9,
		y: 2.0,
		w: 2.8,
		h: 2.9,
		precision: 5,
	})

	await writeFile(join(diagnosticDir, `${id}.svg`), svg)
	await writeFile(join(diagnosticDir, `${id}.paper-paths.json`), `${JSON.stringify(paperResult, null, 2)}\n`)
	await writeImage(await renderSvgToPng(svg, { width: 280, height: 290, background: `#${BLUE}` }), join(diagnosticDir, `${id}.render.png`))

	addCustomGeometry({
		svg,
		x: 4.9,
		y: 2.0,
		w: 2.8,
		h: 2.9,
	})
}
