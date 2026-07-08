// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, relative } from "node:path";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const LOG_FILE = "/tmp/dev-server-logs/parse-errors.log";

function ensureLogDir() {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
  } catch {}
}

/**
 * Captura erros de parse/transform do Vite e imprime arquivo + linha + coluna
 * + trecho do código. Também grava em /tmp/dev-server-logs/parse-errors.log.
 */
function parseErrorReporter(): Plugin {
  const RED = "\x1b[31m";
  const YELLOW = "\x1b[33m";
  const DIM = "\x1b[2m";
  const RESET = "\x1b[0m";

  function format(file: string, line: number, col: number, message: string) {
    const rel = relative(process.cwd(), file);
    const header = `\n${RED}✗ Parse error${RESET} ${rel}:${YELLOW}${line}${RESET}:${YELLOW}${col}${RESET}\n  ${message}`;
    let snippet = "";
    try {
      const lines = readFileSync(file, "utf8").split("\n");
      const start = Math.max(0, line - 3);
      const end = Math.min(lines.length, line + 2);
      const out: string[] = [];
      for (let i = start; i < end; i++) {
        const n = i + 1;
        const marker = n === line ? `${RED}>${RESET}` : " ";
        out.push(`  ${marker} ${DIM}${String(n).padStart(4)}${RESET} │ ${lines[i]}`);
        if (n === line && col > 0) {
          out.push(`         ${DIM}│${RESET} ${" ".repeat(col - 1)}${RED}^${RESET}`);
        }
      }
      snippet = "\n" + out.join("\n");
    } catch {}
    return header + snippet;
  }

  function report(file: string, line: number, col: number, message: string) {
    const text = format(file, line, col, message);
    // eslint-disable-next-line no-console
    console.error(text);
    try {
      ensureLogDir();
      // strip ANSI for the log file
      const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
      appendFileSync(
        LOG_FILE,
        `[${new Date().toISOString()}]${plain}\n`,
        "utf8",
      );
    } catch {}
  }

  return {
    name: "lovable:parse-error-reporter",
    enforce: "pre",
    apply: "serve",
    handleHotUpdate(ctx) {
      // no-op; the plugin reports via transform/buildEnd errors
      return ctx.modules;
    },
    async transform(_code, id) {
      // We don't transform — we just wrap the error if one bubbles up later.
      return null;
    },
    buildStart() {
      // reset session marker
      try {
        ensureLogDir();
        appendFileSync(
          LOG_FILE,
          `\n[${new Date().toISOString()}] --- dev session started ---\n`,
          "utf8",
        );
      } catch {}
    },
    configureServer(server) {
      const originalError = server.config.logger.error.bind(server.config.logger);
      server.config.logger.error = (msg, opts) => {
        const err = opts?.error as any;
        const id: string | undefined = err?.id || err?.loc?.file || err?.file;
        const loc = err?.loc;
        if (id && loc?.line) {
          report(id, loc.line, loc.column ?? 0, err.message || String(msg));
        }
        return originalError(msg, opts);
      };
    },
  };
}

export default defineConfig({
  nitro: { preset: "node-server", serveStatic: true },

  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      parseErrorReporter(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        strategies: "generateSW",
        devOptions: { enabled: false },
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          globPatterns: ["**/*.{js,css,html,svg,ico,woff,woff2}"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html-pages",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.[a-f0-9]{8,}\.(?:js|css|woff2?)$/i.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "hashed-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && (request.destination === "image" || request.destination === "font"),
              handler: "CacheFirst",
              options: {
                cacheName: "media-assets",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        manifest: false,
      }),
    ],
  },
});
