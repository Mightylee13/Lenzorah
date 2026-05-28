import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  env.VITE_API_BASE = env.VITE_API_BASE || "https://movieapi.gifted.co.ke";
  env.VITE_SPORTSRC_BASE =
    env.VITE_SPORTSRC_BASE || "https://api.sportsrc.org/v2/";
  env.VITE_SPORTAPI_BASE =
    env.VITE_SPORTAPI_BASE || "https://api.sportapi.ai/v1";

  console.log(env.VITE_API_KEY);

  // ── CDN proxy plugin ────────────────────────────────────────────────────────
  // Handles GET /cdn-proxy?url=<encoded> → pipes CDN video back to browser
  // with spoofed Referer so the CDN accepts the request.
  const cdnProxyPlugin = {
    name: "cdn-proxy",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/cdn-proxy", (req, res) => {
        // Vite strips the middleware path prefix, leaving "/?url=..." or "?url=..."
        const rawPath = req.url ?? "";
        const qIndex = rawPath.indexOf("?");
        const qs = qIndex >= 0 ? rawPath.slice(qIndex + 1) : rawPath;
        const params = new URLSearchParams(qs);
        const rawUrl = params.get("url");

        if (!rawUrl) {
          res.writeHead(400);
          res.end("Missing ?url= parameter");
          return;
        }

        let target;
        try {
          target = new URL(decodeURIComponent(rawUrl));
        } catch {
          res.writeHead(400);
          res.end("Invalid URL");
          return;
        }

        const lib = target.protocol === "https:" ? https : http;

        const options = {
          hostname: target.hostname,
          port: target.port || (target.protocol === "https:" ? 443 : 80),
          path: target.pathname + target.search,
          method: "GET",
          headers: {
            ...(req.headers["range"] ? { Range: req.headers["range"] } : {}),
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: "https://movieapi.gifted.co.ke/",
            Origin: "https://movieapi.gifted.co.ke",
            Host: target.host,
          },
        };

        const proxyReq = lib.request(options, (proxyRes) => {
          const status = proxyRes.statusCode || 200;
          console.log(
            "[cdn-proxy] upstream status:",
            status,
            "for",
            target.hostname + target.pathname.slice(0, 40),
          );
          const headers: Record<string, string> = {
            "Content-Type":
              (proxyRes.headers["content-type"] as string) || "video/mp4",
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
          };
          if (proxyRes.headers["content-length"]) {
            headers["Content-Length"] = proxyRes.headers[
              "content-length"
            ] as string;
          }
          if (proxyRes.headers["content-range"]) {
            headers["Content-Range"] = proxyRes.headers[
              "content-range"
            ] as string;
          }
          res.writeHead(status, headers);
          proxyRes.pipe(res, { end: true });
        });

        proxyReq.on("error", (err) => {
          console.error("[cdn-proxy] error:", err.message);
          if (!res.headersSent) {
            res.writeHead(502);
            res.end("Upstream error");
          }
        });

        req.on("close", () => proxyReq.destroy());
        proxyReq.end();
      });
    },
  };

  return {
    plugins: [react(), tailwindcss(), cdnProxyPlugin],

    resolve: {
      alias: {
        "@": path.resolve(rootDir, "./src"),
      },
    },

    define: {
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV),
    },

    server: {
      host: "0.0.0.0",
      port: 5173,
      hmr: process.env.DISABLE_HMR !== "true",
      watch: process.env.DISABLE_HMR === "true" ? null : {},

      proxy: {
        "/api": {
          target: env.VITE_API_BASE,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("Authorization", `Bearer ${env.VITE_API_KEY}`);
              proxyReq.removeHeader("origin");
              proxyReq.removeHeader("referer");
            });
          },
        },
        "/api-sportsrc": {
          target: env.VITE_SPORTSRC_BASE,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-sportsrc/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (env.VITE_SPORTSRC_KEY) {
                proxyReq.setHeader("X-API-KEY", env.VITE_SPORTSRC_KEY);
              }
              proxyReq.removeHeader("origin");
              proxyReq.removeHeader("referer");
            });
          },
        },
        "/api-sportapi": {
          target: env.VITE_SPORTAPI_BASE,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api-sportapi/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (env.VITE_SPORTAPI_KEY) {
                proxyReq.setHeader("X-API-Key", env.VITE_SPORTAPI_KEY);
              }
              proxyReq.removeHeader("origin");
              proxyReq.removeHeader("referer");
            });
          },
        },
      },
    },

    preview: {
      host: "0.0.0.0",
      port: Number(process.env.PORT) || 4173,
      allowedHosts: ["lenzorah.onrender.com"],
    },

    build: {
      sourcemap: mode === "development",
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            query: ["@tanstack/react-query"],
            motion: ["motion"],
          },
        },
      },
    },

    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "motion",
        "lucide-react",
      ],
    },
  };
});
