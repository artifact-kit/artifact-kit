# DeckKit Capabilities For PPT Replica

Use this as the local API reference when reconstructing screenshot-like slides with DeckKit. Prefer existing DeckKit APIs over workarounds. If a needed capability is not listed, inspect:

- `packages/deckkit/src/slide.ts`
- `packages/deckkit/src/core-interfaces.ts`
- `packages/deckkit/src/gen-objects.ts`
- `packages/deckkit/src/gen-xml.ts`
- `packages/deckkit-pro/src`

## Presentation Setup

Use direct DeckKit JavaScript for replica workflows.

```js
import DeckKit from '@artifact-kit/deckkit'
import deckkitPro from '@artifact-kit/deckkit-pro'

const pptx = new DeckKit()
pptx.use(deckkitPro())
pptx.title = 'Reconstruction'
pptx.author = 'Artifact Kit'
pptx.company = 'Artifact Kit'
pptx.subject = 'PPT screenshot reconstruction'
pptx.defineLayout({ name: 'SOURCE', width: 13.333, height: 7.5 })
pptx.layout = 'SOURCE'
pptx.theme = {
  headFontFace: 'Microsoft YaHei',
  bodyFontFace: 'Microsoft YaHei',
  lang: 'zh-CN',
}

const slide = pptx.addSlide()
slide.background = { color: 'FFFFFF' }

await pptx.writeFile({ fileName: outFile })
```

Notes:

- Use `defineLayout` to match the reference aspect ratio.
- `pptx.use(deckkitPro())` is required for Pro features such as gradient fills and SVG-to-PNG helpers.
- Direct DeckKit JS is enough unless the project explicitly needs a JSX component layer.

## Coordinate Conversion

DeckKit placement uses inches. Convert source pixels to slide inches:

```js
const SOURCE_W = 1672
const SOURCE_H = 941
const SLIDE_W = 13.333
const SLIDE_H = 7.5

function pbox(x, y, w, h) {
  return {
    x: (x / SOURCE_W) * SLIDE_W,
    y: (y / SOURCE_H) * SLIDE_H,
    w: (w / SOURCE_W) * SLIDE_W,
    h: (h / SOURCE_H) * SLIDE_H,
  }
}
```

Use the source image dimensions from the actual image, not guessed values.

## Text

```js
slide.addText('文本', {
  x, y, w, h,
  fontFace: 'Microsoft YaHei',
  fontSize: 14.5,
  color: 'FFFFFF',
  bold: true,
  italic: true,
  align: 'center',
  valign: 'mid',
  margin: 0,
  breakLine: false,
  fit: 'shrink',
})
```

Useful options:

- `fontFace`
- `fontSize`
- `color`
- `bold`
- `italic`
- `align`
- `valign`
- `margin`
- `breakLine`
- `fit: 'shrink'`

For multiline text, use `\n` in the text string.

Rich text with different styles inside one text box:

```js
slide.addText([
  { text: '红色部分 ', options: { color: 'FF0000' } },
  { text: '蓝色部分', options: { color: '0000FF' } },
], {
  x, y, w, h,
  fontFace: 'Microsoft YaHei',
  fontSize: 14.5,
  margin: 0,
  fit: 'shrink',
})
```

Use `TextProps[]` when a single PowerPoint text box needs multiple colors, weights, font sizes, hyperlinks, or other run-level formatting. Put shared positioning and default style in the second `addText` options argument; put only run-specific overrides in each run's `options`.

## Images And SVG

Bitmap crop or generated raster:

```js
slide.addImage({ path: cropPath, x, y, w, h })
```

Native SVG image:

```js
slide.addImage({ path: svgPath, x, y, w, h })
```

Guidance:

- DeckKit core emits native PowerPoint SVG markup with `asvg:svgBlip`.
- Embedded SVG is vector-scalable but not path-editable inside PowerPoint.
- Prefer accepted SVG assets embedded directly with `addImage({ path: svgPath })`.
- Convert to editable PowerPoint primitives only when editability is a real requirement.
- Caveat: current Node SVG packaging may create a PNG fallback relationship whose bytes are SVG. It works for current PowerPoint SVG rendering but should be treated as a known packaging caveat.

## Shapes

Rounded rectangle card/container:

```js
slide.addShape('roundRect', {
  x, y, w, h,
  rectRadius: 0.045,
  line: { color: '9AB8F8', width: 0.55, transparency: 35 },
  fill: { color: 'FFFFFF', transparency: 2 },
})
```

Plain rectangle:

```js
slide.addShape('rect', {
  x, y, w, h,
  line: { color: 'CB0018', transparency: 100 },
  fill: { color: 'FFFFFF' },
})
```

Ellipse/circle:

```js
slide.addShape('ellipse', {
  x, y, w, h,
  fill: { color: '0B55CC' },
  line: { color: '0B55CC', transparency: 100 },
})
```

Common known shape names:

- `roundRect`
- `rect`
- `ellipse`
- `line`

Inspect DeckKit source before assuming another PowerPoint shape is unavailable.

## Lines And Arrows

Plain line:

```js
slide.addShape('line', {
  x, y, w, h: 0,
  line: { color: '071D73', width: 1.1 },
})
```

Dashed line:

```js
slide.addShape('line', {
  x, y, w, h: 0,
  line: { color: 'C8D4EA', width: 0.65, dashType: 'dash', transparency: 18 },
})
```

Forward arrow:

```js
slide.addShape('line', {
  x, y, w, h: 0,
  line: { color: '0B55CC', width: 1.2, endArrowType: 'triangle' },
})
```

Reverse arrow with positive geometry:

```js
slide.addShape('line', {
  x, y, w, h: 0,
  line: { color: '0B55CC', width: 1.2, beginArrowType: 'triangle' },
})
```

Critical rule:

- Never create shapes or lines with negative `w` or `h`.
- PowerPoint can ask to repair the file if generated OOXML has invalid negative extents.
- Keep geometry positive and express direction with `beginArrowType` or `endArrowType`.

## Fills And Borders

Solid fill:

```js
fill: { color: 'FFFFFF' }
```

Transparent fill:

```js
fill: { color: 'FFFFFF', transparency: 100 }
```

Gradient fill:

```js
fill: {
  type: 'gradient',
  angle: 0,
  stops: [
    { position: 0, color: '0047BA' },
    { position: 0.56, color: '8F2155' },
    { position: 1, color: 'D6001F' },
  ],
}
```

Gradient notes:

- Requires `pptx.use(deckkitPro())`.
- Stop `position` values can be `0..1`.

Common border:

```js
line: {
  color: '9AB8F8',
  width: 0.55,
  transparency: 35,
}
```

Hide border:

```js
line: { color: 'FFFFFF', transparency: 100 }
```

Known line parameters:

- `color`
- `width`
- `transparency`
- `dashType: 'dash'`
- `beginArrowType: 'triangle'`
- `endArrowType: 'triangle'`

## SVG Asset Workflow

Use SVG for icons, branded chrome, curved headers, swooshes, ribbons, asymmetric tabs, and other shapes that are awkward as native primitives.

Recommended flow:

1. Generate or author SVG under the work folder's `svg/`.
2. Render SVG to PNG only for visual comparison/debugging.
3. Iterate SVG until visually accepted.
4. Insert the accepted SVG directly with `slide.addImage({ path: svgPath, x, y, w, h })`.
5. Convert to editable primitives only when path-level editability is required.

DeckKit Pro SVG-to-PNG helper:

```js
await writeSvgToPng(svg, pngPath, {
  width,
  height,
  fit: 'fill',
})
```

## Route Names

Use these route names in bbox JSON:

- `layout-only`: bbox used for grouping, alignment, or review context; not rendered.
- `native-shape`: cards, containers, lines, arrows, dividers, tables, footer bands, basic PPT shapes.
- `native-text`: editable PowerPoint text.
- `svg-image`: accepted SVG inserted with `addImage`; vector-scalable, not path-editable.
- `editable-vector`: vector visual that needs editable reconstruction as PPT primitives/custom geometry or semantic primitive groups.
- `imagegen`: generated raster art.
- `source-raster`: source crop or user-provided bitmap.
- `drawio-svg`: structured diagram represented as draw.io XML, exported to SVG, then embedded.

## BBox Input Format

The standalone DeckKit Workbench accepts local source image upload plus an initial bbox JSON. Prefer raw bbox review data:

```json
{
  "title": "Example bbox review",
  "imageAssetId": "source",
  "image": { "width": 1672, "height": 941 },
  "activeElementId": "canvas",
  "instructions": "Review bbox geometry and route-aware reconstruction fields.",
  "status": "needs-human",
  "elements": [
    {
      "id": "canvas",
      "label": "Full slide canvas",
      "kind": "canvas",
      "bbox": { "x": 0, "y": 0, "w": 1672, "h": 941 },
      "route": "layout-only",
      "editability": "group",
      "renderRole": "layout",
      "childrenPolicy": "required",
      "granularityFeedback": "ok",
      "routeReason": "Whole-slide alignment reference.",
      "reviewStatus": "pending"
    }
  ]
}
```

Element planning fields:

- `route`: `layout-only`, `native-shape`, `native-text`, `svg-image`, `editable-vector`, `imagegen`, `source-raster`, `drawio-svg`
- `editability`: `none`, `asset`, `group`, `element`
- `renderRole`: `render`, `layout`, `context`
- `childrenPolicy`: `none`, `optional`, `required`
- `granularityFeedback`: `ok`, `too-coarse`, `too-fine`

## BBox Granularity

BBox granularity follows implementation route, not visual complexity alone.

- If implementation will place one final asset, create one render bbox for that asset.
- If implementation will place multiple editable things, create child bboxes for those things.
- Keep parent/group bboxes only for alignment or review context with `renderRole: "layout"` or `renderRole: "context"`.
- Do not create duplicate render boxes for the same visible object.
- Do not split `imagegen`, `source-raster`, or `svg-image` regions into internal pieces unless subparts will be independently validated, edited, or generated.
- Do not collapse an editable diagram, icon row, or service row into one render bbox if individual icon/text/connector elements should remain editable.
- Do not knowingly output `granularityFeedback: "too-coarse"` when the visible child boxes can be inferred. Split them before review.
