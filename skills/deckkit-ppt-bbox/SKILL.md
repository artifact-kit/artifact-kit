---
name: deckkit-ppt-bbox
description: Generate route-aware bbox review JSON for PPT slide images using the DeckKit PPT replica bbox schema, hierarchy, route, editability, and granularity rules, without Workbench finalization or PPT reconstruction.
---

# DeckKit PPT BBox

Use this skill when the user wants bbox review data for a source PPT slide image, especially when the next step may be DeckKit reconstruction but the current deliverable is only a route-aware `initial-bbox.json`.

This skill is the bbox-generation subset of `deckkit-ppt-replica`. It must produce the same bbox JSON quality, schema, route choices, hierarchy, and granularity that the full replica skill expects. It does not ask the user to complete a Workbench finalization step, and it does not proceed into DeckKit reconstruction.

## Execution Discipline

Treat the bbox JSON as user-visible review evidence. Put effort into geometry accuracy, hierarchy, route selection, editability, render roles, and per-element granularity. Do not optimize for speed by outputting coarse boxes, unsupported enum values, or vague route intent.

The short-term goal is always: create and validate `manifests/initial-bbox.json`, then stop.

Do not:

- Install dependencies.
- Create reconstruction scripts.
- Author SVGs or bitmap assets.
- Generate PPTX files.
- Prompt the user to use Workbench or wait for `initial-bbox.final.json`.
- Continue into region QA or final deck reconstruction.

## Workflow

### 1. Use The Prepared Work Folder

Use the current DeckKit PPT work folder prepared by the caller or by the `deckkit-ppt-workspace` skill. The expected layout is:

```txt
deckkit-ppt-work-YYYYMMDD-HHMMSS/
  input/
    source.<ext>
  manifests/
  scripts/
  crops/
  preview/
    regions/
    icons/
  svg/
  output/
```

Do not create another workspace, do not create `examples/<name>-bbox-work/`, and do not move or recopy the source image unless the caller explicitly asks for workspace setup.

The current work folder may not be a Git repository. Do not run `git status`, `git rev-parse`, or other git commands as part of bbox generation or completion checks. Use the explicit paths provided by the caller, and rely on the host CLI or caller to validate that files were written.

All generated bbox artifacts for this skill must stay inside the current work folder, especially:

```txt
manifests/initial-bbox.json
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
- For decorative containers with irregular ornamental borders, plaques, ribbons, tabs, badges, or non-basic frame chrome around editable text, split the visual frame from the text. The frame should usually be one `kind: "decorative-shape"` render element with `route: "svg-image"` or `route: "editable-vector"`; the readable text inside it should be separate `route: "native-text"` render element(s). Do not merge text into the SVG frame unless the text is intentionally non-editable artwork.

SVG route eligibility:

- A `svg-image` or `editable-vector` render node must describe one indivisible vector-like visual asset: an icon, logo, pictogram, ornamental frame, connector cluster, or diagram fragment that implementation would place as a single authored asset.
- Do not mark an entire UI/card/module as one `svg-image` just because it contains a border, text, and an illustration/icon. A card with readable text, a border/background, and a visual asset is a composite layout, not one SVG asset.
- For composite cards, create a parent `kind: "card"` or `kind: "group"` with `route: "layout-only"` and `renderRole: "layout"` or `"context"`. Then split visible children: border/background as `native-shape`, each readable text block as `native-text`, and each real icon/illustration as its own `icon`/`image`/`decorative-shape` node with the appropriate route.
- If the SVG-worthy visual inside a card is small, bbox that inner visual tightly. Do not expand the SVG bbox to include the card chrome, label text, captions, badges, or surrounding whitespace.
- If a candidate SVG bbox contains editable/readable text plus unrelated layout chrome, treat it as too coarse and split it before emitting the first-pass JSON.

### 3. Validate And Stop

After writing `manifests/initial-bbox.json`, validate it locally before responding.

Validation requirements:

- Parse the JSON with a structured parser.
- Confirm image `width` and `height` match the source image metadata.
- Confirm every bbox has finite non-negative `x`, `y`, `w`, and `h`; `w` and `h` must be greater than zero.
- Confirm every bbox stays within the image bounds unless an intentional edge bleed is recorded in `notes`.
- Confirm every `parentId` points to an existing element.
- Confirm every enum field uses only the schema values above.
- Confirm there are no duplicate `id` values.
- Confirm no visible object is represented by duplicate render boxes.

Then stop and report:

- The path to `manifests/initial-bbox.json`.
- The source image dimensions used.
- Any validation gaps or intentional approximations.

Do not ask the user to open Workbench, download `initial-bbox.final.json`, or continue into reconstruction. If the user later wants reconstruction, they can use `deckkit-ppt-replica` with this bbox JSON as the starting point.
