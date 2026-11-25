import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  // Relative assets support both username.github.io/repository/ and custom domains.
  base: './',
  plugins: [react(), tailwindcss()],
  server: { watch: { ignored: ['**/.tools/**', '**/test-results/**', '**/*.xlsx', '**/*.pdf'], followSymlinks: false } },
});
