import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/pptxgen.ts',
      formats: ['es', 'cjs'],
      fileName: format => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    minify: false,
    sourcemap: true,
    target: 'node18',
    rollupOptions: {
      external: [/^node:/, 'jszip'],
      output: {
        exports: 'default',
      },
    },
  },
})
