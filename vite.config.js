import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env so we can read VITE_FETCHLAYER_API_KEY inside the config
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // ── FetchLayer Reddit API ──────────────────────────────────────────
        // Proxied to keep the API key out of the browser bundle.
        // Only Authorization is injected here — Content-Type must come from
        // the client fetch() call so http-proxy can forward the POST body
        // without header conflicts.
        "/fetchlayer": {
          target: "https://api.fetchlayer.dev",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/fetchlayer/, ""),
          headers: {
            Authorization: `Bearer ${env.VITE_FETCHLAYER_API_KEY ?? ""}`,
          },
        },
      },
    },
  };
});
