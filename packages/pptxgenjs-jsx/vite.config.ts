import { defineConfig } from "vite";

export default defineConfig({
  build: {
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
