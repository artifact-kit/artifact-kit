# DeckKit Workbench

Local, disposable human-in-the-loop workbench for PPT screenshot reconstruction workflows.

The default workflow is a single local CLI job. The agent provides an input JSON file and an output JSON file; the workbench starts a local Next.js server, lets the human review/edit in the browser, and writes the reviewed JSON to the output path on every save.

The first workbench is bbox review:

- The left pane shows the full source image.
- Only the active bbox is strongly highlighted.
- Other boxes can be hidden or shown with low opacity.
- The right pane shows the live crop that the current bbox would produce.
- The review notes explain what the bbox is expected to contain.
- Saving writes the output JSON file.

## CLI BBox Review

From the repo root:

```bash
pnpm --filter @artifact-kit/deckkit-workbench bbox-review \
  -i packages/deckkit-workbench/data/projects/example-1-header/project.json \
  -o /tmp/example-1-header-final.json
```

Then open:

```txt
http://127.0.0.1:3000/bbox-review
```

Options:

```txt
-i, --input <file>      Input bbox review JSON
-o, --output <file>     Output JSON written on save/complete
-p, --port <port>       Dev server port, defaults to 3000
--hostname <host>       Dev server hostname, defaults to 127.0.0.1
```

The CLI accepts these input shapes:

- raw bbox review data: `{ imageAssetId, image, elements }`
- session envelope: `{ workbenchType: "bbox-review", data, assets }`
- element manifest: `{ source, image, boxes }`
- existing project fixture shape: `{ sourceImagePath, manifest: { image, boxes }, review }`

Output preserves the input shape where practical:

- project input writes a project-shaped output with updated `manifest.boxes`
- manifest input writes a manifest-shaped output with updated `boxes`
- session envelope input writes an envelope with updated `data`
- raw bbox review data writes raw bbox review data

Clicking `Save area`, `Complete area`, or `Complete review` writes the output file. `Complete review` also marks the job complete and exits the dev server.

## Local Run

The direct dev server is still useful for MCP/session debugging:

```bash
pnpm install
pnpm --filter @artifact-kit/deckkit-workbench dev
```

Then open:

```txt
http://localhost:3000/?id=<session-id>
```

For the current example fixture:

```bash
pnpm --filter @artifact-kit/deckkit-workbench create:example-session
```

## MCP Endpoint

MCP/session mode is retained as an optional control-plane path, but the preferred local human-review path is the CLI single-job mode above.

The workbench exposes an official MCP Streamable HTTP endpoint at:

```txt
GET/POST/DELETE /api/mcp
```

Initial tools:

- `list_workbenches`
- `list_sessions`
- `create_session`
- `get_session`
- `update_session`
- `delete_session`

The MCP layer uses a lightweight workbench registry. Each workbench owns its Zod data schema; session creation stores
the `workbenchType` and validates `data` before saving it.

The intended workflow is:

1. Agent creates an in-memory JSON session through MCP.
2. Agent stops and asks the human to review in the Next.js UI.
3. Human opens `/?id=<session-id>`, the app routes to the matching workbench, and the human saves edits.
4. Agent resumes, pulls the edited data through MCP using the same id, and continues.

HTTP API mirrors the same model:

- `GET /api/workbenches`
- `POST /api/sessions`
- `GET /api/sessions`
- `GET /api/sessions/:id`
- `PUT /api/sessions/:id`
- `DELETE /api/sessions/:id`
- `GET /api/job`
- `PUT /api/job`
- `POST /api/job`

Use `/api/job` only when the server was started by the CLI. It reads `DECKKIT_WORKBENCH_INPUT` and writes `DECKKIT_WORKBENCH_OUTPUT`.

Assets can be passed as refs, for example:

```json
{
  "id": "source",
  "kind": "image",
  "source": "workspace-file",
  "path": "examples/iot-innovation-project/source.png",
  "mimeType": "image/png"
}
```

## Not Done Yet

- Upload UI for arbitrary images.
- Authentication, persistence, or multi-user state.
