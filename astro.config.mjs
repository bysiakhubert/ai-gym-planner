// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: {
    // eslint-disable-next-line no-undef
    port: process.env.NODE_ENV === "test" ? 4321 : 3000,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: cloudflare({ sessionKVBindingName: false }),
});
