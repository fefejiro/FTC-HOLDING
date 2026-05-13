declare module '@supabase/ssr' {
  type Cookie = {
    name: string;
    value: string;
    options?: Record<string, unknown>;
  };

  type CookieMethods = {
    getAll(): Cookie[];
    setAll(cookiesToSet: Cookie[]): void;
  };

  export function createServerClient<T = any>(
    supabaseUrl: string,
    supabaseKey: string,
    options: { cookies: CookieMethods },
  ): T;

  export function createBrowserClient<T = any>(
    supabaseUrl: string,
    supabaseKey: string,
  ): T;
}
