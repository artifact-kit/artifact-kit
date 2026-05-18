# DeckKit LLM Capability Index

This is a practical capability index for agents reconstructing PPT pages in this repo. It should grow from real usage. Before adding new implementation code, check this file first; if the needed capability is not listed, inspect the relevant package source, use the capability if it already exists, then add the finding back here.

Current baseline example: `examples/iot-innovation-project-replica-work/src/generate.mjs`.

## Discovery Rule

- Do not assume DeckKit lacks a capability just because it is absent from this document.
- If you need a feature that feels like it should exist, inspect source before inventing a workaround:
  - Core API/types: `packages/deckkit/src/slide.ts`, `packages/deckkit/src/core-interfaces.ts`
  - Object generation/XML details: `packages/deckkit/src/gen-objects.ts`, `packages/deckkit/src/gen-xml.ts`
  - Pro plugins/tools: `packages/deckkit-pro/src`
- When you confirm a capability or limitation, update this document with the exact API shape and caveats.

## Presentation Setup

Used in the replica script:

```js
const pptx = new DeckKit()
pptx.use(deckkitPro())
pptx.title = 'IoT Innovation Project Reconstruction'
pptx.author = 'Artifact Kit'
pptx.company = 'Artifact Kit'
pptx.subject = 'Incremental reconstruction checkpoint'
pptx.defineLayout({ name: 'IOT_SOURCE', width: 13.333, height: 7.5 })
pptx.layout = 'IOT_SOURCE'
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
- Use `defineLayout` when matching a reference image aspect ratio exactly.
- `pptx.use(deckkitPro())` is required for Pro features such as gradient fills.
- `slide.background = { color }` is enough for a solid background.

## Coordinates

The replica script converts source image pixels to slide inches:

```js
function pbox(x, y, w, h) {
  return {
    x: (x / SOURCE_W) * SLIDE_W,
    y: (y / SOURCE_H) * SLIDE_H,
    w: (w / SOURCE_W) * SLIDE_W,
    h: (h / SOURCE_H) * SLIDE_H,
  }
}
```

Use `x`, `y`, `w`, `h` in inches for DeckKit APIs.

## Text

Used shape:

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

Observed useful parameters:
- `fontFace`
- `fontSize`
- `color`
- `bold`
- `italic`
- `align: 'center'`
- `valign: 'mid'`
- `margin: 0`
- `breakLine: false`
- `fit: 'shrink'`

For multiline text, pass `\n` inside the text string. The current script uses this for protocol labels and body text.

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

## Images

Bitmap or crop:

```js
slide.addImage({ path: cropPath, x, y, w, h })
```

Native SVG image:

```js
slide.addImage({ path: svgPath, x, y, w, h })
```

Important:
- Core DeckKit already emits native PowerPoint SVG markup with `asvg:svgBlip`.
- Native SVG image embedding is vector-scalable but not path-editable inside PowerPoint.
- Current caveat: Node SVG packaging creates a PNG fallback relationship whose bytes may actually be SVG. This is tracked in Linear ART-11.
- For current reconstruction, prefer accepted SVG assets embedded directly with `addImage({ path: svgPath })` instead of SVG -> PNG -> addImage.

## Shapes

Round rectangle card/container:

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

Observed shape names in the replica script:
- `'roundRect'`
- `'rect'`
- `'ellipse'`
- `'line'`

Look in core source before assuming other shape names are unavailable.

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

Arrow:

```js
slide.addShape('line', {
  x, y, w, h: 0,
  line: { color: '0B55CC', width: 1.2, endArrowType: 'triangle' },
})
```

Reverse arrow without negative width:

```js
slide.addShape('line', {
  x, y, w, h: 0,
  line: { color: '0B55CC', width: 1.2, beginArrowType: 'triangle' },
})
```

Critical caveat:
- Do not create shapes or lines with negative `w` or `h`. PowerPoint can ask to repair the file because the generated XML has invalid negative extents.
- Use positive geometry and choose `beginArrowType` or `endArrowType` to express direction.

## Fills

Solid fill:

```js
fill: { color: 'FFFFFF' }
```

Transparent fill:

```js
fill: { color: 'FFFFFF', transparency: 100 }
```

Gradient fill from DeckKit Pro:

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

Notes:
- Gradient fill requires `pptx.use(deckkitPro())`.
- Stop `position` values can be expressed as `0..1` in the current Pro implementation.

## Lines / Borders

Common line object:

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

Observed line parameters:
- `color`
- `width`
- `transparency`
- `dashType: 'dash'`
- `beginArrowType: 'triangle'`
- `endArrowType: 'triangle'`

## SVG Asset Workflow

The replica script currently generates SVG files and PNG comparison renders:

```js
await writeSvgToPng(svg, pngPath, {
  width,
  height,
  fit: 'fill',
})
```

Recommended current flow:
1. Generate SVG under the work folder's `svg/`.
2. Render SVG to PNG only for visual comparison/debugging.
3. Iterate SVG until accepted.
4. Insert the accepted SVG directly with core `slide.addImage({ path: svgPath, x, y, w, h })`.
5. Convert to editable primitives only when editability is a real requirement.

## Routing Decisions

- `native-shape`: simple cards, lines, arrows, tables, footer bands, and basic PPT shapes.
- `native-text`: text boxes that should remain editable as PowerPoint text.
- `svg-image`: visually accepted SVG that should scale cleanly but does not need path-level PPT editability.
- `editable-vector`: SVG-like visual that must be edited in PPT. Prefer hand-authored primitives/custom geometry after visual acceptance.
- `imagegen`: complex illustration or bitmap-like art where visual similarity matters more than editability.
- `source-raster`: user-provided final raster asset or screenshot that should remain raster by intent.
- `drawio-svg`: structured diagram represented as draw.io XML, exported to SVG, then embedded as an SVG image.
- `layout-only`: bbox used for alignment, not directly rendered.

## Standalone BBox Workbench Input

The current `deckkit-workbench` bbox review flow is a standalone browser tool. The reviewer uploads the local source image and an initial bbox JSON, edits geometry and route fields in the browser, then downloads `<input-file>.final.json`.

For new route-aware work, prefer raw bbox review data:

```json
{
  "title": "IoT Innovation Project bbox review",
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

Accepted element fields include:

- `route`: `layout-only`, `native-shape`, `native-text`, `svg-image`, `editable-vector`, `imagegen`, `source-raster`, `drawio-svg`
- `editability`: `none`, `asset`, `group`, `element`
- `renderRole`: `render`, `layout`, `context`
- `childrenPolicy`: `none`, `optional`, `required`
- `granularityFeedback`: `ok`, `too-coarse`, `too-fine`

## BBox Granularity Rule

BBox granularity follows the route, not just the visual complexity.

- If implementation will place one final asset, create one bbox for that asset.
- If implementation will place multiple editable things, create child bboxes for those things.
- Keep parent/group bboxes only for alignment or review context, and mark them as `layout-only` or group-level.
- Do not split an imagegen/source-raster region into internal decorative pieces unless those pieces will be independently generated, edited, or validated.
- Do not collapse an editable diagram area into one bbox if individual icon/text/connector elements should remain editable.

## JSX Status

DeckKit JSX is not required for the current replica workflow. For now, direct DeckKit JavaScript is enough as long as the agent knows the available APIs and parameters. Revisit JSX only if component reuse or a larger app-style authoring layer becomes necessary.
