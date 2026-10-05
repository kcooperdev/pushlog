import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    react(),
    crx({
      manifest,
      contentScripts: {
        standaloneFiles: ['src/content/content.ts', 'src/content/inject.ts'],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
  build: {
    sourcemap: true,
  },
})
