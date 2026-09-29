import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relative : fonctionne sur GitHub Pages quel que soit le nom du dépôt
export default defineConfig({
  base: './',
  plugins: [react()],
})
