# OfficeLink Next

PowerPoint taskpane add-in served by Next.js Pages Router over local HTTPS.

## Development

```bash
pnpm dev
```

The dev server runs at `https://localhost:3000` using explicit HTTPS certificate files from `.certs/`.
The Office taskpane entry is `https://localhost:3000/taskpane`.

To provide custom certificate paths:

```bash
node server.mjs --ca ./ca.crt --key ./localhost.key --cert ./localhost.crt
```

The server also accepts `OFFICELINK_CA`, `OFFICELINK_KEY`, and `OFFICELINK_CERT`.

## Bridge

The taskpane is only a display and Office.js executor. Status is a read-only projection of the current in-flight execution:

```bash
GET /api/bridge/status?since=<updatedAt>
```

Agents execute one Office.js command by posting a code string. The HTTP request waits for the add-in to run it and returns the result or error:

```bash
curl -k -X POST https://localhost:3000/api/bridge/command \
  -H 'Content-Type: application/json' \
  -d '{"code":"return PowerPoint.run(function (context) { return context.sync().then(function () { return { ok: true }; }); });","args":{}}'
```

Agents execute a batch by posting ordered command entries. The add-in runs them sequentially and returns an array of results:

```bash
curl -k -X POST https://localhost:3000/api/bridge/batch \
  -H 'Content-Type: application/json' \
  -d '{"commands":[{"code":"return { ok: true, step: 1 };"},{"code":"return { ok: true, step: 2 };"}]}'
```

Callers cannot set display state. Concurrent requests are accepted into a transparent FIFO transport queue, while the add-in still executes one request at a time.

## PowerPoint Sideload

```bash
pnpm sideload:powerpoint
```

Restart PowerPoint or reload the add-in after updating `manifest.xml`.
