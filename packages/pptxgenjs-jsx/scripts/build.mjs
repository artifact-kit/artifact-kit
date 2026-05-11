import { build } from "vite";

await build({
  configFile: false,
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        "pptxgenjs-jsx": "src/index.ts",
        "jsx-runtime": "src/jsx-runtime.ts",
        measure: "src/measure/index.ts",
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "es.js" : "cjs"}`,
    },
    rollupOptions: {
      external: ["pptxgenjs"],
    },
  },
});

await build({
  configFile: false,
  build: {
    emptyOutDir: false,
    target: "es2020",
    lib: {
      entry: {
        "pptxgenjs-jsx.browser": "src/index.ts",
        "jsx-runtime.browser": "src/jsx-runtime.ts",
        "measure.browser": "src/measure/index.ts",
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.es.js`,
    },
  },
});

await build({
  configFile: false,
  build: {
    emptyOutDir: false,
    target: "es2020",
    lib: {
      entry: "src/index.ts",
      name: "ArtifactKitPptxGenJsx",
      formats: ["iife"],
      fileName: () => "pptxgenjs-jsx.browser.iife.js",
    },
  },
});
