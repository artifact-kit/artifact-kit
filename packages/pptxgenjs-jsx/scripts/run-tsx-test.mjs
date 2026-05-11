import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const cwd = process.cwd();
const entryArg = process.argv[2];

if (!entryArg) {
  console.error("Usage: node scripts/run-tsx-test.mjs <test-file.tsx>");
  process.exit(1);
}

const entry = path.resolve(cwd, entryArg);
const outDir = path.resolve(cwd, ".tsx-runner");
const outFileName = `${path.basename(entry, path.extname(entry))}-${Date.now()}.mjs`;
const outFile = path.join(outDir, outFileName);

await mkdir(outDir, { recursive: true });

await build({
  configFile: false,
  root: cwd,
  publicDir: false,
  resolve: {
    alias: [
      { find: "@artifact-kit/pptxgenjs-jsx/jsx-runtime", replacement: path.resolve(cwd, "src/jsx-runtime.ts") },
      { find: "@artifact-kit/pptxgenjs-jsx/jsx-dev-runtime", replacement: path.resolve(cwd, "src/jsx-runtime.ts") },
      { find: "@artifact-kit/pptxgenjs-jsx", replacement: path.resolve(cwd, "src/index.ts") },
    ],
  },
  build: {
    ssr: entry,
    outDir,
    emptyOutDir: false,
    target: "node20",
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: outFileName,
      },
    },
  },
});

await import(pathToFileURL(outFile).href);
