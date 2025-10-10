import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// Use dynamic import for ES modules
const tailwindcss = async () => {
  const { default: plugin } = await import("@tailwindcss/vite");
  return plugin();
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: {
      plugins: [], // @tailwindcss/vite handles this now
    },
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: undefined,
      },
    },
    commonjsOptions: {
      include: [/react-helmet-async/, /node_modules/],
    },
  },
  optimizeDeps: {
    include: ['react-helmet-async'],
  },
});
