import { useEffect } from "react";

/**
 * useKeyboard — register keyboard shortcuts with modifier support.
 *
 * @param {Object} map - Shortcut map: { "key": handler, "ctrl+f": handler, ... }
 *   Simple keys: key name (e.g. "Escape", "1", "j", "k")
 *   Modified keys: "ctrl+key" or "meta+key"
 * @param {Array} deps - Dependency array to re-bind handlers
 *
 * The hook auto-exempts INPUT, TEXTAREA, and SELECT elements from firing shortcuts
 * (except Escape which always fires).
 */
export function useKeyboard(map, deps = []) {
  useEffect(() => {
    function handler(e) {
      // Auto-exempt input elements (unless it's Escape — always allow to close panels)
      if (e.key !== "Escape") {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      }

      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;

      for (const [combo, fn] of Object.entries(map)) {
        const parts = combo.toLowerCase().split("+");
        if (parts.length === 2) {
          const [mod, k] = parts;
          if ((mod === "ctrl" && ctrl) && key.toLowerCase() === k) {
            e.preventDefault();
            fn(e);
            return;
          }
        } else if (parts.length === 1) {
          if (key.toLowerCase() === parts[0]) {
            e.preventDefault();
            fn(e);
            return;
          }
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [map, ...deps]);
}

export default useKeyboard;