import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';
import { createApiApp } from './src/server/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPRESS_BACKEND_PREFIXES = ['/api/auth', '/api/sales'];

function isExpressBackendRoute(url?: string): boolean {
  if (!url) return false;
  return EXPRESS_BACKEND_PREFIXES.some(
    (prefix) => url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)
  );
}

function backendApiPlugin(): Plugin {
  const app = createApiApp();
  return {
    name: 'backend-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Narrow bypass: Route /api/auth and /api/sales to the standalone Express backend on port 4000
        if (isExpressBackendRoute(req.url)) {
          return next();
        }
        app(req as any, res as any, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (isExpressBackendRoute(req.url)) {
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
        '/api/sales': {
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
        '/api/sales': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  };
});
