import { useState, useCallback, useEffect } from "react";

// Shorten the token to a stable 16-char key fragment so the full bearer token
// is never exposed as a localStorage key (visible to XSS via Object.keys).
// Also prevents orphaned keys accumulating on token rotation.
function tokenNs(token) {
  if (!token) return "";
  // Simple djb2 hash — good enough for namespacing, no crypto needed here
  let h = 5381;
  for (let i = 0; i < token.length; i++) h = ((h << 5) + h) ^ token.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, "0");
}

// Keys namespaced per token (hashed) so different users on the same browser don't share state
function contactedKey(token)  { return `coned_contacted_${tokenNs(token)}`; }
function dismissedKey(token)  { return `coned_dismissed_${tokenNs(token)}`; }
function lastReviewKey(token) { return `coned_last_review_${tokenNs(token)}`; }

// address must be a non-empty plain string — reject anything else
function isValidAddress(v) {
  return typeof v === "string" && v.length > 0 && v.length < 500;
}

function loadSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[useWorkflow] Unexpected localStorage shape for ${key} — resetting`);
      return new Set();
    }
    // Filter to valid address strings only — drop any poisoned entries
    return new Set(parsed.filter(isValidAddress));
  } catch (err) {
    console.warn(`[useWorkflow] Failed to load ${key}:`, err.message);
    return new Set();
  }
}

function saveSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch (err) {
    console.warn(`[useWorkflow] Failed to save ${key}:`, err.message);
  }
}

function loadLastReview(token) {
  if (!token) return null;
  try {
    const raw = localStorage.getItem(lastReviewKey(token));
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d.getTime()) || d > new Date(Date.now() + 86_400_000)) return null;
    return raw;
  } catch (err) {
    console.warn("[useWorkflow] Failed to load last review:", err.message);
    return null;
  }
}

export function useWorkflow(token) {
  const [contacted,  setContacted]  = useState(() => token ? loadSet(contactedKey(token)) : new Set());
  const [dismissed,  setDismissed]  = useState(() => token ? loadSet(dismissedKey(token))  : new Set());
  const [lastReview, setLastReview] = useState(() => loadLastReview(token));

  // Load per-user state on token change; stamp lastReview only when no prior value exists
  // (merged from two separate effects that previously clobbered each other on mount)
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
      if (next.has(address)) next.delete(address); else next.add(address);
      saveSet(contactedKey(token), next);
      return next;
    });
  }, [token]);

  const toggleDismissed = useCallback((address) => {
    if (!token || !isValidAddress(address)) return;
    setDismissed(prev => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address); else next.add(address);
      saveSet(dismissedKey(token), next);
      return next;
    });
  }, [token]);

  const clearWorkflow = useCallback(() => {
    if (!token) return;
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
  // Use calendar-day difference, not 24h periods
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const reviewStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((todayStart - reviewStart) / 86_400_000);
  if (diffDays < 0) return null; // future timestamp — don't display
  const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diffDays === 0) return "today";
  if (diffDays === 1) return `${dayName} (yesterday)`;
  return `${dayName} ${dateStr}`;
}
