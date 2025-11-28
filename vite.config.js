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
  server: {
    // This tells Vite how to handle SPA fallbacks and separate entry points
    historyApiFallback: {
      rewrites: [
        // Rule 1: All Admin/Auth paths use the main index.html
        { from: /^\/(admin|login|signup|set-password)/, to: '/index.html' },

        // CRITICAL FIX: Rule 2: The /booking-flow path MUST use the dedicated iframe.html
        { from: /^\/booking-flow/, to: '/iframe.html' },

        // Rule 3: Catch-all fallback for the main index (Optional, but safe)
        { from: /^\/$/, to: '/index.html' },
      ],
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
