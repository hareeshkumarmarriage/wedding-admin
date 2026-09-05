import { FormEvent, useState } from "react";
import { LogIn, RefreshCw, Sparkles } from "lucide-react";
import AdminControlCenter from "./AdminControlCenterV3";
import { supabaseAuthPassword } from "@/lib/supabase";

const TOKEN_KEY = "wedding-admin-access-token";
const REFRESH_KEY = "wedding-admin-refresh-token";

export default function AdminEntry() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (token) return <AdminControlCenter />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const session = await supabaseAuthPassword(email.trim(), password);
      sessionStorage.setItem(TOKEN_KEY, session.access_token);
      if (session.refresh_token) sessionStorage.setItem(REFRESH_KEY, session.refresh_token);
      setToken(session.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <form onSubmit={submit} noValidate className="w-full max-w-md rounded-3xl border bg-card p-7 shadow-xl" aria-labelledby="admin-login-title">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground" aria-hidden="true"><Sparkles size={22}/></div>
          <div><div className="font-semibold">Wedding Admin</div><div className="text-sm text-muted-foreground">Secure administration center</div></div>
        </div>
        <h1 id="admin-login-title" className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Administrator access is required.</p>
        {error && <div role="alert" aria-live="assertive" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <label className="mt-6 block text-sm font-medium" htmlFor="admin-email">Email
          <input id="admin-email" name="email" autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/20"/>
        </label>
        <label className="mt-4 block text-sm font-medium" htmlFor="admin-password">Password
          <input id="admin-password" name="password" autoComplete="current-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/20"/>
        </label>
        <button type="submit" disabled={busy} aria-busy={busy} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {busy ? <RefreshCw className="animate-spin" size={16}/> : <LogIn size={16}/>} {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
