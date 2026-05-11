# @artifact-kit/deckkit

Artifact Kit's core library for generating editable PowerPoint decks.

This package currently starts from the PptxGenJS `4.0.1` implementation and keeps its MIT license notice.

## Install

```bash
pnpm add @artifact-kit/deckkit
```

## Usage

```ts
import DeckKit from '@artifact-kit/deckkit'

const pptx = new DeckKit()
const slide = pptx.addSlide()
slide.addText('Hello from Artifact Kit', { x: 1, y: 1, w: 8, h: 1 })
await pptx.writeFile({ fileName: 'example.pptx' })
```

## License

AGPL-3.0-or-later, with commercial licenses available for proprietary use
outside AGPL obligations.

This package is based on PptxGenJS by Brent Ely and contributors. The original
PptxGenJS MIT notice is retained in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
