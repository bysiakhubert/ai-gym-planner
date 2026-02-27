/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user: {
        id: string;
        email: string | undefined;
      } | null;
    }
  }
}

// Environment variables accessed via import.meta.env.* (Cloudflare runtime compatible)
