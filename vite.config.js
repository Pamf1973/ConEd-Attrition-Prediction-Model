import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/buildings.json": "http://localhost:3001",
      "/buildingEnrichment.json": "http://localhost:3001",
      "/yearly.json": "http://localhost:3001",
    },
  },
})
