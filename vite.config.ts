import stylex from "@stylexjs/unplugin";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: [
    stylex.vite({
      dev: command === "serve",
      runtimeInjection: false,
      useCSSLayers: true,
    }),
  ],
  server: { host: "127.0.0.1" },
}));
