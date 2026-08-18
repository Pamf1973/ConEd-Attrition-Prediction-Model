import { useState, useRef, useEffect } from "react";
import "./LoginForm.css";

/**
 * LoginForm — workflow-native auth surface (D20).
 *
 * Replaces the /legacy hop for the new build. Same POST /api/auth/login
 * contract as legacy's Login component, including 429 Retry-After parsing.
 * On success, writes sessionStorage.coned_token and calls onLogin(token).
 *
 * Voice per system-v1.1.md §1/§3: workbench-honest, no marketing chrome.
 * Composition sketched 2026-08-18; visual refinement bundled with the
 * deferred nav/motion pass.
 */
export default function LoginForm({ onLogin, surfaceLede }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) {
      setError("Enter the password to continue.");
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

      const bodyText = await res.text();
      if (!bodyText) throw new Error("Server unavailable — try again in a moment.");
      const data = JSON.parse(bodyText);

      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = res.headers.get("retry-after");
          const seconds = retryAfter ? parseInt(retryAfter, 10) : NaN;
          if (!isNaN(seconds) && seconds > 0) {
            const minutes = Math.ceil(seconds / 60);
            throw new Error(
              `Too many attempts — try again in ~${minutes} minute${minutes > 1 ? "s" : ""}.`
            );
          }
          throw new Error("Too many attempts — try again shortly.");
        }
        throw new Error(data.error || "Authentication failed.");
      }

      sessionStorage.setItem("coned_token", data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message || "Authentication failed.");
      setLoading(false);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  return (
    <div className="lf-wrap">
      {surfaceLede && <div className="lf-lede">{surfaceLede}</div>}
      <form className="lf-card" onSubmit={handleSubmit} noValidate>
        <label className="lf-label" htmlFor="lf-password">
          Password
        </label>
        <input
          id="lf-password"
          ref={inputRef}
          type="password"
          className="lf-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="current-password"
          spellCheck={false}
        />

        {error && (
          <div className="lf-error" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="lf-submit"
          disabled={loading || !password}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="lf-helper">
          Access is by shared password. Sessions expire hourly.
        </p>
      </form>
    </div>
  );
}
