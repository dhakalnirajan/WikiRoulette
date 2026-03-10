import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url"; // Modern way to handle paths in ESM

export default defineConfig({
  base: "/wikiroulette/",
  plugins: [vue()],
  resolve: {
    alias: {
      // This achieves the same thing as resolve(__dirname, "src")
      // but is more compatible with modern ES Modules
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
