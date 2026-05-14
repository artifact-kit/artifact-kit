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

## Primitive-First PPT Reconstruction

- Automatic SVG to custom geometry is risky for icons and dense diagrams because valid-looking SVG can still produce PPTX that PowerPoint asks to repair.
- For semantic elements that need to remain editable, prefer LLM-authored DeckKit JSX primitives: `Shape`, `Text`, lines, arrows, and grouped helper components.
- Treat SVG/custom geometry as a specialized fallback, not the default. It is acceptable for distinctive background chrome only after validating the generated PPTX opens without repair.
- If a visual element is not important to edit and primitive reconstruction is too expensive, use a bbox crop image first, then replace it later with primitives if needed.

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
