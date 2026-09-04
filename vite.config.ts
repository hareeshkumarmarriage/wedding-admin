import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function localApiPlugin(): Plugin {
  const handlers: Record<string, any> = {};

  const loadHandler = async (name: string) => {
    if (!handlers[name]) {
      const moduleUrl = pathToFileURL(path.resolve(__dirname, `./server/api/${name}.js`)).href;
      const mod = await import(moduleUrl);
      handlers[name] = mod.default;
    }
    return handlers[name];
  };

  return {
    name: "local-api-bridge",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "/", "http://localhost");
        const match = url.pathname.match(/^\/api\/([a-z0-9-]+)$/i);
        if (!match) return next();

        const name = match[1];
        const query = Object.fromEntries(url.searchParams.entries());
        const response = res as typeof res & {
          status: (code: number) => typeof res;
          json: (value: unknown) => void;
        };

        response.status = (code: number) => {
          res.statusCode = code;
          return res;
        };
        response.json = (value: unknown) => {
          if (!res.getHeader("Content-Type")) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
          }
          res.end(JSON.stringify(value));
        };

        try {
          const method = String(req.method || "GET").toUpperCase();
          let body: unknown = {};
          if (!["GET", "HEAD"].includes(method)) {
            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(Buffer.from(chunk));
            const raw = Buffer.concat(chunks).toString("utf8");
            if (raw) {
              try { body = JSON.parse(raw); } catch { body = {}; }
            }
          }

          (req as any).body = body;
          (req as any).query = query;
          (req as any).protocol = "http";

          const handler = await loadHandler(name);
          await handler(req, response);
        } catch (error) {
          console.error(`[local-api] /api/${name}`, error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: false, error: "Local API error." }));
          } else {
            res.end();
          }
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "EVENT_UNLOCK_SECRET",
    "GOOGLE_DRIVE_API_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_GOOGLE_DRIVE_API_KEY",
    "VITE_GOOGLE_DRIVE_FOLDER_ID",
  ]) {
    if (env[key] !== undefined) process.env[key] = env[key];
  }

  return {
    server: {
      host: true,
      port: 8080,
      strictPort: true,
    },
    plugins: [react(), localApiPlugin()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
      dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router", "react-router-dom"],
    },
  };
});
