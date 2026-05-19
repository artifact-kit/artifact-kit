---
name: deckkit-ppt-svg-assets
description: Reconstruct SVG-ready PPT slide assets from bbox/crop inputs using explicit semantic SVG authoring, skill-local lucide references, and manifest output for later region QA.
---

# DeckKit PPT SVG Assets

Use this skill when a DeckKit PPT replica workflow needs SVG assets for bbox elements whose routes are `svg-image`, `editable-vector`, or `drawio-svg`.

This skill is the SVG reconstruction subset of `deckkit-ppt-replica`. It authors SVG files and a manifest for downstream composition. It does not create workspaces, generate bbox JSON, build native DeckKit elements, run image generation, or perform per-SVG QA. Visual correctness is validated later by region QA.

## Required References

Before authoring semantic icons, resolve `SKILL_DIR` as the directory containing this `SKILL.md`, then use only these skill-local lucide references:

- `$SKILL_DIR/reference/lucide/lucide-icons.jsonl`
- `$SKILL_DIR/reference/lucide/icons/<icon>.svg`

Do not search the current repo, parent directories, or the user's home directory for lucide assets. In an installed skill this reference directory may be `/Users/<USER>/.agents/skills/deckkit-ppt-svg-assets/reference/`; use that skill-local directory directly. Never run broad commands such as `find /Users/<user> ...` to locate lucide assets. If a required skill reference is missing, report the skill installation problem instead of falling back to unrelated files.

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
- Make visual decisions visible in the SVG source: viewBox, stroke, fill, opacity, path geometry, text-as-path decisions, grouping, transforms, and layer order.
- Keep helpers limited to file lookup, manifest parsing, XML escaping, and truly repeated primitives whose visual spec has been verified against the source.
- Asset files must have truthful extensions. A `.svg` file must contain SVG XML; do not write SVG text to a `.png` path.
- Insertable assets must be self-contained SVGs with explicit `viewBox`, `width`, `height`, and no dependency on external CSS, fonts, scripts, remote images, or repository-local files.

## Icon Reconstruction

For every semantic icon:

1. Identify the icon's meaning from the source crop, neighboring labels, and task context.
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

Do not reproduce random image-generation artifacts unless they define a boundary, hierarchy, repeated style, or reading order.

## Validation

This skill does not create `preview/icons/<id>/qa.md`, per-icon side-by-side images, or per-SVG PASS records. SVG visual QA belongs to the later region QA stage, where the SVG is judged in its real slide context.

Before handing off, perform only static validation:

- `manifests/svg-assets.json` parses as JSON.
- Every SVG replacement slot owned by `svg-assets` has exactly one asset record.
- Every asset record has a matching `elementId`, original `route`, `cropPath`, and `svgPath`.
- Every `svgPath` is under `svg/`, ends with `.svg`, exists, and contains SVG XML.
- Every authored SVG has a `viewBox` and no external network or filesystem dependency.
- `validationGaps` records any asset that could not be reconstructed semantically.

Then stop and report:

- The path to `manifests/svg-assets.json`.
- The number of SVG assets authored.
- Any static validation gaps.
