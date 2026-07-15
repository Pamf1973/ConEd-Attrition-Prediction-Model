import pg from "pg";

const { Pool } = pg;

// Fail fast in production if DATABASE_URL is not wired up
if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  throw new Error("FATAL: DATABASE_URL must be set in production");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/coned_dashboard",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  // Tune via DB_POOL_MAX env var; default 5 works for single-dyno Railway deployments
  max: parseInt(process.env.DB_POOL_MAX ?? "5", 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[db] idle client error:", err.message);
});

const VALID_STATUSES = new Set([
  "Unreviewed",
  "In review",
  "Contacted",
  "Confirmed at-risk",
  "False positive",
  "Dismissed",
]);

export { pool, VALID_STATUSES };

export async function initSchema() {
  // Build CHECK constraint from VALID_STATUSES so they can never drift apart
  const statusLiteral = [...VALID_STATUSES].map((s) => `'${s}'`).join(",");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS building_status_events (
      id         SERIAL      PRIMARY KEY,
      bbl        TEXT        NOT NULL,
      status     TEXT        NOT NULL CHECK (status IN (${statusLiteral})),
      note       TEXT        CHECK (note IS NULL OR length(note) <= 2000),
      actor      TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Composite index supports DISTINCT ON (bbl) ORDER BY bbl, created_at DESC, id DESC
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bse_bbl_ts
      ON building_status_events(bbl, created_at DESC, id DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_bse_actor
      ON building_status_events(actor)
  `);

  console.log("[db] schema ready");
}

// Current status for a BBL = latest event row (id DESC breaks created_at ties)
export async function getCurrentStatus(bbl) {
  const { rows } = await pool.query(
    `SELECT status, note, actor, created_at
     FROM building_status_events
     WHERE bbl = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [bbl]
  );
  return rows[0] ?? null;
}

// Full history for a BBL, newest first
export async function getStatusHistory(bbl) {
  const { rows } = await pool.query(
    `SELECT id, status, note, actor, created_at
     FROM building_status_events
     WHERE bbl = $1
     ORDER BY created_at DESC, id DESC`,
    [bbl]
  );
  return rows;
}

// Append a new status event — never updates, never deletes
export async function appendStatus(bbl, status, note, actor) {
  const { rows } = await pool.query(
    `INSERT INTO building_status_events (bbl, status, note, actor)
     VALUES ($1, $2, $3, $4)
     RETURNING id, bbl, status, note, actor, created_at`,
    [bbl, status, note ?? null, actor]
  );
  return rows[0];
}

// Bulk: latest status per BBL — id DESC breaks ties within same millisecond
export async function getBulkCurrentStatus(bbls) {
  if (!bbls.length) return {};
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (bbl) bbl, status, actor, created_at
     FROM building_status_events
     WHERE bbl = ANY($1)
     ORDER BY bbl, created_at DESC, id DESC`,
    [bbls]
  );
  return Object.fromEntries(rows.map((r) => [r.bbl, r]));
}
