import { useState, useEffect } from "react";
import "./StatusWriter.css";

const STATUSES = [
  "Unreviewed",
  "In review",
  "Contacted",
  "Confirmed at-risk",
  "False positive",
  "Dismissed",
];

/**
 * M6: Status write control for CaseFile.
 * Reads currentStatus from parent, POSTs to /api/buildings/:bbl/status on save.
 * Calls onSaved(newStatus) so the parent can update its local state.
 */
const BBL_RE = /^[1-5]\d{9}$/;

export default function StatusWriter({ bbl, currentStatus, token, onSaved }) {
  const initial = currentStatus ?? "Unreviewed";
  const [selected, setSelected] = useState(initial);
  const [note,     setNote]     = useState("");
  const [saving,   setSaving]   = useState(false);
  const [flash,    setFlash]    = useState(null); // "saved" | "error"

  // Sync selected when parent updates currentStatus after a re-fetch,
  // but don't overwrite an in-progress edit.
  useEffect(() => {
    if (!saving && selected === initial) {
      setSelected(currentStatus ?? "Unreviewed");
    }
  }, [currentStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = selected !== (currentStatus ?? "Unreviewed");

  function handleSave() {
    if (!dirty || saving) return;
    if (!BBL_RE.test(bbl)) {
      setFlash("error");
      return;
    }
    setSaving(true);
    setFlash(null);

    fetch(`/api/buildings/${bbl}/status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: selected, ...(note.trim() ? { note: note.trim() } : {}) }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(() => {
        setFlash("saved");
        setNote("");
        onSaved?.(selected);
        setTimeout(() => setFlash(null), 2500);
      })
      .catch(() => {
        setFlash("error");
        setTimeout(() => setFlash(null), 3000);
      })
      .finally(() => setSaving(false));
  }

  return (
    <div className="sw-root">
      <div className="sw-row">
        <label className="sw-label" htmlFor={`sw-select-${bbl}`}>Status</label>
        <select
          id={`sw-select-${bbl}`}
          className="sw-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={saving}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {dirty && (
          <button
            className={`sw-save${saving ? " sw-save--busy" : ""}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        )}

        {flash === "saved"  && <span className="sw-flash sw-flash--ok">Saved</span>}
        {flash === "error"  && <span className="sw-flash sw-flash--err">Save failed — try again</span>}
      </div>

      {dirty && (
        <textarea
          className="sw-note"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          rows={2}
          disabled={saving}
        />
      )}
    </div>
  );
}
