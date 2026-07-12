import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
let commitCount = '1000';
try {
    commitCount = execSync('git rev-list --count HEAD').toString().trim();
} catch (e) {
    // Ignore error
}

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(`${pkg.version}.${commitCount}`),
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
