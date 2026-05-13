# examples/1 bbox work

Source: `examples/1.png` (1672 x 941 px)

Generated artifacts:

- `overlay-boxes-v1.png`: first visual pass bbox overlay.
- `overlay-boxes-final.png`: refined bbox overlay after crop review.
- `contact-boxes-v1.png`: first-pass crop contact sheet.
- `contact-boxes-final.png`: refined crop contact sheet.
- `crops/boxes-final/*.png`: final crops for each semantic element.
- `compare/*.png`: before/after crop pairs for boxes changed by the loop.
- `overlay-header-final.png`: refined header-only bbox overlay.
- `contact-header-final.png`: refined header-only crop contact sheet.

The current element level intentionally includes large sections, grouped header labels, individual title text, icon/text header parts, content rows, architecture boxes, cards, and the footer. It does not yet split every paragraph line or every small icon inside cards.

Run a focused pass with:

```bash
node examples/1-bbox-work/scripts/render-bboxes.mjs header-v1 header-final
```
