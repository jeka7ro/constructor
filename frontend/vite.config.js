import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
        __BUILD_TIME__: JSON.stringify(new Date().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' })),
    },
    plugins: [
        react(),
    ],
    server: {
        host: true, // Allow external devices (like iPad) to connect for HMR
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            }
        }
    }
})
