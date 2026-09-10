import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Xiaomi's MI Browser can lag behind Chrome even on the same Android
  // device. Compile public preview links to a conservative target so the
  // generated bundle does not depend on newer browser syntax.
  build: {
    target: 'es2018',
  },
})
