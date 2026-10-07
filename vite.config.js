import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative asset URLs work on both the GitHub Pages project path and custom-domain root.
export default defineConfig({
  plugins: [react()],
  base: './',
})
