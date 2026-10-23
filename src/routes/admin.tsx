import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Coffee, LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  // Redirect already-authenticated admins straight to the dashboard
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const meta = data.session.user.app_metadata as Record<string, unknown> | undefined;
      if (meta?.["role"] === "admin") {
        throw redirect({ to: "/admin/dashboard" });
      }
    }
  },

  head: () => ({
    meta: [
      { title: "Admin — Sunday & Co." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),

  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !data.session) {
        setError(authError?.message ?? "Login failed. Please check your credentials.");
        return;
      }
      const meta = data.session.user.app_metadata as Record<string, unknown> | undefined;
      if (meta?.["role"] !== "admin") {
        await supabase.auth.signOut();
        setError("Access denied. This area is for administrators only.");
        return;
      }
      await navigate({ to: "/admin/dashboard" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/40 transition";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 px-4">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-green-800/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-900/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        {/* logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <Coffee className="h-7 w-7 text-white" />
          </span>
          <div className="text-center">
            <p className="font-display text-2xl font-semibold text-white">sunday <span className="text-sm italic text-white/50">& co.</span></p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-white/40">Admin</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div>
            <label htmlFor="admin-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-white/60">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-white/60">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-white/15 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
          >
            {loading ? (
              <><LoaderCircle className="h-4 w-4 motion-safe:animate-spin" /> Signing in…</>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
