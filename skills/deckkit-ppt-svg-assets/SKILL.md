---
name: deckkit-ppt-svg-assets
description: Reconstruct SVG-ready PPT slide assets from bbox/crop inputs using explicit semantic SVG authoring, lucide references, Iconfont golden base SVG selection, batch SVG preview QA, and manifest output.
---

# DeckKit PPT SVG Assets

Use this skill when a DeckKit PPT replica workflow needs SVG assets for bbox elements whose routes are `svg-image`, `editable-vector`, or `drawio-svg`.

This skill is the SVG reconstruction subset of `deckkit-ppt-replica`. It authors SVG files, runs a pre-complete batch SVG preview QA/fix loop, and writes a manifest for downstream composition. It does not create workspaces, generate bbox JSON, build native DeckKit elements, or run image generation. Final placement correctness is still validated later by region QA.

You can run this skill standalone inside a prepared DeckKit work folder. A full `deckkit-ppt-replica` workflow is not required to test Iconfont candidate selection, SVG generation, batch preview QA, or the Iconfont golden-base audit.

## Required References

Before authoring semantic icons, resolve `SKILL_DIR` as the directory containing this `SKILL.md`, then use only these skill-local lucide references:

- `$SKILL_DIR/reference/lucide/lucide-icons.jsonl`
- `$SKILL_DIR/reference/lucide/icons/<icon>.svg`

Do not search the current repo, parent directories, or the user's home directory for lucide assets. In an installed skill this reference directory may be `/Users/<USER>/.agents/skills/deckkit-ppt-svg-assets/reference/`; use that skill-local directory directly. Never run broad commands such as `find /Users/<user> ...` to locate lucide assets. If a required skill reference is missing, report the skill installation problem instead of falling back to unrelated files.

Lucide is the first required reference source, but it is not the only allowed source. If lucide does not contain a clearly relevant semantic reference for the icon concept, such as domain-specific medical, biology, industrial, or local-service icons, you MUST search Iconfont using the API fallback below and inspect the top 20 candidates before authoring the SVG. For complex Iconfont-selected shapes, the selected `show_svg` is the golden base SVG, not a loose visual reference.

## Inputs

Work inside the current DeckKit PPT work folder. The expected files are:

```txt
manifests/tasks/svg-assets.json
manifests/source-raster-cutouts.json
manifests/native-elements.json
crops/
svg/
```

Use the task manifest and crop manifest to identify every SVG asset to author. The usual candidates are render elements with routes:

- `svg-image`
- `editable-vector`
- `drawio-svg`

Use `native-elements.json` only to understand placeholder slots and replacement ownership. Do not modify native element code in this skill.

## Output Contract

Write SVG XML files under:

```txt
svg/<element-id>.svg
```

For every selected Iconfont golden base candidate, also preserve a copy of the selected candidate SVG under:

```txt
references/iconfont-candidates/<element-id>.svg
```

Write a complete manifest:

```txt
manifests/svg-assets.json
```

Suggested manifest shape:

```json
{
  "taskId": "svg-assets",
  "generatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "taskManifest": "manifests/tasks/svg-assets.json",
  "sourceRasterCutoutsManifest": "manifests/source-raster-cutouts.json",
  "nativeElementsManifest": "manifests/native-elements.json",
  "assets": [
    {
      "elementId": "example_icon",
      "route": "svg-image",
      "cropPath": "crops/example_icon.png",
      "svgPath": "svg/example_icon.svg",
      "bbox": { "x": 0, "y": 0, "w": 24, "h": 24 },
      "status": "complete",
      "lucideReferences": ["reference/lucide/icons/cloud.svg"],
      "iconfontReferences": [],
      "notes": "Semantic cloud icon adapted to source stroke weight."
    }
  ],
  "outputPaths": ["svg/example_icon.svg"],
  "validationGaps": []
}
```

Keep paths relative to the work folder unless the surrounding tool contract requires absolute paths.

## SVG Authoring Rules

Author each SVG as explicit visual code for that element. Do not generate a whole slide's SVG library through one object map plus default style branches such as `directIconRefs[id] ?? ...`, `id.startsWith('sensing') ? BLUE : ...`, or `id.includes('header_icon') ? WHITE : ...`. The problem is not using a script to write files; the problem is forcing different visual groups through the same default style rules.

The bbox JSON and crop manifest are positioning/reference evidence, not a rendering DSL. Do not implement a generic route/kind/id-driven SVG renderer that loops through elements and dispatches through broad helpers such as `strokeFor(element)`, `fillFor(element)`, `iconFor(element)`, or `id.includes(...)` rules.

Required approach:

- Use the source crop as the visual reference for the individual element.
- When crop images are attached to the prompt, treat those attached crop images as the primary visual reference for geometry, colors, stroke weight, gradients, and aspect ratio.
- Make visual decisions visible in the SVG source: viewBox, stroke, fill, opacity, path geometry, text-as-path decisions, grouping, transforms, and layer order.
- Keep helpers limited to file lookup, manifest parsing, XML escaping, and truly repeated primitives whose visual spec has been verified against the source.
- Asset files must have truthful extensions. A `.svg` file must contain SVG XML; do not write SVG text to a `.png` path.
- Insertable assets must be self-contained SVGs with explicit `viewBox`, `width`, `height`, and no dependency on external CSS, fonts, scripts, remote images, or repository-local files.

## Icon Reconstruction

For every semantic icon:

1. Identify the icon's meaning from the source crop, neighboring labels, and task context.
2. Search skill-local lucide metadata with `grep` or `jq`. This step is mandatory for every semantic icon, even when the icon seems unlikely to exist in lucide. For example:

   ```bash
   grep -Ei "thermometer|temperature|wifi|cloud|database" "$SKILL_DIR/reference/lucide/lucide-icons.jsonl"
   ```

3. If lucide has a clearly relevant candidate, read the most relevant SVG source:

   ```txt
   $SKILL_DIR/reference/lucide/icons/<name>.svg
   ```

4. If lucide does not have a clearly relevant semantic candidate after the metadata search and source read, search Iconfont through the skill-local helper script. This fallback is mandatory for concepts that lucide does not cover well, for example nurse, liver, lung, kidney, stomach, organ, doctor specialty, local industry symbols, or domain-specific product icons.

   ```bash
   node "$SKILL_DIR/scripts/iconfont-top20-summary.mjs" \
     --query "护士" \
     --out /tmp/iconfont-nurse \
     --limit 20
   ```

   Do not run raw `curl` from the session and paste the response into context. The helper script performs the API call, writes `raw-response.json`, `summary.json`, `candidates/*.svg`, `contact-sheet.svg`, and when possible `contact-sheet.svg.png`, then prints only compact paths and candidate metadata. The session should inspect the rendered contact sheet PNG or SVG plus summary, then read only the single selected candidate SVG.

   Use Chinese query terms when the concept is naturally Chinese or comes from Chinese slide text. If the first query is too broad or misses the concept, try one or two more precise semantic queries, such as `护士`, `护士帽`, `肝脏`, `肝`, `医生`, or `医疗护理`.
5. The helper script encapsulates the Iconfont API request and response parsing. The API response shape, saved in `raw-response.json` for traceability but normally not read into model context, is:

   ```json
   {
     "code": 200,
     "data": {
       "icons": [
         {
           "id": 3767594,
           "name": "血糖仪",
           "font_class": "xietangyi",
           "width": 1024,
           "height": 1024,
           "fills": 1,
           "preview_image": "t/icon_poster/...",
           "show_svg": "<svg ... viewBox=\"0 0 1024 1024\">...</svg>"
         }
       ],
       "count": 20
     }
   }
   ```

6. Score Iconfont top-20 candidates before writing the final SVG. Inspect `/tmp/iconfont-*/contact-sheet.svg.png` when the helper reports `renderedPngPath`; otherwise inspect `/tmp/iconfont-*/contact-sheet.svg`, plus `/tmp/iconfont-*/summary.json`. Prefer the candidate with the closest silhouette and semantic primitives to the source crop, then the closest visual complexity, aspect ratio, and line/fill style. Only after choosing the best candidate should you read that one candidate file from `/tmp/iconfont-*/candidates/`. Copy that selected file into the work folder at `references/iconfont-candidates/<element-id>.svg`; do not leave the only provenance path in `/tmp`. The selected candidate's `show_svg` becomes the golden base asset for the subject shape. Record the chosen candidate in the manifest, including `candidateSvgPath`, `showSvgSha256`, and `goldenBase: true`, for example:

   ```json
   {
     "iconfontReferences": ["iconfont:q=护士#3:id=123456"],
     "selectedIconfontCandidate": {
       "query": "护士",
       "rank": 3,
       "id": 123456,
       "name": "护士",
       "candidateSvgPath": "references/iconfont-candidates/nurse.svg",
       "showSvgSha256": "sha256-from-helper-summary",
       "goldenBase": true,
       "reason": "Best top-20 silhouette match to the crop; show_svg used as golden base shape."
     }
   }
   ```

7. For complex domain-specific shapes from Iconfont, such as organs, nurses, medical devices, drainage/infusion tubes, industrial equipment, or highly specialized pictograms, do NOT redraw the icon from path memory and do NOT author an alternative subject geometry inspired by the candidate. Use the highest-scoring Iconfont candidate's `show_svg` as the golden base SVG for the subject shape. Only adjust:

   - foreground color or stroke/fill color
   - scale, crop, centering, and `viewBox` placement
   - background circle/card/badge
   - small compositional overlays such as warning triangles, plus signs, shields, or status dots
   - grouping with other already-selected icon shapes

   Do not invent a new organ, nurse, tube, device, or other complex silhouette when a top-20 Iconfont candidate is a better shape match. Preserve the selected candidate's core paths/silhouette unless a minimal transform or color normalization is required for the slide style.
   The generated `svg/<element-id>.svg` must retain at least one exact core `path d` from the copied candidate SVG. If you need a different color, wrap the candidate paths in groups or change paint attributes; do not replace the path geometry with hand-authored lookalike geometry.
8. For simple generic symbols that lucide already covers well, reconstruct semantically from lucide and the crop. The Iconfont base-shape rule is specifically for complex shapes where hand-authored path reconstruction is likely to be worse than selecting and adapting the best candidate.
9. If both lucide and Iconfont fail or network access is blocked, still author the best semantic SVG from crop/context and record the attempted query and failure reason in `validationGaps`.
10. If the icon is a semantic composition, draw it as multiple sub-icons or subgroups in one SVG instead of forcing all paths into one connected shape. For example, a "low-power sensing" icon can be one battery/lightning subgroup plus a separately positioned leaf subgroup:

   ```svg
   <svg viewBox="0 0 48 72" xmlns="http://www.w3.org/2000/svg">
     <g id="battery-lightning">...</g>
     <g id="leaf" transform="translate(...) scale(...)">...</g>
   </svg>
   ```

Treat subgroups as independently positioned semantic units. This avoids accidental merged shapes that read as stands, chains, tails, or other unintended objects after scaling.

## Visual Group Rules

Treat visual group membership as part of the asset spec. The same semantic icon can require separate SVG code or separate parameters in different regions:

- A large temperature/humidity icon in a pale circle is not the same visual asset as a small temperature sensor icon in a dense architecture diagram.
- Icons inside the same sensing group may still have local exceptions, such as a green air-quality/leaf icon among blue sensor icons.
- Header icons, footer icons, service icons, scenario icons, and core-innovation icons each have their own color, scale, stroke weight, and background context.

Do not reuse an icon file, color rule, scale rule, stroke-width rule, or transform just because the semantic meaning is similar. Reuse is allowed only after comparing source crops and confirming that the visual group specifications match. If they do not match, create separate SVG files and separate manifest records.

## Non-Basic Decorative Shapes

For decorations that are not simple PPT primitives, such as curved section headers, swooshes, ribbons, asymmetric tabs, custom frame chrome, diagram connectors, or compound badges:

1. Visually identify the semantic role: header tab, section boundary, motion sweep, brand accent, separator, background skin, connector, or badge.
2. Reconstruct at the semantic level using SVG paths, gradients, masks, groups, and explicit geometry.
3. Match the layout role and visual rhythm of the source crop.
4. Use a viewBox that matches the asset's natural bbox aspect ratio for wide/tall decorative assets instead of forcing `0 0 24 24`.
5. Preserve the crop's silhouette, curvature rhythm, edge treatments, bevel/shadow intent, and layer order well enough that the asset looks usable when placed on the slide.

Do not reproduce random image-generation artifacts unless they define a boundary, hierarchy, repeated style, or reading order.

## Pre-Complete Preview QA And Fix Loop

Before handing off, run a lightweight visual QA loop on the generated SVG assets themselves. This is not final slide-region QA; it catches bad icon choices, tiny render previews, off-center graphics, missing paths, wrong colors, and hand-drawn shapes that clearly do not match the crop.

Required preview method:

1. Create a batch contact sheet that places every generated SVG on a white background, centered and enlarged in a fixed cell. Do not rely on default thumbnail behavior where a tiny SVG appears in the top-left of a large white canvas.
2. Use `$SKILL_DIR/scripts/svg-contact-sheet.mjs` when available:

   ```bash
   node "$SKILL_DIR/scripts/svg-contact-sheet.mjs" \
     --manifest manifests/svg-assets.json \
     --out preview/svg-assets/contact-sheet.svg \
     --columns 2 \
     --cell 500 \
     --icon 310
   ```

3. Render the contact sheet to an inspectable image. On macOS, `qlmanage` is acceptable:

   ```bash
   qlmanage -t -s 1000 -o preview/svg-assets preview/svg-assets/contact-sheet.svg
   ```

4. Inspect the rendered contact sheet at a useful size. If a generated SVG is obviously wrong, too tiny, clipped, off-center, poorly colored, or based on a worse Iconfont candidate than another top-20 result, fix it and regenerate the contact sheet.
5. Repeat until the batch preview is usable enough for downstream composition, or record remaining issues in `validationGaps`.

Contact sheets should be compact enough to view in one screen. For many assets, create multiple sheets, such as `contact-sheet-1.svg`, `contact-sheet-2.svg`, etc. Each icon should be visibly large in its cell.

Do not create verbose per-icon `qa.md` files unless explicitly requested. Prefer batch visual evidence and concise manifest notes.

## Static Validation

After the preview QA/fix loop, perform static validation:

- `manifests/svg-assets.json` parses as JSON.
- Every SVG replacement slot owned by `svg-assets` has exactly one asset record.
- Every asset record has a matching `elementId`, original `route`, `cropPath`, and `svgPath`.
- Every `svgPath` is under `svg/`, ends with `.svg`, exists, and contains SVG XML.
- Every authored SVG has a `viewBox` and no external network or filesystem dependency.
- Every complex Iconfont-derived asset records the chosen top-20 candidate in `iconfontReferences` and `selectedIconfontCandidate`, with `candidateSvgPath`, `showSvgSha256`, and `goldenBase: true`.
- Every complex Iconfont-derived SVG preserves the selected candidate's core `path d`; validator failure here means the asset was hand-redrawn and must be fixed before handoff.
- The batch preview contact sheet path is recorded in `validationGaps` or notes only if it exposes a remaining issue; otherwise it can be left as a generated QA artifact.
- `validationGaps` records any asset that could not be reconstructed semantically.

When running this skill standalone, use the skill-local validator before handoff:

```bash
node "$SKILL_DIR/scripts/validate-svg-assets.mjs" --workdir .
```

This does not require running the full replica workflow. It checks manifest shape, SVG files, Iconfont candidate provenance, candidate sha256, and whether the generated SVG preserved the selected candidate's core `path d`.

Then stop and report:

- The path to `manifests/svg-assets.json`.
- The number of SVG assets authored.
- Any static validation gaps.
