import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'



// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      stream: 'stream-browserify', // Alias stream to stream-browserify
    },
  },
  optimizeDeps: {
    include: ['stream'], // Ensure stream is bundled during development
  },
  // Absolute so deep links like /apply/:token and /activate/:token load their assets.
  base: "/",
})

