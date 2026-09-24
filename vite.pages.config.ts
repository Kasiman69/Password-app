import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// configure-pages supplies the actual path, including custom-domain support.
const path = process.env.PAGES_BASE_PATH ?? "";
if (path && (!path.startsWith("/") || path.includes("..") || /[?#\\]/.test(path))) {
  throw new Error("PAGES_BASE_PATH must be a URL path such as /my-repository.");
}
const base = path.replace(/\/$/, "") + "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  build: { outDir: "pages-dist", emptyOutDir: true },
});
