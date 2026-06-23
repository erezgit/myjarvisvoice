import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SB_PUBLISHABLE_KEY;

// Guard: don't create a real client if env vars aren't set (e.g. SQLite mode).
// This prevents WebSocket connection attempts to a non-existent Supabase instance.
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : createClient("http://localhost:0", "dummy-key-for-module-init");
