# Deferred Permission Tasks

These were intentionally not run while implementing the first workbench slice.

## Dependency Install

Required before typecheck/build/dev server:

```bash
pnpm install
```

This will update `pnpm-lock.yaml` for the new `@artifact-kit/deckkit-workbench` package and install Next.js/React dependencies.

## Typecheck

Run after install:

```bash
pnpm --filter @artifact-kit/deckkit-workbench typecheck
```

## Start Local Workbench

Run after install:

```bash
pnpm --filter @artifact-kit/deckkit-workbench dev
```

Then open:

```txt
http://localhost:3000/bbox-review?id=<session-id>
```

## MCP Registration

The app currently exposes an HTTP JSON-RPC MCP-style endpoint:

```txt
POST http://localhost:3000/api/mcp
```

Registering it in `~/.codex/config.toml` was not done. The likely config should be added only after the server is running and the exact transport mode is confirmed.

## Smoke Calls

After the server starts, verify MCP-style tool listing:

```bash
curl -sS http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Then verify generic session read:

```bash
curl -sS http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_session","arguments":{"id":"example-1-header"}}}'
```

For the example fixture, initialize an in-memory session first:

```bash
pnpm --filter @artifact-kit/deckkit-workbench create:example-session
```
