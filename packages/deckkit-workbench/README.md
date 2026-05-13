# DeckKit Workbench

Local, disposable human-in-the-loop workbench for PPT screenshot reconstruction workflows.

The MVP uses in-memory sessions only. Nothing is persisted; closing the server loses the session.
The agent creates a session with a UUID/key, gives the human a page-specific URL like `/bbox-review?id=<session-id>`,
and later reads the edited data back by the same id.

The first slice is bbox review:

- The left pane shows the full source image.
- Only the active bbox is strongly highlighted.
- Other boxes can be hidden or shown with low opacity.
- The right pane shows the live crop that the current bbox would produce.
- The review notes explain what the bbox is expected to contain.
- Saving replaces the generic session `data` JSON.

## Local Run

```bash
pnpm install
pnpm --filter @artifact-kit/deckkit-workbench dev
```

Then open:

```txt
http://localhost:3000/bbox-review?id=<session-id>
```

For the current example fixture:

```bash
pnpm --filter @artifact-kit/deckkit-workbench create:example-session
```

## MCP Endpoint

The workbench exposes a minimal JSON-RPC MCP-style endpoint at:

```txt
POST /api/mcp
```

Initial tools:

- `list_sessions`
- `create_session`
- `get_session`
- `update_session`
- `delete_session`

The MCP layer intentionally does not know about bbox review, SVG review, or any future workbench.
It only stores JSON and asset references.

The intended workflow is:

1. Agent creates an in-memory JSON session through MCP.
2. Agent stops and asks the human to review in the Next.js UI.
3. Human opens `/bbox-review?id=<session-id>`, edits bbox coordinates, and saves.
4. Agent resumes, pulls the edited data through MCP using the same id, and continues.

HTTP API mirrors the same model:

- `POST /api/sessions`
- `GET /api/sessions`
- `GET /api/sessions/:id`
- `PUT /api/sessions/:id`
- `DELETE /api/sessions/:id`

Assets can be passed as refs, for example:

```json
{
  "id": "source",
  "kind": "image",
  "source": "workspace-file",
  "path": "examples/1.png",
  "mimeType": "image/png"
}
```

## Not Done Yet

- Registering this Next.js app as an MCP server in `~/.codex/config.toml`.
- Upload UI for arbitrary images.
- Authentication, persistence, or multi-user state.
