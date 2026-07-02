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
    watch: {
      ignored: ["**/.venv/**", "**/__pycache__/**", "**/analysis/**"],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/recharts")) {
            return "vendor-recharts";
          }
        },
      },
    },
  },
})
