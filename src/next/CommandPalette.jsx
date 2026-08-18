import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./CommandPalette.css";

/**
 * Command palette. ⌘K opens; fuzzy input over a static command registry.
 * When no local command matches, an LLM fallback (Anthropic → Groq → OpenRouter)
 * interprets the query as either an action (pick a known command) or an answer
 * (short response + suggested commands).
 *
 * W6 discipline: palette is second-class to buttons. Every command here
 * also exists as a button or link somewhere on the surface. The LLM leg
 * routes freeform intent to those same buttons — no new capabilities appear
 * in the palette that aren't reachable elsewhere.
 */

function fuzzyScore(query, label) {
  if (!query) return 1;
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  if (l.includes(q)) return 2 - (l.indexOf(q) / Math.max(l.length, 1));
  let qi = 0;
  for (let i = 0; i < l.length && qi < q.length; i++) {
    if (l[i] === q[qi]) qi++;
  }
  return qi === q.length ? 1 : 0;
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [ai, setAi] = useState(null);           // {status, data} — 'loading'|'answer'|'action'|'error'|'off'
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const commands = useMemo(() => [
    { id: "nav-this-week",   label: "Go to This Week",       hint: "/this-week",   run: () => navigate("/this-week") },
    { id: "nav-rankings",    label: "Go to Rankings",        hint: "/rankings",    run: () => navigate("/rankings") },
    { id: "nav-methodology", label: "Go to Methodology",     hint: "/methodology", run: () => navigate("/methodology") },
    { id: "nav-digest",      label: "Compose weekly digest", hint: "/digest",      run: () => navigate("/digest") },
    { id: "filter-critical", label: "Filter queue to Critical",     hint: "chip", run: () => navigate("/this-week") },
    { id: "filter-outlier",  label: "Filter queue to Outlier Δ",    hint: "chip", run: () => navigate("/this-week") },
    { id: "filter-accel",    label: "Filter queue to Accelerating", hint: "chip", run: () => navigate("/this-week") },
    { id: "filter-modif",    label: "Filter queue to Modifier-promoted", hint: "chip", run: () => navigate("/this-week") },
  ], [navigate]);

  const commandById = useMemo(
    () => Object.fromEntries(commands.map((c) => [c.id, c])),
    [commands]
  );

  const matches = useMemo(() => {
    return commands
      .map((c) => ({ c, score: fuzzyScore(query, c.label) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.c);
  }, [commands, query]);

  useEffect(() => { setCursor(0); }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setAi(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Debounced LLM leg: only fires when local matches are empty and query is
  // non-trivial. Keeps the palette instant for command lookups.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAi(null);
    if (!open) return;
    if (query.trim().length < 4) return;
    if (matches.length > 0) return;

    debounceRef.current = setTimeout(async () => {
      const token = sessionStorage.getItem("coned_token");
      if (!token) { setAi({ status: "off", msg: "Sign in to ask freeform." }); return; }
      setAi({ status: "loading" });
      try {
        const res = await fetch("/api/palette", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: query.trim(),
            commands: commands.map((c) => ({ id: c.id, label: c.label })),
          }),
        });
        if (!res.ok) {
          if (res.status === 429) setAi({ status: "error", msg: "Rate limit — wait a moment." });
          else if (res.status === 503) setAi({ status: "off", msg: "AI unavailable in this environment." });
          else setAi({ status: "error", msg: "AI request failed." });
          return;
        }
        const data = await res.json();
        setAi({ status: data.kind, data });
      } catch {
        setAi({ status: "error", msg: "AI request failed." });
      }
    }, 450);

    return () => clearTimeout(debounceRef.current);
  }, [query, matches, open, commands]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(matches.length - 1, c + 1)); }
      else if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        if (matches.length > 0) {
          const m = matches[cursor];
          if (m) { m.run(); onClose(); }
        } else if (ai?.status === "action" && Object.hasOwn(commandById, ai.data.commandId) && commandById[ai.data.commandId]) {
          commandById[ai.data.commandId].run();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, matches, cursor, onClose, ai, commandById]);

  if (!open) return null;

  return (
    <div className="cp-backdrop" onClick={onClose}>
      <div className="cp-panel sc-scope" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cp-input"
          type="text"
          placeholder="Type a command or ask a question…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="cp-list" role="listbox">
          {matches.length === 0 && !ai && (
            <li className="cp-empty">No matching command. Keep typing to ask.</li>
          )}
          {matches.map((m, i) => (
            <li
              key={m.id}
              className={`cp-item${i === cursor ? " cp-item--active" : ""}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => { m.run(); onClose(); }}
              role="option"
              aria-selected={i === cursor}
            >
              <span className="cp-label">{m.label}</span>
              <span className="cp-hint">{m.hint}</span>
            </li>
          ))}
        </ul>

        {ai && matches.length === 0 && (
          <div className="cp-ai">
            {ai.status === "loading" && <div className="cp-ai-line cp-ai-line--muted">Asking Claude…</div>}
            {ai.status === "error"   && <div className="cp-ai-line cp-ai-line--err">{ai.msg}</div>}
            {ai.status === "off"     && <div className="cp-ai-line cp-ai-line--muted">{ai.msg}</div>}
            {ai.status === "action"  && Object.hasOwn(commandById, ai.data.commandId) && commandById[ai.data.commandId] && (
              <button
                className="cp-ai-action"
                onClick={() => { commandById[ai.data.commandId].run(); onClose(); }}
              >
                <span className="cp-ai-tag">AI · run</span>
                <span>{commandById[ai.data.commandId].label}</span>
              </button>
            )}
            {ai.status === "answer" && (
              <>
                <div className="cp-ai-line">
                  <span className="cp-ai-tag">AI</span> {ai.data.answer}
                </div>
                {ai.data.suggest?.length > 0 && (
                  <div className="cp-ai-suggests">
                    {ai.data.suggest.map((id) => Object.hasOwn(commandById, id) && commandById[id] && (
                      <button
                        key={id}
                        className="cp-ai-suggest"
                        onClick={() => { commandById[id].run(); onClose(); }}
                      >
                        {commandById[id].label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="cp-footer">
          <span>↑↓ navigate</span>
          <span>↵ run</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
