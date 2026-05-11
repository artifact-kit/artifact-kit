# Artifact Kit

pnpm workspace for packages published under the `@artifact-kit` npm scope.

## Packages

- `@artifact-kit/deckkit` in `packages/deckkit`
- `@artifact-kit/deckkit-jsx` in `packages/deckkit-jsx`

## Common Commands

```bash
pnpm install
pnpm --filter @artifact-kit/deckkit build
pnpm --filter @artifact-kit/deckkit publish --access public
pnpm --filter @artifact-kit/deckkit-jsx build
pnpm --filter @artifact-kit/deckkit-jsx publish --access public
```

## License

Artifact Kit packages are licensed individually:

- `@artifact-kit/deckkit` is AGPL-3.0-or-later, with commercial licenses
  available for proprietary use outside AGPL obligations.
- `@artifact-kit/deckkit-jsx` is MIT licensed.
