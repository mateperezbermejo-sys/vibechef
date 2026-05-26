import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Middleware plugin: serves /ort-wasm/*.mjs as raw JS, bypassing Vite's module transform
const ortWasmPlugin = {
  name: 'ort-wasm-raw-mjs',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0] ?? ''
      if (url.startsWith('/ort-wasm/') && url.endsWith('.mjs')) {
        const filePath = path.join(process.cwd(), 'public', url)
        if (fs.existsSync(filePath)) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
          fs.createReadStream(filePath).pipe(res)
          return
        }
      }
      next()
    })
  },
}

export default defineConfig({
  plugins: [react(), ortWasmPlugin],
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
})
