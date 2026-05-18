---
name: deckkit-ppt-workspace
description: Create a timestamped local work folder for DeckKit PPT bbox or replica workflows in the current workspace, with input, manifests, scripts, crops, preview, svg, and output subfolders, without using examples/<name>-work paths.
---

# DeckKit PPT Workspace

Use this skill when starting a DeckKit PPT bbox or replica workflow and the user wants the standard work folders prepared in the current workspace.

This is the work-folder setup subset of `deckkit-ppt-replica`, changed to use a timestamped folder directly under the current writable workspace. Do not use `examples/<example-name>-bbox-work/`, `examples/<example-name>-work/`, or any other `examples`-based generated work path.

## Goal

Create one timestamped work folder under the current workspace and put all workflow folders inside it:

```txt
<workspace-root>/deckkit-ppt-work-YYYYMMDD-HHMMSS/
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

Use local time for the timestamp. Keep the folder name stable for the run after creating it.

## Workflow

1. Confirm the writable workspace root:

   ```bash
   pwd
   git rev-parse --show-toplevel
   ```

   Prefer `git rev-parse --show-toplevel` when it succeeds. Otherwise use `pwd`.

2. Create the timestamped folder directly under that root:

   ```txt
   deckkit-ppt-work-YYYYMMDD-HHMMSS/
   ```

   If a folder with the same timestamp already exists, append `-2`, `-3`, etc. Do not overwrite an existing work folder.

3. Create all required subfolders:

   ```txt
   input/
   manifests/
   scripts/
   crops/
   preview/regions/
   preview/icons/
   svg/
   output/
   ```

4. If the user provided a source PPT slide image, copy or mirror it into:

   ```txt
   <work-folder>/input/source.png
   ```

   Preserve the original file extension only if converting or copying to PNG is inappropriate for the current task. All downstream scripts should read `input/source.png` when a PNG source is available.

5. Record provenance when useful in:

   ```txt
   <work-folder>/manifests/source.json
   ```

   Suggested fields:

   ```json
   {
     "sourcePath": "/absolute/path/to/original.png",
     "workSourcePath": "input/source.png",
     "createdAt": "YYYY-MM-DDTHH:mm:ssZ"
   }
   ```

## Constraints

- All generated bbox, crop, preview, SVG, script, package, QA, and PPTX artifacts for this run must stay inside the timestamped work folder.
- Do not write generated work artifacts into `examples/`, a source image folder, the repository root, or the user's home directory.
- Do not install dependencies unless the user explicitly asks for the next workflow stage that needs them.
- Do not create bbox JSON, reconstruction code, SVG assets, or PPTX output as part of this setup-only skill unless the user also invokes a skill that requires those artifacts.
- Report the absolute work folder path and, if copied, the `input/source.png` path.
