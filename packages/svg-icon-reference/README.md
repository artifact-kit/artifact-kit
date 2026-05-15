# SVG Icon Reference

Generates skill-friendly SVG reference bundles from local icon libraries.

Lucide is the first supported source. The package can hold additional library-specific generators later, but this generator intentionally only supports Lucide's current metadata layout.

```sh
pnpm --filter @artifact-kit/svg-icon-reference generate:lucide
```

Lucide output:

- `dist/icons/*.svg`: copied Lucide SVG files
- `dist/lucide-icons.jsonl`: one JSON object per line

Each JSONL row has this shape:

```json
{"name":"a-arrow-down.svg","key_words":["letter","font size","text","formatting","smaller","design"]}
```

`name` points to a file in `dist/icons`. `key_words` is built from the source icon JSON `tags` plus `categories`, with duplicates removed.

Optional flags:

```sh
node src/generate-lucide-reference.mjs --source ../../references/lucide/icons --out dist
```
