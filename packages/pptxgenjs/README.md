# @artifact-kit/pptxgenjs

Artifact Kit's Node.js-focused fork of [PptxGenJS](https://github.com/gitbrent/PptxGenJS).

This package currently starts from the PptxGenJS `4.0.1` implementation and keeps its MIT license notice. Future Artifact Kit changes will happen in this package.

## Install

```bash
pnpm add @artifact-kit/pptxgenjs
```

## Usage

```ts
import pptxgen from '@artifact-kit/pptxgenjs'

const pptx = new pptxgen()
const slide = pptx.addSlide()
slide.addText('Hello from Artifact Kit', { x: 1, y: 1, w: 8, h: 1 })
await pptx.writeFile({ fileName: 'example.pptx' })
```

## License

AGPL-3.0-or-later, with commercial licenses available for proprietary use
outside AGPL obligations.

This package is based on PptxGenJS by Brent Ely and contributors. The original
PptxGenJS MIT notice is retained in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
