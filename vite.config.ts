/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const crmProxyTarget = process.env.VITE_CRM_PROXY_TARGET || 'https://api-dev-honmqtebqa-uc.a.run.app'
const isLocalCrmProxy = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(crmProxyTarget)
const crmProxyOrigin = process.env.VITE_CRM_PROXY_ORIGIN
const crmProxyHeaders = crmProxyOrigin ? { Origin: crmProxyOrigin } : undefined

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            'babel-plugin-styled-components',
            {
              displayName: true,
              fileName: true,
            },
          ],
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/crm': {
        target: crmProxyTarget,
        changeOrigin: true,
        secure: !isLocalCrmProxy,
        headers: crmProxyHeaders,
      },
      '/cabinet': {
        target: crmProxyTarget,
        changeOrigin: true,
        secure: !isLocalCrmProxy,
        headers: crmProxyHeaders,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
