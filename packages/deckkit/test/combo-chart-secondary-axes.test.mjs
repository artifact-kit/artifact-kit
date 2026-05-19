import assert from 'node:assert/strict'
import test from 'node:test'
import JSZip from 'jszip'
import DeckKit from '../dist/index.js'

const AXIS_ID_VALUE_SECONDARY = '2094734553'
const AXIS_ID_CATEGORY_PRIMARY = '2094734554'
const AXIS_ID_CATEGORY_SECONDARY = '2094734555'

async function getChartXml(chartTypes) {
	const pptx = new DeckKit()
	const slide = pptx.addSlide()

	slide.addChart(chartTypes, {
		x: 1,
		y: 1,
		w: 6,
		h: 3,
	})

	const buffer = await pptx.write({ outputType: 'nodebuffer' })
	const zip = await JSZip.loadAsync(buffer)
	const chartFile = Object.keys(zip.files).find(fileName => /^ppt\/charts\/chart\d+\.xml$/.test(fileName))
	assert.ok(chartFile)
	return await zip.file(chartFile).async('string')
}

test('combo charts emit axes referenced by secondary category and value series', async () => {
	const xml = await getChartXml([
		{
			type: 'bar',
			data: [{ name: 'Bars', labels: ['A', 'B'], values: [1, 2] }],
		},
		{
			type: 'line',
			data: [{ name: 'Line', labels: ['A', 'B'], values: [3, 4] }],
			options: {
				secondaryValAxis: true,
				secondaryCatAxis: true,
			},
		},
	])

	assert.match(xml, new RegExp(`<c:lineChart>.*<c:axId val="${AXIS_ID_CATEGORY_SECONDARY}"/><c:axId val="${AXIS_ID_VALUE_SECONDARY}"/>`, 's'))
	assert.match(xml, new RegExp(`<c:valAx>\\s*<c:axId val="${AXIS_ID_VALUE_SECONDARY}"/>.*<c:crossAx val="${AXIS_ID_CATEGORY_SECONDARY}"/>`, 's'))
	assert.match(xml, new RegExp(`<c:catAx>\\s*<c:axId val="${AXIS_ID_CATEGORY_SECONDARY}"/>.*<c:crossAx val="${AXIS_ID_VALUE_SECONDARY}"/>`, 's'))
})

test('combo charts can use a secondary value axis without requiring a secondary category axis', async () => {
	const xml = await getChartXml([
		{
			type: 'bar',
			data: [{ name: 'Bars', labels: ['A', 'B'], values: [1, 2] }],
		},
		{
			type: 'line',
			data: [{ name: 'Line', labels: ['A', 'B'], values: [3, 4] }],
			options: {
				secondaryValAxis: true,
			},
		},
	])

	assert.match(xml, new RegExp(`<c:lineChart>.*<c:axId val="${AXIS_ID_VALUE_SECONDARY}"/>`, 's'))
	assert.match(xml, new RegExp(`<c:valAx>\\s*<c:axId val="${AXIS_ID_VALUE_SECONDARY}"/>.*<c:crossAx val="${AXIS_ID_CATEGORY_PRIMARY}"/>`, 's'))
	assert.doesNotMatch(xml, new RegExp(`<c:catAx>\\s*<c:axId val="${AXIS_ID_CATEGORY_SECONDARY}"/>`, 's'))
})
