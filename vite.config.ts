import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: '/wolf3d/',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  server: {
    port: 8787,
  },
});
