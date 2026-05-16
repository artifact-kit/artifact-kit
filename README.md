# Artifact Kit

Artifact Kit is a pnpm workspace for generating, reviewing, and publishing
editable PowerPoint deck tooling under the `@artifact-kit` npm scope.

The repository is centered on DeckKit:

- `@artifact-kit/deckkit` provides the core PowerPoint generation API.
- `@artifact-kit/deckkit-jsx` adds a declarative JSX component layer.
- `@artifact-kit/deckkit-pro` adds commercial rendering plugins and image tools
  as an npm package with private source code.
- `@artifact-kit/deckkit-workbench` provides a browser-only review UI for bbox
  based reconstruction workflows.

## Packages

| Package | Path | Release status | Purpose |
| --- | --- | --- | --- |
| `@artifact-kit/deckkit` | `packages/deckkit` | public npm package | Core library for editable PowerPoint deck generation. |
| `@artifact-kit/deckkit-jsx` | `packages/deckkit-jsx` | public npm package | JSX components and render helpers for DeckKit. |
| `@artifact-kit/deckkit-pro` | `packages/deckkit-pro` | public npm package, private source | Commercial plugin bundle for gradients, SVG custom geometry, SVG-to-PNG, and image utilities under a separate commercial license. |
| `@artifact-kit/deckkit-workbench` | `packages/deckkit-workbench` | private workspace app | Static browser UI for human bbox review. |
| `@artifact-kit/deckkit-test` | `packages/deckkit-test` | private workspace package | Integration tests and example deck generators. |
| `@artifact-kit/svg-icon-reference` | `packages/svg-icon-reference` | private workspace package | Local SVG icon reference/index generation. |

`packages/deckkit-pro` is a private-source git submodule. The npm package can
be installed and used by licensed users, but the source repository is not part
of Artifact Kit's open-source codebase.

```bash
git submodule update --init --recursive
```

The submodule command only works for users with access to the private
`deckkit-pro` repository.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Target a single package with pnpm filters:

```bash
pnpm --filter @artifact-kit/deckkit build
pnpm --filter @artifact-kit/deckkit-jsx typecheck
pnpm --filter @artifact-kit/deckkit-pro test
pnpm --filter @artifact-kit/deckkit-workbench dev
```

The workbench is a static Vite app. It does not upload files or require a
server-side session in the default workflow.

## Core Usage

```ts
import DeckKit from '@artifact-kit/deckkit'

const pptx = new DeckKit()
const slide = pptx.addSlide()

slide.addText('Hello from Artifact Kit', {
  x: 1,
  y: 1,
  w: 8,
  h: 1,
})

await pptx.writeFile({ fileName: 'example.pptx' })
```

## JSX Usage

```tsx
/** @jsxImportSource @artifact-kit/deckkit-jsx */
import { Deck, Slide, Text, Rect, renderPptx } from '@artifact-kit/deckkit-jsx'

await renderPptx(
  <Deck title="Artifact Kit example">
    <Slide>
      <Rect x={0.5} y={0.5} w={12.33} h={6.5} fill={{ color: 'F7F8FA' }} />
      <Text x={1} y={1} w={6} h={0.6} fontSize={28} bold>
        Editable JSX slide
      </Text>
    </Slide>
  </Deck>,
  { fileName: 'example.pptx' },
)
```

The JSX layer exports deck structure, text, shape, image, media, chart, table,
placeholder, notes, raw render hooks, `createPptx`, `renderPptx`, `writePptx`,
and a component manifest for tool-assisted generation.

## Pro Usage

`@artifact-kit/deckkit-pro` is distributed on npm for licensed users. Its source
code is private and it is governed by a separate commercial license, not by the
open-source licenses used by the public Artifact Kit packages.

```ts
import DeckKit from '@artifact-kit/deckkit'
import deckkitPro from '@artifact-kit/deckkit-pro'

const deck = new DeckKit()
deck.use(deckkitPro())

const slide = deck.addSlide()
slide.addShape(deck.ShapeType.rect, {
  x: 1,
  y: 1,
  w: 5,
  h: 2,
  fill: {
    type: 'gradient',
    angle: 90,
    stops: [
      { position: 0, color: 'FF5A5F' },
      { position: 1, color: '2D9CDB' },
    ],
  },
})
```

`@artifact-kit/deckkit-pro` also exports:

- `renderSvgToPng` and `writeSvgToPng`
- `svgToCustomGeometry` and DeckKit custom geometry handlers
- image helpers: crop, resize, overlay, compare, sample color, inspect metadata
- CLI binaries: `deckkit-pro` and `deckkit-svg-to-png`

## Workbench

Run the bbox review UI locally:

```bash
pnpm --filter @artifact-kit/deckkit-workbench dev
```

Build the static site:

```bash
pnpm --filter @artifact-kit/deckkit-workbench build
```

For GitHub Pages under a project path:

```bash
GITHUB_PAGES_BASE=/artifact-kit/ pnpm --filter @artifact-kit/deckkit-workbench build
```

## Publishing

Published packages use `prepublishOnly` checks.

```bash
pnpm --filter @artifact-kit/deckkit publish --access public
pnpm --filter @artifact-kit/deckkit-jsx publish --access public
pnpm --filter @artifact-kit/deckkit-pro publish --access public
```

Run a dry-run before publishing:

```bash
cd packages/deckkit-pro
npm publish --dry-run --access public
```

When changing `deckkit-pro`, commit inside the private `packages/deckkit-pro`
submodule first, then commit the updated submodule pointer from the parent
repository.

## Documentation

- LLM-facing DeckKit capability notes live in
  [docs/deckkit-llm-capabilities.md](docs/deckkit-llm-capabilities.md).
- BBox segmentation planning notes live in
  [docs/bbox-route-aware-segmentation-proposal.md](docs/bbox-route-aware-segmentation-proposal.md).

## License

Artifact Kit packages are licensed individually:

- `@artifact-kit/deckkit` is AGPL-3.0-or-later, with commercial licenses
  available for proprietary use outside AGPL obligations.
- `@artifact-kit/deckkit-jsx` is MIT licensed.
- `@artifact-kit/deckkit-pro` is a usable npm package for licensed users, but
  its source code is private and its use is governed by
  `packages/deckkit-pro/COMMERCIAL-LICENSE.md` or a separate written commercial
  agreement.
- Private tooling packages are internal repository utilities unless otherwise
  stated in their package directories.
