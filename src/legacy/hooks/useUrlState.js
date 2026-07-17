import { useState, useCallback, useEffect, useRef } from "react";

/**
 * useUrlState — lightweight URL search param persistence without react-router.
 *
 * Provides:
 *   get(key)     — returns param value or schema default
 *   setParam(key, value) — updates URL via history.replaceState and triggers state update
 *   params       — current URLSearchParams object
 *
 * @param {Object} schema - { key: { type: "string"|"number", default: val }, ... }
 *   Keys not in schema are passed through as raw strings.
 */
export function useUrlState(schema = {}) {
  const getParams = useCallback(() => new URLSearchParams(window.location.search), []);
  const [params, setParamsState] = useState(getParams);
  const syncing = useRef(false);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handler = () => {
      if (!syncing.current) setParamsState(getParams());
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [getParams]);

  const setParam = useCallback((key, value) => {
    const sp = getParams();
    const s = schema[key];
    const def = s ? s.default : undefined;

    if (value === def || value == null || value === "") {
      sp.delete(key);
    } else {
      sp.set(key, String(value));
    }
    const qs = sp.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    syncing.current = true;
    window.history.replaceState(null, "", url);
    syncing.current = false;
    setParamsState(sp);
  }, [getParams, schema]);

  const get = useCallback((key) => {
    const raw = params.get(key);
    const s = schema[key];
    if (!s) return raw;
    if (raw == null) return s.default;
    if (s.type === "number") {
      const n = parseFloat(raw);
      return isNaN(n) ? s.default : n;
    }
    return raw;
  }, [params, schema]);

  return { params, get, setParam };
}

export default useUrlState;