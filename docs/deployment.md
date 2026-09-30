# Production Deployment & Hosting Guide

## 1. Overview

RestoControl is architected as a modern, static Single Page Application (SPA). The compiled output consists entirely of optimized HTML, CSS, JavaScript, and static assets with zero server-side rendering (SSR) runtime dependencies. It can be hosted on any static hosting platform, content delivery network (CDN), or containerized web server (e.g. Nginx, Apache, Cloudflare Pages, Vercel, Netlify).

> [!NOTE]
> This document specifies deployment readiness, configuration standards, and deployment procedures. Deployment has NOT yet been executed.

---

## 2. Generating the Production Build

Generate the production bundle using Vite:

```bash
npm run build
```

This compiles optimized assets into the `dist/` directory:

| Asset | Typical Size | Gzip Size | Purpose |
| :--- | :--- | :--- | :--- |
| `dist/index.html` | ~0.94 kB | ~0.43 kB | Root HTML entry point |
| `dist/assets/index-*.css` | ~64.5 kB | ~11.3 kB | Minified Tailwind CSS bundle & print media rules |
| `dist/assets/index-*.js` | ~552 kB | ~149.3 kB | Bundled application JavaScript (React 19 + modules) |

---

## 3. Local Production Preview

To test and verify the compiled production bundle locally before deploying to remote infrastructure:

```bash
npm run preview
```

Vite will serve the contents of `dist/` at `http://localhost:4173/` (or the configured preview port).

---

## 4. SPA Routing & Fallback Configuration

Because RestoControl uses client-side routing via React Router DOM (`BrowserRouter`), all incoming HTTP requests to deep URLs (e.g. `/pos`, `/orders`, `/menu`, `/tables`, `/sales`, `/reports`, `/settings`, `/customer`, `/menu/:tableId`) must be rewritten to serve `index.html`.

### A. Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-restaurant-domain.com;
    root /var/www/restocontrol/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip compression for fast terminal load
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

### B. Apache Configuration (`.htaccess`)
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### C. Static CDN Platforms (Vercel, Netlify, Cloudflare Pages)
- **Netlify**: Add a `_redirects` file in `public/`:
  ```
  /*    /index.html   200
  ```
- **Vercel**: Add `vercel.json` in the project root:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

---

## 5. Environment Variables & Hosting Requirements

### Environment Variables
- **Core Application**: **No environment variables are required** to run or build the frontend application.
- **Optional Integrations**: An `.env.example` template is provided for optional extensions (e.g. `GEMINI_API_KEY`, `APP_URL`).

### Hosting Requirements
- Any static HTTP server capable of serving static files (HTML, JS, CSS, SVG, PNG).
- HTTPS / TLS 1.3 certificate enabled to ensure secure POS terminal communications and camera permissions for table QR scanning.

---

## 6. Pre-Deployment Verification Checklist

Before deploying the build to production:
1. **Type Checking**: Verify `npm run lint` passes with 0 errors (`tsc --noEmit`).
2. **Build Success**: Verify `npm run build` completes cleanly without broken asset references.
3. **Automated Tests**: Verify all 21 test suites pass (`for f in $(find src -name "*.test.ts" | sort); do npx tsx "$f"; done`).
4. **Clean Production Baseline**: Verify `src/App.tsx` initializes with empty lists (`menuItems: []`, `staffList: []`, `transactions: []`, `orders: []`) and 8 standard dining tables, keeping test fixtures strictly isolated in `src/data/mockData.ts`.
5. **Print Media Isolation**: Verify 80mm thermal receipt printing uses clean `@media print` rules without printing sidebar navigation or controls.
