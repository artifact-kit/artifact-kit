import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const htmlPath = path.join(root, "examples/attention/exporter.html");
const kit = require(path.join(root, "dist/pptxgenjs-jsx.cjs"));

const html = await fs.readFile(htmlPath, "utf8");
const scriptMatch = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  throw new Error("Could not find the inline Babel script in examples/attention/exporter.html.");
}

const result = ts.transpileModule(scriptMatch[1], {
  compilerOptions: {
    allowJs: true,
    jsx: ts.JsxEmit.React,
    jsxFactory: "pptxElement",
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  reportDiagnostics: true,
});

const diagnostics = result.diagnostics ?? [];
if (diagnostics.length > 0) {
  const message = diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n");
  throw new Error(message);
}

let clickHandler;
const status = { textContent: "" };
const button = {
  disabled: false,
  addEventListener(name, handler) {
    if (name === "click") clickHandler = handler;
  },
};
const document = {
  querySelector(selector) {
    if (selector === "#export-status") return status;
    if (selector === "#export-pptx") return button;
    return null;
  },
};

const sandbox = {
  Array,
  Error,
  JSON,
  Math,
  String,
  console,
  document,
  window: { ArtifactKitPptxGenJsx: kit },
};

vm.createContext(sandbox);
vm.runInContext(result.outputText, sandbox, { filename: "examples/attention/exporter.inline.js" });

if (typeof clickHandler !== "function") {
  throw new Error("Attention example did not register a download click handler.");
}

console.log("Attention browser example syntax verification passed");
