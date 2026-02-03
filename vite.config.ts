import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr' // <-- ADD THIS LINE

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr() // <-- ADD THIS LINE
  ],
});
