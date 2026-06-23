import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import createHtmlPlugin from "vite-plugin-simple-html";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

/**
 * Desktop Vite config — my-jarvis-os in SQLite mode inside Tauri.
 * CRM data: Express SQLite server on :3001 (proxied via /api)
 * Chat/AI: Agent sidecar on :10000 (called directly by chatUrl)
 */
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          mainScript: `src/main.sqlite.tsx`,
        },
      },
    }),
  ],
  // SQLite mode: override Supabase env vars at compile time
  define: {
    "import.meta.env.VITE_APP_MODE": JSON.stringify("sqlite"),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(""),
    "import.meta.env.VITE_SB_PUBLISHABLE_KEY": JSON.stringify(""),
  },
  esbuild: {
    keepNames: true,
  },
  optimizeDeps: {
    include: [
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom/client",
      "ra-core",
      "react-router",
      "react-router-dom",
      "@tanstack/react-query",
      "@tanstack/react-query-persist-client",
      "@tanstack/query-async-storage-persister",
      "lucide-react",
      "ra-i18n-polyglot",
      "ra-language-english",
      "ra-supabase-language-english",
      "ra-supabase-core",
      "react-error-boundary",
      "react-hook-form",
      "date-fns",
      "lodash",
      "sonner",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "inflection",
      "query-string",
      "dompurify",
      "marked",
      "cmdk",
      "vaul",
      "@streamparser/json-whatwg",
      "@supabase/supabase-js",
    ],
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    // Proxy CRM data requests to SQLite Express server
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
