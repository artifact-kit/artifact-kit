# Lessons Learned

## BBox Review Session Creation

- When the goal is human bbox calibration, the initial session must contain the full intended bbox set. A partial session is not useful because it forces review against incomplete scope and is effectively equivalent to a failed setup.
- The first bbox pass should include all reconstruction-relevant elements, even if some boxes are approximate:
  - full slide and major layout regions
  - section containers and section headers
  - grouped text blocks and individual important text blocks
  - cards, rows, architecture boxes, images, icons, arrows, dividers, and decorative shapes
  - footer groups and separators
- If a full manifest is too large for one message, split the session population across MCP `create_session` then `update_session` calls, but the final review URL must point to a complete session before asking the human to review.

## Route-Aware BBox Granularity

- BBox selection is not a pure visual segmentation task. The box granularity must follow the intended reconstruction route and editability requirement.
- Before finalizing bbox review, each meaningful region should have a route decision such as `native`, `svg-image`, `editable-vector`, `imagegen`, `source-raster`, or `layout-only`.
- If the final route is a single raster/generated image or a single embedded SVG image, use one bbox for the whole asset. Do not split incidental internal parts unless they will be edited, replaced, or validated independently.
- If the final route needs editable PPT elements, split to the smallest useful editable unit. For example, a diagram row with six icon+label pairs should not be one bbox if each pair needs to become an editable icon/text group.
- A group bbox is still useful for alignment, but mark it as `layout-only` or `group` and also include the child bboxes that will be rendered.
- When uncertain, record both the parent bbox and proposed child bboxes, then ask human review to confirm whether the region should be one final asset or editable parts.
- Practical test: after drawing a bbox, ask "Will implementation place exactly one thing here?" If yes, one bbox is enough. If no, split into the things implementation will place.

## MCP Usage

- Use the loaded Codex MCP tool directly, for example `mcp__deckkit_workbench__.create_session` or `mcp__deckkit_workbench__.update_session`.
- Do not write ad hoc Node SDK scripts or HTTP client code when the MCP tool is already available in Codex.
- Before assuming a tool schema problem, inspect the currently loaded MCP tool definition after restart. If the schema still looks wrong, report the issue and ask before changing workbench code.
- Use MCP for control-plane operations that return small payloads, such as listing workbenches, creating sessions, or updating small session data.
- Do not use MCP to move large reviewed JSON back into the agent context when the same data can be fetched through HTTP.

## HTTP Usage

- Prefer HTTP for large payload transfer and file persistence. This avoids loading full bbox manifests, crops metadata, or review state into the model context.
- Fetch reviewed workbench data directly to disk:

  ```bash
  curl -sS http://127.0.0.1:3000/api/sessions/<session-id>/data \
    -o examples/<name>-work/manifests/final.json
  ```

- Fetch the full session only when assets or metadata are needed:

  ```bash
  curl -sS http://127.0.0.1:3000/api/sessions/<session-id> \
    -o examples/<name>-work/session-final.json
  ```

- If normal sandboxed shell access cannot reach `localhost:3000`, retry the same `curl` with escalated permissions instead of falling back to MCP for large JSON.
- Keep HTTP calls simple CLI operations. Do not write custom Node clients unless the workflow needs nontrivial transformation.

## Workbench Changes

- Do not modify `deckkit-workbench` while running a reconstruction workflow unless the user explicitly asks for a workbench implementation change.
- If the workflow exposes a real workbench limitation, stop and explain:
  - what tool call failed
  - what schema or behavior is blocking the workflow
  - the smallest proposed workbench change
- Only edit the workbench after the user agrees.

## Session State

- Keep local process artifacts under the ignored `examples/*-work/` folder.
- Preserve the source image in a tracked semantic example folder, currently `examples/iot-innovation-project/source.png`.
- Keep the MCP session id stable for the review round. Current full-page session:
  - `iot-innovation-project-full-page-v1`
  - `http://localhost:3000/?id=iot-innovation-project-full-page-v1`

## SVG Reconstruction Scope

- SVG/custom geometry is not only for icons. It is also the right tool for reusable frame chrome and background skins when native PPT primitives do not match the source.
- Section headers in this reference are not plain rounded rectangles. They combine a main color body, a curved right tail, a pale sweep/underlay, and a white curved separator. Recreating them as a single `roundRect` loses an important visual feature.
- Treat section containers as layered components:
  - native PPT shape for simple white body boxes and broad card surfaces
  - SVG/custom geometry for curved header skins, asymmetric tails, decorative sweeps, and other brand-specific chrome
  - separate icon/text layers on top
- This same strategy can apply to other non-icon details: swooshes, ribbons, header tabs, footer bands, callout skins, and decorative background strips.
  The decision should be based on whether the shape has distinctive curves/asymmetry that would be fragile or noisy to approximate with multiple primitive shapes.

## Decorative Element Triage

- Do not blindly reproduce every tiny artifact in an image-generated reference. Some marks are random generation noise, not intentional PPT design. In this example, the pale outlined ellipse under the subtitle row has no text, no alignment role, no repeated visual pattern, and no relationship to a nearby icon or section boundary; it can be treated as ignorable image-generation residue.
- This rule must stay narrow. "Decorative" does not mean "optional." Preserve decorative elements when they do any of the following:
  - define a section or card boundary
  - create a recurring visual language, such as header pills, swooshes, ribbons, badges, footer bands, or dividers
  - guide reading order or connect related content
  - balance the composition in a clearly intentional way
  - carry brand, theme, hierarchy, or rhythm even without text
- Before dropping a small decorative element, check three things:
  1. If removed, does the layout still read the same at full slide size and section-crop size?
  2. Is the element repeated elsewhere with a consistent style or position?
  3. Does it anchor, separate, connect, or emphasize any content?
- Only ignore the element when the answer is "no" to all three checks. If uncertain, keep it in the bbox/reconstruction plan as `decorative-shape` and ask for human review rather than silently deleting it.
- Avoid naked magic coordinates for optional decoration. If a decoration is kept, give it a semantic bbox id or wrap it in a named helper such as `drawSubtitleDecorations()`, so future review can tell why it exists.

## Primitive-First PPT Reconstruction

- Automatic SVG to custom geometry is risky for icons and dense diagrams because valid-looking SVG can still produce PPTX that PowerPoint asks to repair.
- For semantic elements that need to remain editable, prefer LLM-authored DeckKit JSX primitives: `Shape`, `Text`, lines, arrows, and grouped helper components.
- Treat SVG/custom geometry as a specialized fallback, not the default. It is acceptable for distinctive background chrome only after validating the generated PPTX opens without repair.
- If a visual element is not important to edit and primitive reconstruction is too expensive, use a bbox crop image first, then replace it later with primitives if needed.

## Native SVG Image Embedding

- DeckKit core can already embed SVG through `slide.addImage({ path: '...svg', x, y, w, h })`.
- The generated slide XML uses PowerPoint's native SVG extension, `asvg:svgBlip`, so this route can preserve vector scaling better than converting SVG to PNG before insertion.
- Use native SVG image embedding as the default route for visually accepted SVG assets that do not need to be edited as individual PPT shapes.
- Do not assume native SVG embedding means "fully editable." PowerPoint treats the SVG as an image-like vector asset. Editing individual paths still requires a separate conversion route, such as hand-authored DeckKit primitives/custom geometry.
- Current caveat: DeckKit core's Node SVG packaging also creates a `.png` fallback relationship, but that fallback file currently contains SVG bytes rather than valid PNG bytes. It works for current PowerPoint SVG rendering, but the packaging issue is tracked separately in Linear ART-11.
- Practical reconstruction order:
  1. Generate and visually validate the SVG.
  2. Embed the accepted SVG directly with core `addImage`.
  3. Convert to editable PPT primitives only when editability is a real requirement.

## PowerPoint Repair Triggers

- Do not create lines or shapes with negative `w` or `h`. PowerPoint may ask to repair the file because the generated OOXML can contain invalid negative extents such as `<a:ext cx="-...">`.
- For a visually reversed horizontal arrow, keep the geometry positive and move the arrowhead to the beginning:

  ```js
  addShape('line', {
    x: x0,
    y,
    w: x1 - x0,
    h: 0,
    line: { beginArrowType: 'triangle', endArrowType: 'none' },
  })
  ```

- The same rule applies to vertical or diagonal lines: compute a positive bounding box when possible, then express direction through arrowhead placement or flip/rotation instead of negative dimensions.
