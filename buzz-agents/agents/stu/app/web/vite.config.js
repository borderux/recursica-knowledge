import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // `npm run dev` serves the UI; the API still lives on the Node server holding the key.
    proxy: { '/api': 'http://127.0.0.1:4317' },
  },
})
