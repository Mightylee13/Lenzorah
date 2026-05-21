import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  /**
   * Load all env variables
   */
  const env = loadEnv(mode, process.cwd(), '');

  // Fallback for local development
  env.VITE_API_BASE = env.VITE_API_BASE || 'https://movieapi.gifted.co.ke';

console.log(env.VITE_API_KEY);

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },

    /**
     * Environment variables exposed to client
     * ONLY expose variables prefixed with VITE_
     */
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV),
    },

    server: {
      host: '0.0.0.0',
      port: 5173,

      /**
       * HMR Handling
       */
      hmr: process.env.DISABLE_HMR !== 'true',

      watch: process.env.DISABLE_HMR === 'true' ? null : {},

      /**
       * API Proxy
       */
      proxy: {
        '/api': {
          target: env.VITE_API_BASE,

          changeOrigin: true,

          secure: false,

          /**
           * Remove /api prefix if needed
           * Uncomment ONLY if endpoint breaks
           */

          // rewrite: (path) =>
          //   path.replace(/^\/api/, '/api'),

          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              /**
               * Inject API Key securely
               */

              proxyReq.setHeader(
                'Authorization',
                `Bearer ${env.VITE_API_KEY}`,
              );

              /**
               * Reduce CORS issues
               */

              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
      },
    },

    /**
     * Build optimizations
     */
    build: {
      sourcemap: mode === 'development',

      chunkSizeWarningLimit: 1200,

      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],

            query: ['@tanstack/react-query'],

            motion: ['motion'],
          },
        },
      },
    },

    /**
     * Optimize dependencies
     */
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'motion',
        'lucide-react',
      ],
    },
  };
});
