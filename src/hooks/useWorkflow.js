import { useState, useCallback, useEffect } from "react";

// 64-bit namespace: two djb2 passes over disjoint byte windows.
// 32-bit djb2 has ~50% birthday collision at ~65k tokens; 64-bit reduces that
// to astronomically negligible for any realistic ConEd operator count.
// If the token is a JWT, extract the sub claim for a guaranteed-unique, stable key.
function tokenNs(token) {
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const sub = payload.sub || payload.user_id || payload.email;
    if (sub && typeof sub === "string" && sub.length > 0) {
      return sub.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
    }
  } catch {
    // not a JWT or malformed — fall through to hash
  }
  // Dual djb2 with different seeds for 64-bit output
  let h1 = 5381, h2 = 52711;
  for (let i = 0; i < token.length; i++) {
    const c = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x9e3779b9) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5f356495) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0"));
}

function contactedKey(token)  { return `coned_contacted_${tokenNs(token)}`; }
function dismissedKey(token)  { return `coned_dismissed_${tokenNs(token)}`; }
function lastReviewKey(token) { return `coned_last_review_${tokenNs(token)}`; }

// NYC steam service addresses: number + street name. Rejects HTML chars and
// overlong strings that could exhaust localStorage quota.
function isValidAddress(v) {
  if (typeof v !== "string" || v.length === 0 || v.length >= 200) return false;
  if (/[<>"';]/.test(v)) return false;
  return true;
}

const MAX_SET_SIZE = 500;

function loadSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[useWorkflow] Unexpected localStorage shape for ${key} — resetting`);
      return new Set();
    }
    // Filter to valid addresses and cap size to prevent quota exhaustion DoS
    return new Set(parsed.filter(isValidAddress).slice(0, MAX_SET_SIZE));
  } catch (err) {
    console.warn(`[useWorkflow] Failed to load ${key}:`, err.message);
    return new Set();
  }
}

function saveSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set].slice(0, MAX_SET_SIZE)));
  } catch (err) {
    if (err.name === "QuotaExceededError") {
      console.error("[useWorkflow] localStorage quota exceeded — workflow state not saved");
    } else {
      console.warn(`[useWorkflow] Failed to save ${key}:`, err.message);
    }
  }
}

function loadLastReview(token) {
  if (!token) return null;
  try {
    const raw = localStorage.getItem(lastReviewKey(token));
    if (!raw) return null;
    const d = new Date(raw);
    const now = Date.now();
    // Reject: unparseable, more than 30 days in the future (clock skew guard),
    // or more than 1 year in the past (stale/poisoned). Remove on detect.
    if (
      isNaN(d.getTime()) ||
      d.getTime() > now + 30 * 86_400_000 ||
      d.getTime() < now - 365 * 86_400_000
    ) {
      localStorage.removeItem(lastReviewKey(token));
      return null;
    }
    return raw;
  } catch (err) {
    console.warn("[useWorkflow] Failed to load last review:", err.message);
    return null;
  }
}

export function useWorkflow(token) {
  // Empty initial state — useEffect is the single source of truth.
  // Lazy initializers run only on mount and cause stale-previous-user data
  // to be briefly visible when token changes (race between render and effect).
  const [contacted,  setContacted]  = useState(new Set());
  const [dismissed,  setDismissed]  = useState(new Set());
  const [lastReview, setLastReview] = useState(null);

  // Load per-user state on token change; stamp lastReview only when no prior value exists
  useEffect(() => {
    if (!token) {
      setContacted(new Set());
      setDismissed(new Set());
      setLastReview(null);
      return;
    }
    setContacted(loadSet(contactedKey(token)));
    setDismissed(loadSet(dismissedKey(token)));
    const stored = loadLastReview(token);
    if (stored) {
      setLastReview(stored);
    } else {
      const now = new Date().toISOString();
      try { localStorage.setItem(lastReviewKey(token), now); } catch (err) {
        console.warn("[useWorkflow] Failed to save last review:", err.message);
      }
      setLastReview(now);
    }
  }, [token]);

  const toggleContacted = useCallback((address) => {
    if (!token || !isValidAddress(address)) return;
    setContacted(prev => {
      const next = new Set(prev);
      if (next.has(address)) {
        next.delete(address);
      } else {
        next.add(address);
        // Mutual exclusion: adding to contacted removes from dismissed
        setDismissed(d => {
          if (!d.has(address)) return d;
          const nd = new Set(d);
          nd.delete(address);
          saveSet(dismissedKey(token), nd);
          return nd;
        });
      }
      saveSet(contactedKey(token), next);
      return next;
    });
  }, [token]);

  const toggleDismissed = useCallback((address) => {
    if (!token || !isValidAddress(address)) return;
    setDismissed(prev => {
      const next = new Set(prev);
      if (next.has(address)) {
        next.delete(address);
      } else {
        next.add(address);
        // Mutual exclusion: adding to dismissed removes from contacted
        setContacted(c => {
          if (!c.has(address)) return c;
          const nc = new Set(c);
          nc.delete(address);
          saveSet(contactedKey(token), nc);
          return nc;
        });
      }
      saveSet(dismissedKey(token), next);
      return next;
    });
  }, [token]);

  const clearWorkflow = useCallback(() => {
    if (!token) return;
    console.info("[useWorkflow] clearWorkflow called — removing all workflow state for current session");
    try {
      localStorage.removeItem(contactedKey(token));
      localStorage.removeItem(dismissedKey(token));
      localStorage.removeItem(lastReviewKey(token));
    } catch (err) {
      console.warn("[useWorkflow] Failed to clear workflow state:", err.message);
    }
    setContacted(new Set());
    setDismissed(new Set());
    setLastReview(null);
  }, [token]);

  return { contacted, dismissed, lastReview, toggleContacted, toggleDismissed, clearWorkflow };
}

export function formatLastReview(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  // Use UTC date math — local-timezone new Date(y,m,d) causes UTC+ users to
  // see "today" reviews disappear because reviewStart lands tomorrow locally.
  const todayStart  = new Date(Date.UTC(now.getUTCFullYear(),  now.getUTCMonth(),  now.getUTCDate()));
  const reviewStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const diffDays = Math.round((todayStart - reviewStart) / 86_400_000);
  if (diffDays < 0) return null; // future timestamp — don't display
  const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diffDays === 0) return "today";
  if (diffDays === 1) return `${dayName} (yesterday)`;
  return `${dayName} ${dateStr}`;
}
