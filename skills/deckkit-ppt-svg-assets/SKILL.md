---
name: deckkit-ppt-svg-assets
description: Reconstruct SVG-ready PPT slide assets from bbox/crop inputs using Iconfont reference search, golden base SVG selection, explicit SVG assembly, batch SVG preview QA, and manifest output.
---

# DeckKit PPT SVG Assets

Use this skill when a DeckKit PPT replica workflow needs SVG assets for bbox elements whose routes are `svg-image`, `editable-vector`, or `drawio-svg`.

This skill is the SVG reconstruction subset of `deckkit-ppt-replica`. It authors SVG files, runs a pre-complete batch SVG preview QA/fix loop, and writes a manifest for downstream composition. It does not create workspaces, generate bbox JSON, build native DeckKit elements, or run image generation. Final placement correctness is still validated later by region QA.

You can run this skill standalone inside a prepared DeckKit work folder. A full `deckkit-ppt-replica` workflow is not required to test Iconfont candidate selection, SVG generation, batch preview QA, or the Iconfont golden-base audit.

## Required Iconfont References

Before authoring semantic icons, resolve `SKILL_DIR` as the directory containing this `SKILL.md`.

Iconfont is the required default reference source for semantic icon assets. For every semantic icon, search Iconfont through the skill-local helper script, inspect the top candidates, select the best candidate by semantic correctness and asset quality, and use that selected SVG as the reference/base for assembly. For complex Iconfont-selected shapes, the selected `show_svg` is the golden base SVG, not a loose visual reference.

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
      "iconfontReferences": ["iconfont:q=云#2:id=123456"],
      "notes": "Iconfont candidate assembled and adapted to source stroke weight."
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
2. Derive the Iconfont search query from the icon's visual semantic meaning, not by blindly copying nearby PPT text. Nearby labels, section titles, and page theme are context clues for disambiguation, but the query should name what the icon depicts or symbolizes. For example:

   - If the nearby label is `营养管理` but the icon depicts a pancreas or organ, search `胰腺` or `器官`, not `营养管理`.
   - If the nearby label is `血糖监测` and the icon depicts a glucose meter, search `血糖仪`, `血糖检测仪`, or `血糖监测仪`.
   - If the nearby label is `感染预防` but the icon depicts a shield, virus, mask, or disinfectant bottle, search that visual concept such as `盾牌病毒`, `病毒防护`, `口罩`, or `消毒液`.
   - If the nearby label is `管路管理` but the icon depicts an infusion tube, drainage tube, catheter, or IV bag, search `输液管`, `引流管`, `导管`, or `输液袋`.

3. Search Iconfont through the skill-local helper script. This Iconfont search is mandatory for every semantic icon, including generic symbols and complex domain-specific concepts such as nurse, liver, lung, kidney, stomach, organ, doctor specialty, local industry symbols, or product icons.

   ```bash
   node "$SKILL_DIR/scripts/iconfont-top20-summary.mjs" \
     --query "护士" \
     --out /tmp/iconfont-nurse \
     --limit 20
   ```

   Do not run raw `curl` from the session and paste the response into context. The helper script performs the API call, writes `raw-response.json`, `summary.json`, `candidates/*.svg`, `contact-sheet.svg`, and when possible `contact-sheet.svg.png`, then prints only compact paths and candidate metadata. The session should inspect the rendered contact sheet PNG or SVG plus summary, then read only the single selected candidate SVG.

   Use Chinese query terms when the concept is naturally Chinese or comes from Chinese slide text. If the first query is too broad or misses the concept, try one or two more precise semantic queries, such as `护士`, `护士帽`, `肝脏`, `肝`, `医生`, or `医疗护理`.
4. The helper script encapsulates the Iconfont API request and response parsing. The API response shape, saved in `raw-response.json` for traceability but normally not read into model context, is:

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

5. Score Iconfont top-20 candidates before writing the final SVG. Inspect `/tmp/iconfont-*/contact-sheet.svg.png` when the helper reports `renderedPngPath`; otherwise inspect `/tmp/iconfont-*/contact-sheet.svg`, plus `/tmp/iconfont-*/summary.json`. The selection priority is:

   1. Semantic correctness: the candidate represents the same concept and contains the right domain-specific structure, such as the correct organ/device/tube/bag/nurse form.
   2. Asset quality: prefer the most refined, legible, well-proportioned, and visually polished candidate that can stand as the golden base at PPT icon size.
   3. Adaptability to the slide: prefer candidates whose fill/stroke, color, background, and composition can be adapted with allowed modifications.

   Do NOT choose a worse candidate merely because it is line art, has the same fill/stroke mode as the source crop, or superficially matches the crop's rendering style. Line-vs-fill and color are normally adjustable. For example, if a filled pancreas candidate is semantically stronger and more polished than a white-line pancreas candidate, choose the filled candidate and adapt its fill color/background instead of selecting the weaker line-art candidate.

   Only after choosing the best candidate should you read that one candidate file from `/tmp/iconfont-*/candidates/`. Copy that selected file into the work folder at `references/iconfont-candidates/<element-id>.svg`; do not leave the only provenance path in `/tmp`. The selected candidate's `show_svg` becomes the golden base asset for the subject shape. Record the chosen candidate in the manifest, including `candidateSvgPath`, for example:

   ```json
   {
     "iconfontReferences": ["iconfont:q=护士#3:id=123456"],
     "selectedIconfontCandidate": {
       "query": "护士",
       "rank": 3,
       "id": 123456,
       "name": "护士",
       "candidateSvgPath": "references/iconfont-candidates/nurse.svg",
       "goldenBase": true,
       "reason": "Best semantic and asset-quality match; show_svg used as golden base shape."
     }
   }
   ```

6. For complex domain-specific shapes from Iconfont, such as organs, nurses, medical devices, drainage/infusion tubes, industrial equipment, or highly specialized pictograms, do NOT redraw the icon from path memory and do NOT author an alternative subject geometry inspired by the candidate. Use the highest-scoring Iconfont candidate's `show_svg` as the golden base SVG for the subject shape. If the selected candidate is missing important subject details, choose a better complete candidate; do not repair it by drawing new subject internals. Only adjust:

   - foreground color or stroke/fill color
   - scale, crop, centering, and `viewBox` placement
   - background circle/card/badge
   - generic status badges outside the subject shape, such as warning triangles, plus signs, shields, or status dots
   - grouping with other already-selected Iconfont candidate shapes, with each meaningful sub-icon recorded in `iconfontReferences` and copied under `references/iconfont-candidates/`

   Do not invent a new organ, nurse, tube, device, or other complex silhouette when a top-20 Iconfont candidate is a better shape match. Preserve the selected candidate's core paths/silhouette unless a minimal transform or color normalization is required for the slide style.
   If you need a different color, wrap the candidate paths in groups or change paint attributes; do not replace the subject geometry with hand-authored lookalike geometry.
   Do not add hand-authored subject internals or extensions such as leaves, glucose screens, measurement strips, tube extensions, organ lobes, device panels, or anatomical details. Extra authored geometry may only be simple background/status geometry; it must not change what the chosen Iconfont subject depicts.
7. If the target icon is a composition of multiple meaningful objects, run separate Iconfont searches for each meaningful object and compose the selected candidate SVGs. For example, a glucose monitoring icon that needs a meter plus strip should search/select both `血糖仪` and `试纸` if one candidate does not already include both. A tube-management icon that needs a bag plus tube should search/select both `输液袋` and `输液管` if one candidate does not already include both. Do not search one subject and hand-author the remaining meaningful object.
8. For simple generic symbols, still use Iconfont search first. You may assemble a final icon from multiple selected Iconfont candidates or simple explicit SVG primitives when composition is needed, but record the Iconfont candidate(s) that drove the semantic choice.
9. If Iconfont search fails or network access is blocked, still author the best semantic SVG from crop/context and record the attempted query and failure reason in `validationGaps`.
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
- Every complex Iconfont-derived asset records the chosen top-20 candidate in `iconfontReferences` and `selectedIconfontCandidate`, with `candidateSvgPath`.
- Every complex Iconfont-derived SVG should preserve selected candidates as the subject source and should not introduce hand-authored subject internals. Catch this in the batch visual QA loop by comparing the final SVG contact sheet against the selected Iconfont contact sheets/candidates.
- The batch preview contact sheet path is recorded in `validationGaps` or notes only if it exposes a remaining issue; otherwise it can be left as a generated QA artifact.
- `validationGaps` records any asset that could not be reconstructed semantically.

When running this skill standalone, use the skill-local validator before handoff:

```bash
node "$SKILL_DIR/scripts/validate-svg-assets.mjs" --workdir .
```

This does not require running the full replica workflow. It checks manifest shape, SVG files, and Iconfont candidate provenance. The semantic rule that complex subjects must come from selected Iconfont candidates is enforced by the skill workflow and batch visual QA, not by brittle geometric path matching.

Then stop and report:

- The path to `manifests/svg-assets.json`.
- The number of SVG assets authored.
- Any static validation gaps.
