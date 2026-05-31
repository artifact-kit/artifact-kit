---
name: officelink-powerpoint-public
description: Minimal quickstart for controlling PowerPoint through OfficeLink by curling the local command and batch endpoints. Use when a model needs the basic protocol for sending Office.js commands to a local PowerPoint add-in bridge.
---

# OfficeLink PowerPoint Public Quickstart

This quickstart shows the basic OfficeLink protocol for sending Office.js commands to PowerPoint through local HTTP requests.

## Base URL

```txt
https://localhost:3000
```

Use `curl -k` because the local server normally uses a development HTTPS certificate.

The Office add-in taskpane must be open in PowerPoint before commands can execute.

## Run One Command

Use `POST /api/bridge/command` to send one Office.js code string.
The HTTP request returns after PowerPoint runs the command.

```bash
curl -sS -k -X POST https://localhost:3000/api/bridge/command \
  -H 'Content-Type: application/json' \
  --data-binary '{"timeoutMs":30000,"code":"return PowerPoint.run(async function (context) { await context.sync(); return { ok: true }; });"}'
```

## Add One Slide With Text

This creates a new slide, selects it, and adds one editable text box.

```bash
curl -sS -k -X POST https://localhost:3000/api/bridge/command \
  -H 'Content-Type: application/json' \
  --data-binary '{"timeoutMs":30000,"code":"return PowerPoint.run(async function (context) { var slides = context.presentation.slides; slides.add(); await context.sync(); slides.load(\"items/id\"); await context.sync(); var slide = slides.items[slides.items.length - 1]; context.presentation.setSelectedSlides([slide.id]); var box = slide.shapes.addTextBox(\"Hello from AI\", { left: 80, top: 80, width: 420, height: 60 }); box.textFrame.textRange.font.size = 28; await context.sync(); return { ok: true, slideId: slide.id }; });"}'
```

## Add A Basic Shape

This adds one editable rectangle on the currently selected slide.

```bash
curl -sS -k -X POST https://localhost:3000/api/bridge/command \
  -H 'Content-Type: application/json' \
  --data-binary '{"timeoutMs":30000,"code":"return PowerPoint.run(async function (context) { var selected = context.presentation.getSelectedSlides(); selected.load(\"items/id\"); await context.sync(); var slide = selected.items[0]; var shape = slide.shapes.addGeometricShape(\"Rectangle\", { left: 120, top: 180, width: 240, height: 96 }); shape.fill.setSolidColor(\"#1F7AEC\"); await context.sync(); return { ok: true, slideId: slide.id }; });"}'
```

## Run Batch

Use `POST /api/bridge/batch` to send multiple command entries.
The bridge runs them sequentially.

```bash
curl -sS -k -X POST https://localhost:3000/api/bridge/batch \
  -H 'Content-Type: application/json' \
  --data-binary '{"timeoutMs":60000,"commands":[{"code":"return PowerPoint.run(async function (context) { await context.sync(); return { ok: true, step: 1 }; });"},{"code":"return PowerPoint.run(async function (context) { await context.sync(); return { ok: true, step: 2 }; });"}]}'
```

## Check Status

```bash
curl -sS -k https://localhost:3000/api/bridge/status
```

## Basic Rules

- Escape double quotes inside the JSON `code` string.
- `command` runs one code string.
- `batch` runs multiple code strings in order.
- Do not call internal taskpane endpoints such as `/api/bridge/next`, `/api/bridge/ack`, or `/api/bridge/respond`.
- Do not send UI state. OfficeLink derives status from current execution.
- This quickstart covers basic connectivity and simple PowerPoint operations.
