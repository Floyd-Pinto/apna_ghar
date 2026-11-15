import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import basicSsl from "@vitejs/plugin-basic-ssl";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  // Where the dev server forwards /api, /media and /ipfs (Django, or Docker's "backend" service)
  const backend = env.VITE_PROXY_TARGET || "http://localhost:8000";
  const ipfsGateway = env.VITE_IPFS_GATEWAY_TARGET || "http://localhost:8081";
  // HTTPS is needed for the phone camera (QR scanning / site photo capture) over the LAN
  const https = env.VITE_HTTPS === "true";

  const toBackend = { target: backend, changeOrigin: false, xfwd: true };

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": toBackend,
        "/media": toBackend,
        "/accounts": toBackend,
        "/ipfs": { target: ipfsGateway, changeOrigin: true },
      },
    },
    plugins: [react(), https && basicSsl()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
