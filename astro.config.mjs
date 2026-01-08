// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: {
    port: process.env.NODE_ENV === 'test' ? 4321 : 3000,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: node({
    mode: "standalone",
  }),
  env: {
    schema: {
      // Supabase configuration - optional for development/testing
      SUPABASE_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
        default: "https://placeholder.supabase.co"
      }),
      SUPABASE_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
        default: "placeholder-key"
      }),
      // OpenRouter AI configuration (optional - validated at runtime when AI is used)
      OPENROUTER_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      SITE_URL: envField.string({
        context: "server",
        access: "public",
        optional: true,
        default: process.env.NODE_ENV === 'test' ? "http://localhost:4321" : "http://localhost:3000",
      }),
    },
  },
});
