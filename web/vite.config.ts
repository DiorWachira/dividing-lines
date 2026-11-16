import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works on GitHub Pages under /dividing-lines/
// and from any static host. Routing is hash-based, so no server rewrites needed.
export default defineConfig({
  base: './',
  plugins: [react()],
})
