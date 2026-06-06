import { useState } from "react";

export default function Login({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) {
      setError("Please enter the password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onLogin(data.token);
    } catch (err) {
      setError(err.message ?? "Invalid password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-dvh bg-slate-950 overflow-hidden font-sans">
      {/* Decorative ambient glowing backdrops */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md px-6 py-12">
        <div className="backdrop-blur-lg bg-slate-900/75 border border-slate-800/80 rounded-2xl p-8 shadow-2xl shadow-slate-950/50">
          
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20 text-white font-black text-lg mb-4 select-none">
              ⚡
            </div>
            <span className="block text-xs font-bold text-orange-400 tracking-widest uppercase mb-1">
              Con Edison
            </span>
            <h2 className="text-xl font-extrabold text-slate-100 leading-tight">
              Steam Operations
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              Attrition Intelligence & Decision-Support Platform
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
              >
                Access Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                disabled={loading}
                placeholder="Enter dashboard password…"
                className={`w-full px-4 py-3 text-sm text-slate-100 placeholder-slate-600 bg-slate-950/60 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  error 
                    ? "border-red-500/50 focus:ring-red-500/30" 
                    : "border-slate-800 focus:border-orange-500/50 focus:ring-orange-500/20"
                }`}
              />
              {error && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5 animate-pulse">
                  <span>⚠</span> {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 text-white text-sm font-bold shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 hover:from-orange-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Authenticating…</span>
                </div>
              ) : (
                <span>Access Dashboard</span>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-slate-800/40 text-center">
            <span className="inline-block text-[10px] text-slate-600 px-2 py-0.5 rounded border border-slate-800 bg-slate-950/20">
              Access Restricted · Authorized Personnel Only
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
