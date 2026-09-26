# Production Deployment & Hosting Guide

## 1. Overview

RestoControl is designed as a modern, static Single Page Application (SPA). The compiled output consists entirely of optimized HTML, CSS, JavaScript, and static assets with zero server-side rendering (SSR) runtime dependencies. It can be hosted on any static hosting platform, content delivery network (CDN), or containerized web server.

---

## 2. Generating the Production Build

Generate the production bundle using Vite:

```bash
npm run build
```

This compiles optimized assets into the `dist/` directory:

| Asset | Typical Size | Gzip Size | Purpose |
| :--- | :--- | :--- | :--- |
| `dist/index.html` | ~0.9 kB | ~0.4 kB | Root HTML entry point |
| `dist/assets/index-*.css` | ~54.7 kB | ~9.8 kB | Minified Tailwind CSS bundle |
| `dist/assets/index-*.js` | ~451.3 kB | ~123.8 kB | Bundled application JavaScript (React + modules) |

---

## 3. Local Production Preview

To test and verify the compiled production bundle locally before deploying:

```bash
npm run preview
```

Vite will serve the contents of `dist/` at `http://localhost:4173/`.

---

## 4. SPA Routing & Fallback Configuration

Because RestoControl uses client-side routing via React Router DOM (`createBrowserRouter` / `BrowserRouter`), all incoming HTTP requests to deep URLs (e.g. `/pos`, `/menu`, `/sales`, `/customer`) must be rewritten to serve `index.html`.

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
- **Vercel**: Add `vercel.json` in the root:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

---

## 5. Security & Production Checklist

Before going live:
1. **Error Boundary**: Ensure a top-level React Error Boundary is implemented to catch and isolate unhandled runtime render exceptions.
2. **Backend Authentication**: Replace the client-side mock authentication store (`src/auth/auth.store.ts`) with a secure backend API delivering JWTs via HttpOnly cookies.
3. **HTTPS / TLS**: Always enforce HTTPS to ensure session integrity and prevent man-in-the-middle attacks on restaurant POS stations.
4. **Content Security Policy (CSP)**: Configure appropriate CSP headers on the web server to restrict script execution and style origins.
