---
name: deckkit-ppt-replica
description: Reconstruct a reference slide image into an editable PowerPoint using DeckKit, route-aware bbox JSON, optional browser Workbench review, lucide/icon semantic reconstruction, source crops, and image-generation prompts for hard bitmap assets.
---

# DeckKit PPT Replica

Use this skill when reconstructing a source slide image into a repeatable, mostly editable PPTX with DeckKit.

## Required References

Before implementation, read:

- `reference/deckkit-capabilities.md` for DeckKit API capabilities, bbox schema, route names, and implementation caveats.
- `docs/bbox-route-aware-segmentation-proposal.md` for current bbox JSON schema and route-aware granularity.
- Any example-specific `LESSONS-LEARNED.md` under `examples/*-work/`.

When this skill is used outside this repository, rely on the bundled `reference/deckkit-capabilities.md` first. If the repository also has `docs/deckkit-llm-capabilities.md`, treat it as the latest local supplement.

For icons, use:

- `reference/lucide/lucide-icons.jsonl`
- `reference/lucide/icons/<icon>.svg`

If those paths differ in the current repo, find the closest lucide reference directory with `rg --files | rg 'lucide.*jsonl|lucide.*/icons/.+\\.svg$'`.

## Workflow

### 1. Create Work Folders

Create an ignored example work folder beside the tracked source example:

```txt
examples/<example-name>-bbox-work/
  manifests/
  scripts/
  crops/
  preview/
  svg/
  output/
```

Keep the source image in the semantic tracked example folder, such as:

```txt
examples/<example-name>/source.png
```

### 2. Generate Initial BBox JSON

Generate `manifests/initial-bbox.json` in raw bbox review data format:

```json
{
  "title": "Example bbox review",
  "imageAssetId": "source",
  "image": { "width": 1672, "height": 941 },
  "activeElementId": "canvas",
  "instructions": "Review bbox geometry and route-aware reconstruction fields.",
  "status": "needs-human",
  "elements": []
}
```

Each element should include `id`, `parentId` when useful, `label`, `kind`, `bbox`, `route`, `editability`, `renderRole`, `childrenPolicy`, `granularityFeedback`, `routeReason`, and `reviewStatus`.

Use these routes:

- `layout-only`: grouping/alignment/context only; never render directly.
- `native-shape`: PPT primitive shape, line, arrow, card, band, or container.
- `native-text`: editable PowerPoint text box.
- `svg-image`: accepted SVG inserted as an image, vector-scalable but not path-editable.
- `editable-vector`: semantic vector visual that should become editable PPT shapes or an authored SVG/primitive group.
- `imagegen`: generated raster asset.
- `source-raster`: source crop or user-provided bitmap.
- `drawio-svg`: structured diagram exported to SVG and embedded.

Granularity rule:

- Ask: "Will implementation place exactly one thing here?"
- If yes, one render bbox is enough.
- If no, split into the exact things implementation will place.
- Parent boxes are allowed only as `renderRole: "layout"` or `renderRole: "context"`.
- Do not create duplicate render boxes for the same visible object. For example, a section wrapper may be `layout-only`, while the body card is the `native-shape` render element.
- Do not knowingly output `granularityFeedback: "too-coarse"` as the first-pass answer when the needed child boxes are visible and inferable. Split them now.
- For editable icon rows, create child boxes for each icon and each label, or each icon+label pair plus child icon/text boxes. Do not use one render bbox for six icons if the intent is editable reconstruction.

### 3. Optional Human Workbench Review

Ask the user to open:

```txt
https://artifact-kit.github.io/
```

They should upload:

1. the source image
2. `manifests/initial-bbox.json`

The browser tool lets them adjust bbox geometry and route fields, then download `<input-file>.final.json`.

This review is optional. If skipped, continue with the initial JSON and expect to spend more model/vision iterations correcting positions and routes.

### 4. Configure DeckKit Reconstruction

Create a DeckKit generation script, usually under `examples/<example-name>-replica-work/src/generate.mjs` or the current work folder's `scripts/`.

Use DeckKit plus DeckKit Pro:

```js
import DeckKit from '@artifact-kit/deckkit'
import deckkitPro from '@artifact-kit/deckkit-pro'

const pptx = new DeckKit()
pptx.use(deckkitPro())
pptx.defineLayout({ name: 'SOURCE', width: 13.333, height: 7.5 })
pptx.layout = 'SOURCE'
pptx.theme = {
  headFontFace: 'Microsoft YaHei',
  bodyFontFace: 'Microsoft YaHei',
  lang: 'zh-CN',
}
```

Use pixel-to-inch conversion from the source dimensions:

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

Never create shapes or lines with negative `w` or `h`.

### 5. Reconstruct One Region At A Time

Pick one bounded region from the reviewed bbox JSON, such as a section or card group.

For that region:

1. Place `native-text` as DeckKit text boxes.
2. Place `native-shape` as DeckKit shapes, lines, arrows, gradients, and simple containers.
3. Place `source-raster` crops only when the bitmap is the intended final asset.
4. Place accepted `svg-image` assets with `slide.addImage({ path: svgPath, x, y, w, h })`.
5. Render the slide preview and compare the region against the source crop before moving to the next region.

### 6. Icon Reconstruction

For every icon:

1. Identify the icon's semantic meaning from the surrounding text and visual shape.
2. Search lucide metadata with `rg`, for example:

   ```bash
   rg -i "thermometer|temperature|wifi|cloud|database" reference/lucide/lucide-icons.jsonl
   ```

3. Read the most relevant SVG source:

   ```txt
   reference/lucide/icons/<name>.svg
   ```

4. Reconstruct the icon semantically. It does not need to be pixel-identical; it must communicate the same concept and match the slide's stroke weight, color, scale, and visual style.
5. Render the reconstructed icon and compare it with the source icon crop. Adjust if the semantic match, weight, or proportions are off.

If the source icon is a composition, combine or adapt lucide-style primitives rather than tracing blindly.

### 7. Non-Basic Decorative Shapes

For decorations that are not simple PPT primitives, such as curved section headers, swooshes, ribbons, asymmetric tabs, or custom frame chrome:

1. Visually identify the semantic role: header tab, section boundary, motion sweep, brand accent, separator, or background skin.
2. Reconstruct at the semantic level using SVG, DeckKit primitives, or custom geometry.
3. Compare the rendered result against the source crop.
4. Iterate until it carries the same layout role and visual rhythm.

Do not reproduce random image-generation artifacts unless they define a boundary, hierarchy, repeated style, or reading order.

### 8. Hard Bitmap Assets

For assets that cannot reasonably be rebuilt with SVG/primitives:

1. First decide whether the desired asset can be cropped cleanly from the source. If yes, use a source crop.
2. If it cannot be cropped cleanly, write a Seedream/image-to-image prompt.
3. The prompt must instruct the model to output only the desired object/region and leave every unrelated area blank or transparent/white, depending on the intended crop.
4. Preserve semantic content and perspective; do not ask for unrelated redesign.

Keep prompts in the work folder so the asset can be regenerated.

### 9. Validation

After each region and at the end:

- Render the PPTX to preview images.
- Compare the full slide and region crops with the source.
- Check that text is editable where planned.
- Check that layout-only boxes did not produce PPT objects.
- Check that PowerPoint opens without repair prompts.

If the reconstruction uncovers a DeckKit capability or limitation, update `docs/deckkit-llm-capabilities.md`.
