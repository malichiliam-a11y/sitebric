import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: {
        // 30 days — keeps people signed in instead of falling back
        // to a short-lived default session.
        maxAge: 60 * 60 * 24 * 30,
      },
    }
  );
}
