import { build } from "vite";

await build({
  configFile: false,
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        "deckkit-jsx": "src/index.ts",
        "jsx-runtime": "src/jsx-runtime.ts",
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "es.js" : "cjs"}`,
    },
    rollupOptions: {
      external: ["@artifact-kit/deckkit"],
    },
  },
});
