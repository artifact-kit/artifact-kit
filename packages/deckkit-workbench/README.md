# DeckKit Workbench

Static browser-only human-in-the-loop workbench for PPT screenshot reconstruction workflows.

The app runs fully in the browser:

1. Select a local source image.
2. Select a local initial bbox JSON.
3. Review bbox geometry and reconstruction plan fields.
4. Download the final reviewed JSON.

There is no server, MCP session, CLI job, upload, or persistent storage in the default workflow.

## BBox Review

- The left pane shows the full source image.
- Only the active bbox is strongly highlighted.
- Other boxes can be hidden or shown with low opacity.
- The right pane shows the live crop that the current bbox would produce.
- The reviewer can adjust `x`, `y`, `w`, and `h`.
- The reviewer can edit reconstruction plan fields:
  - `route`
  - `editability`
  - `renderRole`
  - `childrenPolicy`
  - `granularityFeedback`
  - `routeReason`
  - `notes`
- `granularityFeedback: too-coarse | too-fine` marks the area as `needs-agent` when completed.

## Local Run

```bash
pnpm install
pnpm --filter @artifact-kit/deckkit-workbench dev
```

Then open the Vite URL printed in the terminal.

## Build

```bash
pnpm --filter @artifact-kit/deckkit-workbench build
```

The static site is emitted to:

```txt
packages/deckkit-workbench/dist
```

## GitHub Pages

The repository workflow builds this package and publishes `dist` to the `gh-pages` branch.

In GitHub repository settings, configure Pages to deploy from:

```txt
Branch: gh-pages
Folder: /
```

If the site is served from a project path, set `GITHUB_PAGES_BASE` during build, for example:

```bash
GITHUB_PAGES_BASE=/artifact-kit/ pnpm --filter @artifact-kit/deckkit-workbench build
```

The included GitHub Action sets that base automatically for repository Pages.

## Accepted JSON Shapes

The browser loader accepts:

- raw bbox review data: `{ imageAssetId, image, elements }`
- session envelope: `{ workbenchType: "bbox-review", data, assets }`
- element manifest: `{ source, image, boxes }`
- project fixture shape: `{ sourceImagePath, manifest: { image, boxes }, review }`

Output preserves the input shape where practical:

- project input downloads a project-shaped output with updated `manifest.boxes`
- manifest input downloads a manifest-shaped output with updated `boxes`
- session envelope input downloads an envelope with updated `data`
- raw bbox review data downloads raw bbox review data
