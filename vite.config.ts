import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  worker: { format: 'es' },
  plugins: [react(), {
    name: 'release-content-policy', apply: 'build',
    transformIndexHtml() { return [{ tag: 'meta', attrs: {
      'http-equiv': 'Content-Security-Policy',
      content: "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'"
    }, injectTo: 'head-prepend' }]; }
  }],
  base: './', server: { host: '127.0.0.1', port: 5173, strictPort: true }
});
