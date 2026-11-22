import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';
import { createApiApp } from './src/server/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function backendApiPlugin(): Plugin {
  const app = createApiApp();
  return {
    name: 'backend-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Narrow bypass: Route /api/auth to the standalone Express backend on port 4000
        if (req.url && req.url.startsWith('/api/auth')) {
          return next();
        }
        app(req as any, res as any, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api/auth')) {
          return next();
        }
        app(req as any, res as any, next);
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss() , backendApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api/auth': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/resto_db*.json', '**/src/data/resto_db*.json'],
      },
    },
    preview: {
      proxy: {
        '/api/auth': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  };
});
