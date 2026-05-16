---
name: deckkit-ppt-replica
description: Reconstruct a reference slide image into an editable PowerPoint using DeckKit, route-aware bbox JSON, optional browser Workbench review, lucide/icon semantic reconstruction, source crops, and image-generation prompts for hard bitmap assets.
---

# DeckKit PPT Replica

Use this skill when reconstructing a source slide image into a repeatable, mostly editable PPTX with DeckKit.

## Execution Discipline

This workflow is audited step by step. Do not optimize for speed by skipping checkpoints, batching future regions, or assuming the user will only inspect the final PPTX. Treat every bbox, region render, icon side-by-side, and `qa.md` as user-visible review evidence. Put effort into bbox accuracy, rule compliance, completing the current step's stated goal, semantic comparison, and per-step output quality. If a gate is not satisfied, stop, fix it, or record the validation gap before proceeding.

## Non-Negotiable Audit Mode

This skill is an audited reconstruction workflow, not a best-effort PPT generator. A run is considered failed if the agent optimizes for producing a complete PPTX before the required gate evidence exists.

Failure conditions:

- Authoring SVG assets for a future region before the current region gate passes.
- Writing, enabling, or generating DeckKit drawing code for a future region before the current region gate passes.
- Generating a full-slide PPTX before every previous region gate has passed.
- Creating region QA after the fact from a full-slide implementation.
- Batch-authoring all icons/SVGs in one script run before their regions become current.
- Proceeding past a region without explicitly reporting PASS/gaps and waiting for user confirmation.

After each region gate, stop and ask the user for confirmation before continuing. Do not interpret silence or momentum as approval to start the next region. The short-term goal is always "complete the current gate and stop", not "finish the deck".

## Required References

Before implementation, resolve `SKILL_DIR` as the directory containing this `SKILL.md`, then read:

- `$SKILL_DIR/reference/deckkit-capabilities.md` for DeckKit API capabilities, route names, image helpers, and implementation caveats.

Use the bbox schema embedded in this `SKILL.md` as the source of truth for `initial-bbox.json`. Do not require example-specific `LESSONS-LEARNED.md`; this skill is where durable lessons belong. When maintaining this repository itself, `docs/bbox-route-aware-segmentation-proposal.md`, `docs/deckkit-llm-capabilities.md`, or Workbench source files may be used as local supplements, but a published skill user should not need them.

For icons, use:

- `$SKILL_DIR/reference/lucide/lucide-icons.jsonl`
- `$SKILL_DIR/reference/lucide/icons/<icon>.svg`

Do not search the current repo, parent directories, or the user's home directory for these skill references. In an installed skill this reference directory may be `/Users/<USER>/.agents/skills/deckkit-ppt-replica/reference/`; use that skill-local directory directly. Never run broad commands such as `find /Users/<user> ...` to locate lucide assets. If a required skill reference is missing, report the skill installation problem instead of falling back to unrelated files.

## Workflow

### 1. Create Work Folders

Create an ignored example work folder beside the tracked source example:

```txt
examples/<example-name>-bbox-work/
  input/
  manifests/
  scripts/
  crops/
  preview/
    regions/
    icons/
  svg/
  output/
```

Keep the source image in the semantic tracked example folder, such as:

```txt
examples/<example-name>/source.png
```

Before creating folders, confirm the current writable repo root with `pwd` and, when available, `git rev-parse --show-toplevel`. Create the work folder under that writable repo root, not beside an arbitrary source image path that may be outside the sandbox or workspace. If the intended path is not writable, choose the matching path inside the current repo and state that choice.

Copy or mirror the source image into the work folder as:

```txt
examples/<example-name>-bbox-work/input/source.png
```

All scripts should read `input/source.png` as the local source. Keep the original source path only as provenance in notes or manifests. All generated reconstruction files must stay under `examples/<example-name>-bbox-work/`: npm package files, scripts, manifests, crops, SVG assets, previews, QA artifacts, and output PPTX files. Do not write generated work artifacts into the source example folder or repository root.

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

Use this exact raw bbox review schema. Do not invent enum values.

```ts
interface BBoxReviewData {
  title?: string
  imageAssetId: string
  image: { width: number; height: number }
  activeElementId?: string
  instructions?: string
  status?: 'needs-human' | 'complete'
  elements: ElementNode[]
}

interface ElementNode {
  id: string
  parentId?: string
  label: string
  kind: ElementKind
  bbox: { x: number; y: number; w: number; h: number }
  description?: string
  reviewStatus?: ReviewStatus
  confidence?: number
  notes?: string
  route?: ReconstructionRoute
  editability?: Editability
  renderRole?: RenderRole
  childrenPolicy?: ChildrenPolicy
  granularityFeedback?: GranularityFeedback
  routeReason?: string
}

type ElementKind =
  | 'architecture-box'
  | 'canvas'
  | 'card'
  | 'content-row'
  | 'decorative-background'
  | 'decorative-line'
  | 'decorative-shape'
  | 'footer'
  | 'icon'
  | 'section'
  | 'section-body'
  | 'section-header'
  | 'text'
  | 'text-group'
  | 'group'
  | 'image'
  | 'shape'

type ReviewStatus = 'pending' | 'reviewing' | 'accepted' | 'needs-agent'

type ReconstructionRoute =
  | 'layout-only'
  | 'native-shape'
  | 'native-text'
  | 'svg-image'
  | 'editable-vector'
  | 'imagegen'
  | 'source-raster'
  | 'drawio-svg'

type Editability = 'none' | 'asset' | 'group' | 'element'
type RenderRole = 'render' | 'layout' | 'context'
type ChildrenPolicy = 'none' | 'optional' | 'required'
type GranularityFeedback = 'ok' | 'too-coarse' | 'too-fine'
```

Schema rules:

- Use `status: "needs-human"` for initial review JSON unless review is already complete.
- Use `reviewStatus: "pending"` for first-pass elements.
- Write a complete JSON file, not a partial snippet. Do not hard-wrap enum string values across lines; values such as `"architecture-\nbox"` are invalid.
- Use stable unique `id` values and make every `parentId` point to an existing element.
- Do not output `kind: "line"`; use `kind: "decorative-line"` for visible lines, dividers, arrows, connectors, and separators.
- Do not invent kind values such as `arrow`, `rect`, `rounded-rect`, `title`, `body`, or `architecture-card`.
- Keep visual implementation intent in `route`, not in unsupported `kind` values. For example, a connector should usually be `kind: "decorative-line"` with `route: "native-shape"` or `route: "editable-vector"`.
- Before handing off the JSON, parse it and validate `kind`, `route`, `editability`, `renderRole`, `childrenPolicy`, `granularityFeedback`, `reviewStatus`, and top-level `status` against the enums above.

Route meanings:

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
- If a section, card, or row parent describes the same visible object as a child, only one of them may be `renderRole: "render"`. Parent structure should usually be `route: "layout-only"` with `renderRole: "layout"` or `renderRole: "context"`.
- Do not knowingly output `granularityFeedback: "too-coarse"` as the first-pass answer when the needed child boxes are visible and inferable. Split them now.
- For editable icon rows, create child boxes for each icon and each label, or each icon+label pair plus child icon/text boxes. Do not use one render bbox for six icons if the intent is editable reconstruction.

### 3. Required Checkpoint: Optional Workbench Review

After writing and validating `manifests/initial-bbox.json`, stop. Do not install dependencies, create reconstruction scripts, author SVGs, or generate slides yet.

Tell the user they can optionally use Workbench to generate a more accurate `initial-bbox.final.json`. Explain the tradeoff clearly: Workbench lets them correct bbox geometry, hierarchy, routes, and granularity before reconstruction, which usually reduces later visual-fix iterations and token use. If they skip it, reconstruction can continue from `initial-bbox.json`, but later region QA may need more AI vision adjustments because bbox errors were not corrected by hand.

Give the exact operation steps:

```txt
https://artifact-kit.github.io/artifact-kit/
```

1. Open the URL.
2. Upload the source image.
3. Upload `manifests/initial-bbox.json`.
4. Adjust boxes/routes if needed.
5. Download `<input-file>.final.json`.
6. Put the downloaded file in `manifests/` as `initial-bbox.final.json`, or send its path/content back to continue.

Continue only after the user either provides `initial-bbox.final.json` or explicitly says to skip Workbench and proceed with `initial-bbox.json`. Record which path was chosen. Do not silently skip this checkpoint.

### 4. Configure DeckKit Reconstruction

Configure reconstruction inside the current `xxx-work` folder. Do not depend on repository-local package source folders such as `packages/deckkit`, because a published skill user will not have those files.

Recommended work-folder layout after this step:

```txt
examples/<example-name>-bbox-work/
  package.json
  node_modules/
  input/
    source.png
  manifests/
    initial-bbox.json
    initial-bbox.final.json
  scripts/
    crop-assets.mjs
    build-svg-assets.mjs
    generate.mjs
  crops/
  preview/
    regions/
    icons/
  svg/
  output/
```

Create or update `package.json` in the `xxx-work` folder:

```json
{
  "type": "module",
  "scripts": {
    "crop": "node scripts/crop-assets.mjs",
    "svg": "node scripts/build-svg-assets.mjs",
    "generate": "node scripts/generate.mjs"
  },
  "dependencies": {
    "@artifact-kit/deckkit": "latest",
    "@artifact-kit/deckkit-pro": "latest"
  }
}
```

Install dependencies from npm in that same work folder:

```bash
npm install
```

Use imports from the npm-installed packages. For image operations, use DeckKit Pro exports instead of directly depending on `sharp`:

```js
import DeckKit from '@artifact-kit/deckkit'
import deckkitPro, {
  compareImages,
  cropImage,
  getImageInfo,
  overlayImages,
  resizeImage,
  sampleColor,
  writeSvgToPng,
  writeImage,
} from '@artifact-kit/deckkit-pro'

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

Write all generated assets and outputs under the same `xxx-work` folder:

- source copy: `input/source.png`
- crops: `crops/`
- authored SVGs: `svg/`
- visual previews and QA artifacts: `preview/`
- generated PPTX: `output/`
  - `*-preview.pptx`: visual-check build with SVG assets rasterized to PNG before insertion.
  - `*-deliverable.pptx`: final delivery build with SVG assets inserted directly.

Use DeckKit Pro image helpers for all bitmap preparation:

```js
const cropped = await cropImage(sourcePath, { x, y, width: w, height: h })
await writeImage(cropped, 'crops/asset.png')
```

Keep crop extraction separate from deck generation:

- `scripts/crop-assets.mjs`: reads the final bbox JSON, crops every `source-raster` render asset with `cropImage`, writes files under `crops/`, and writes a crop manifest such as `manifests/crop-assets.json`.
- `scripts/build-svg-assets.mjs`: accepts a region id, authors only that region's SVG assets, writes final `.svg` files under `svg/`, and keeps SVG source code out of `generate.mjs`. Within the region, author and QA one SVG/icon at a time.
- `scripts/generate.mjs`: accepts a region/stage id, reads the final bbox JSON, crop manifest, and existing SVG files, then builds the PPTX for completed regions plus the current region only. It should not recrop source images or author SVG source code unless an asset manifest is missing or stale. By default, generate both preview and deliverable builds for the requested stage.

Script contract:

- `build-svg-assets.mjs` must require one explicit current region id. It must not support `all`, default to `all`, or generate SVGs for future regions.
- `generate.mjs` must require one explicit current region/stage id. It must not support `all`, `full`, or final full-slide generation until every region has a PASS `qa.md` or explicitly recorded validation gap.
- If a final full-slide build is needed, the script must first verify every required `preview/regions/<region-id>/qa.md` exists and is PASS or has explicit gaps.
- Stage order must be enforced by QA files, not by trust. A later region may only render after all previous region gates have evidence.

The bbox JSON is positioning and review evidence, not a runtime rendering DSL. Do not implement `generate.mjs` as a generic route/kind/id-driven renderer that loops through bbox elements and dispatches through broad helpers such as `fontSize(element)`, `textColor(element)`, `shapeStyle(element)`, or `id.includes(...)` rules. This failure mode hides visual decisions in traditional if/else code and defeats the purpose of LLM-driven reconstruction.

Required approach:

- Use bbox only to retrieve coordinates, sizes, and source crops.
- Let the LLM write explicit DeckKit commands for the current region, one semantic object at a time.
- Make the visual decision visible at the call site: text content, font size, color, weight, fill, line, layer order, icon file, and crop file.
- Keep helpers limited to coordinate conversion, file lookup, and truly repeated components whose visual spec has been verified against the source.

Bad pattern:

```js
for (const element of elements) {
  if (element.renderRole !== 'render') continue
  if (element.route === 'native-text') addText(slide, element)
  else if (element.route === 'native-shape') addShape(slide, element)
  else if (element.route === 'svg-image') addImage(slide, element)
}

function textColor(element) {
  if (element.id.includes('core')) return RED
  if (element.id.startsWith('sensing')) return BLUE
  return DARK_BLUE
}
```

Good pattern:

```js
function box(id) {
  return pbox(getElement(id).bbox)
}

async function drawProjectBackground(slide) {
  slide.addShape('roundRect', {
    ...box('project_background_card'),
    fill: { color: 'FFFFFF' },
    line: { color: 'B7CAF4', width: 0.8 },
  })
  slide.addImage({ path: 'svg/project_background_header.svg', ...box('project_background_header') })
  slide.addText('项目背景', {
    ...box('project_background_header_text'),
    fontSize: 15.5,
    bold: true,
    color: 'FFFFFF',
    margin: 0,
  })
  slide.addShape('ellipse', {
    ...box('project_background_row_1_icon_circle'),
    fill: { color: 'EEF5FF' },
    line: { color: 'D4DFF4', width: 0.8 },
  })
  slide.addImage({ path: 'svg/project_background_row_1_icon.svg', ...box('project_background_row_1_icon') })
}
```

Do not write the whole slide as a data interpreter and then tune global style rules. The reconstruction code should read like a semantic description of the region being rebuilt.

Do not batch-author SVGs for future regions. A light asset inventory is fine, but SVG source creation and visual QA happen when that region is the current reconstruction target.

Asset files must have truthful extensions. A `.svg` file must contain SVG XML; a `.png` file must contain real PNG bytes produced by `writeSvgToPng`, `writeImage`, or another DeckKit Pro image helper. Do not write SVG text to a `.png` path, because Quick Look and downstream preview tools can misread the file.

Insert authored SVG assets directly into the PPTX:

```js
slide.addImage({ path: 'svg/project_background_row_1_icon.svg', x, y, w, h })
```

Do not convert SVG assets to PNG for the final PPTX. SVG insertion keeps the asset vector-scalable. `writeSvgToPng` may be used only for auxiliary preview/debug images, never as the inserted PPT asset when the route is `svg-image` or `editable-vector`.

Use a dual-output strategy for SVG-heavy stages:

- `preview` mode: convert SVG assets to PNG with DeckKit Pro `writeSvgToPng`, insert the PNGs, and use this PPTX only for Quick Look or other visual checks.
- `deliverable` mode: insert the SVG files directly with `slide.addImage({ path: svgPath, ... })`; this is the version to hand off because it preserves vector scalability.
- Default generation should output both files from the same layout code so visual-check and delivery builds cannot drift:

```bash
npm run generate -- project-background
# writes output/...-project-background-preview.pptx
# writes output/...-project-background-deliverable.pptx
```

Single-mode generation is acceptable for debugging:

```bash
npm run generate -- project-background preview
npm run generate -- project-background deliverable
```

Do not add `sharp` as a direct dependency in generated work folders unless the user explicitly asks for low-level image processing outside DeckKit Pro.

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

### 5. Reconstruct In Reading Order

Reconstruct in reading order, not coarse-to-fine. Work from top to bottom and left to right. Leave all not-yet-reconstructed regions blank instead of placing rough placeholders everywhere.

Why:

- A partial slide with blank unfinished regions makes visual differences in the newly completed region obvious.
- A coarse full-slide draft can hide regional alignment, typography, and icon errors because everything is approximate at once.
- Each iteration should validate one newly completed region against the source crop before moving on.

Implementation must grow in the same order. Start with code that renders only the header. After header QA passes, append or enable the next region's code, then repeat. Do not write the entire slide implementation first and use the final full-slide render as the primary review surface. Full-slide previews are allowed only after the current region gate has passed.

Recommended region order for dense single-slide infographics:

1. Header title/subtitle area.
2. Top-left section.
3. Top-middle / top-right section.
4. Bottom-left section.
5. Bottom-right section.
6. Footer.

For each stage, render only completed regions and the current region. Do not add future regions as rough placeholders unless they are needed as alignment guides, and if used, mark them as temporary non-output guides.

Pick the next bounded region from the reviewed bbox JSON, such as a section or card group.

Required region gate:

- Work on exactly one current region.
- Allowed changes are limited to SVG assets used by this region, DeckKit drawing code for completed regions plus the current region, and QA files for this region and its icons.
- Forbidden before the current region passes: future region SVG assets, future region drawing code, full-slide output, `all` stage generation, and post-hoc QA generated from a completed full-slide implementation.

For that region:

1. Place `native-text` as DeckKit text boxes.
2. Place `native-shape` as DeckKit shapes, lines, arrows, gradients, and simple containers.
3. Place `source-raster` crops only when the bitmap is the intended final asset.
4. Author, render, and QA only the SVG assets needed by this region.
5. Place accepted `svg-image` assets with `slide.addImage({ path: svgPath, x, y, w, h })`.
6. Render the slide preview, crop the completed region from source and render, generate a side-by-side QA image, inspect it, and compare before moving to the next region.

For every completed region, write QA files:

```txt
preview/regions/<region-id>/source.png
preview/regions/<region-id>/render.png
preview/regions/<region-id>/side-by-side.png
preview/regions/<region-id>/qa.md
```

Use `side-by-side.png` as the primary semantic comparison: source on the left, render on the right, with enough padding and a neutral/checker/dark background when needed so white or transparent elements are visible. `overlay.png` is optional and only helps geometry checks; it is not a substitute for semantic side-by-side review.

After creating region QA files, open/read `render.png` and `side-by-side.png` with visual inspection. Write `qa.md` with PASS or concrete issues/fixes. Fix text overflow, wrapping, icon scale, missing elements, and semantic mismatches during that region's QA pass. Do not defer obvious region problems to the final full-slide preview.

This is a hard gate: do not start the next region until the current region's QA files exist, have been visually inspected, and issues are either fixed or explicitly recorded as validation gaps.

After the current region gate is complete, report the PASS/gaps and stop. Wait for the user to approve continuing to the next region. Do not continue automatically, even if the next region is obvious.

### 6. Icon Reconstruction

For every icon:

1. Identify the icon's semantic meaning from the surrounding text and visual shape.
2. Search skill-local lucide metadata with `rg`, for example:

   ```bash
   rg -i "thermometer|temperature|wifi|cloud|database" "$SKILL_DIR/reference/lucide/lucide-icons.jsonl"
   ```

3. Read the most relevant SVG source:

   ```txt
   $SKILL_DIR/reference/lucide/icons/<name>.svg
   ```

4. You MUST read the relevant reference SVG source code before drawing the new icon. The reference is not for copying blindly; it is to understand which concrete primitives communicate the meaning, such as outline shape, inner symbol, connector, leaf vein, gauge arc, bell body, or node graph.
5. Reconstruct the icon semantically. It does not need to be pixel-identical; it must communicate the same concept and match the slide's stroke weight, color, scale, and visual style.
6. If the icon is a semantic composition, draw it as multiple sub-icons or subgroups in one SVG instead of forcing all paths into one connected shape. For example, a "low-power sensing" icon can be one battery/lightning subgroup plus a separately positioned leaf subgroup:

   ```svg
   <svg viewBox="0 0 48 72" ...>
     <g id="battery-lightning">...</g>
     <g id="leaf" transform="translate(...) scale(...)">...</g>
   </svg>
   ```

   Treat subgroups as independently positioned semantic units. This avoids accidental merged shapes that read as stands, chains, tails, or other unintended objects after scaling.
7. Render the reconstructed SVG to PNG with DeckKit Pro `writeSvgToPng` at the target bbox size, then visually inspect the icon itself before accepting it. Do not rely only on the full-slide preview; small icon errors can disappear at full-slide scale.
8. Crop the source icon, compare it with the rendered icon, and adjust if the semantic match, weight, proportions, transparency behavior, or subgroup placement are off.

Never skip the local icon visual check for newly authored SVGs.

Author SVG files one at a time for the current region. Do not generate a whole slide's SVG library through one object map plus default style branches such as `directIconRefs[id] ?? ...`, `id.startsWith('sensing') ? BLUE : ...`, or `id.includes('header_icon') ? WHITE : ...`. The problem is not using a script to write files; the problem is forcing different visual groups through the same default style rules.

Treat visual group membership as part of the icon spec. The same semantic icon can require separate SVG code or separate parameters in different regions:

- A large project-background temperature/humidity icon in a pale circle is not the same visual asset as a small sensing-layer temperature sensor icon.
- Icons inside the same system-architecture sensing group may still have local exceptions, such as a green air-quality/leaf icon among blue sensor icons.
- Header icons, footer icons, service icons, scenario icons, and core-innovation icons each have their own color, scale, stroke weight, and background context.

Do not reuse an icon file, color rule, scale rule, stroke-width rule, or transform just because the semantic meaning is similar. Reuse is allowed only after comparing source crops and confirming that the visual group specifications match. If they do not match, create separate SVG files and separate QA records.

Each icon's `reference.txt` and `qa.md` must be written after visual inspection, not emitted as automatic PASS text. `qa.md` must explicitly confirm or fix:

- semantic match to the source icon;
- color and contrast in the icon's real background context;
- stroke weight and fill behavior;
- size, padding, and bbox occupancy;
- direction/orientation;
- subgroup placement for composed icons;
- consistency with neighboring icons in the same visual group.

For every authored icon, write QA files:

```txt
preview/icons/<icon-id>/source.png
preview/icons/<icon-id>/render.png
preview/icons/<icon-id>/side-by-side.png
preview/icons/<icon-id>/reference.txt
preview/icons/<icon-id>/qa.md
```

`reference.txt` must list the lucide SVG file path(s) read before drawing the icon, plus any semantic notes used to adapt them. If no good lucide reference exists, record the attempted searches and the chosen fallback before drawing.

`side-by-side.png` must place source and render on a background that makes the icon visible. For white or transparent icons, use a dark, checker, or original-context background; never review a white icon on a white background. After creating the files, open/read `side-by-side.png` with visual inspection and write `qa.md` with PASS or concrete issues/fixes. Do not move to the next icon or accept the region until every authored icon in that region has been visually inspected.

If transparent PNG previews render with black or incorrect backgrounds in Quick Look or region QA, fix the preview export pipeline immediately. The deliverable may still use direct SVG insertion, but the preview PNGs must be visually reliable for QA.

### 7. Non-Basic Decorative Shapes

For decorations that are not simple PPT primitives, such as curved section headers, swooshes, ribbons, asymmetric tabs, or custom frame chrome:

1. Visually identify the semantic role: header tab, section boundary, motion sweep, brand accent, separator, or background skin.
2. Reconstruct at the semantic level using SVG, DeckKit primitives, or custom geometry.
3. Compare the rendered result against the source crop.
4. Iterate until it carries the same layout role and visual rhythm.

Do not reproduce random image-generation artifacts unless they define a boundary, hierarchy, repeated style, or reading order.

For obvious gradient bands, bars, ribbons, and header/footer strips, use DeckKit/DeckKit Pro gradient support first. If the exact API is unclear, inspect the installed package/types or run a minimal experiment in the work folder before falling back to solid blocks. A solid-color approximation is allowed only when the failed gradient attempt and visual impact are recorded as validation gaps.

### 8. Hard Bitmap Assets

For assets that cannot reasonably be rebuilt with SVG/primitives:

1. First decide whether the desired asset can be cropped cleanly from the source. If yes, use a source crop.
2. If it cannot be cropped cleanly, write a Seedream/image-to-image prompt.
3. The prompt must instruct the model to output only the desired object/region and leave every unrelated area blank or transparent/white, depending on the intended crop.
4. Preserve semantic content and perspective; do not ask for unrelated redesign.

Keep prompts in the work folder so the asset can be regenerated.

### 9. Validation

After each region:

- Render the current-stage PPTX to preview images.
- Confirm each `preview/regions/<region-id>/qa.md` says PASS or records explicit gaps.
- Confirm each `preview/icons/<icon-id>/qa.md` says PASS or records explicit gaps.
- Read the current region/icon QA images directly; do not use a full-slide render as a shortcut.
- Check that text is editable where planned.
- Check that no region has unresolved text overflow, clipped labels, or unintended wrapping.
- Check that layout-only boxes did not produce PPT objects.

At the end:

- Compare the full slide only after all region gates pass; never use it as a replacement for region/icon QA.
- Validate preview and deliverable PPTX files with `unzip -t` or the available package integrity check.
- For SVG-heavy deliverables, confirm the final PPTX contains direct SVG assets, not only rasterized PNG substitutes.
- Check that PowerPoint opens without repair prompts.

In the final response, clearly separate completed outputs from validation gaps. If Workbench final JSON, per-region QA, per-icon QA, PowerPoint open-check, or any other required validation was skipped, say so explicitly instead of implying full completion.

If reconstruction uncovers a reusable DeckKit capability or limitation, update this skill's bundled `reference/deckkit-capabilities.md`. When maintaining the artifact-kit repository itself, also update `docs/deckkit-llm-capabilities.md` if that local doc is the source consumed by other tools.
