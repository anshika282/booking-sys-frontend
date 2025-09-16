import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwind from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  css: {
    postcss: {
      plugins: [tailwind(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        // Entry for the main Admin Dashboard App
        app: resolve(__dirname, 'index.html'),
        // Entry for the Iframe Booking App
        iframe: resolve(__dirname, 'iframe.html'),
        // Entry for the embeddable SDK script
        sdk: resolve(__dirname, 'src/sdk.js'),
      },
      output: {
        // Configure output filenames
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'sdk') {
            return 'widget.js' // Output the SDK as widget.js
          }
          return 'assets/[name]-[hash].js'
        },
      },
    },
  },
})
