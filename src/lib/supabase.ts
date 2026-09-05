export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const ACCESS_TOKEN_KEY = "wedding-admin-access-token";
const REFRESH_TOKEN_KEY = "wedding-admin-refresh-token";
let refreshInFlight: Promise<string | null> | null = null;

async function refreshSupabaseSession(): Promise<string | null> {
  if (!isSupabaseConfigured || typeof window === "undefined") return null;
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return null;
      const session = await response.json() as { access_token?: string; refresh_token?: string };
      if (!session.access_token) return null;
      sessionStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
      if (session.refresh_token) sessionStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
      return session.access_token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function requestSupabase<T>(table: string, options: {
  method?: string;
  query?: string;
  body?: unknown;
  token?: string;
  prefer?: string;
}, tokenOverride?: string): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const isRead = method === "GET" || method === "HEAD";
  return fetch(`${SUPABASE_URL}/rest/v1/${table}${options.query ? `?${options.query}` : ""}`, {
    method,
    cache: isRead ? "no-store" : "default",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${tokenOverride || options.token || SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
      ...(isRead ? { "Cache-Control": "no-cache" } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

export async function supabaseRest<T>(
  table: string,
  options: {
    method?: string;
    query?: string;
    body?: unknown;
    token?: string;
    prefer?: string;
  } = {},
): Promise<T> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");

  let response = await requestSupabase<T>(table, options);

  if (response.status === 401 && options.token) {
    const refreshedToken = await refreshSupabaseSession();
    if (refreshedToken) response = await requestSupabase<T>(table, options, refreshedToken);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function supabaseAuthPassword(email: string, password: string) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error("Invalid email or password.");
  return response.json() as Promise<{ access_token: string; refresh_token: string; user: { id: string; email?: string } }>;
}
