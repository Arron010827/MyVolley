// lib/supabase.ts
// This file is for CLIENT-SIDE usage — runs in the browser.
// Use this in components that have "use client" at the top.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
