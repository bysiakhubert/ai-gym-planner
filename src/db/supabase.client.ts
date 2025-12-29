import { createClient, type SupabaseClient as SupabaseClientGeneric } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";

import type { Database } from "../db/database.types.ts";

export const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

export type SupabaseClient = SupabaseClientGeneric<Database>;

export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";
