// Skeleton loading components — shape-matched to each lazy-loaded component.
// Shimmer keyframes are injected once into the document head.

if (typeof document !== "undefined" && !document.getElementById("skeleton-style")) {
  const s = document.createElement("style");
  s.id = "skeleton-style";
  s.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
  document.head.appendChild(s);
}

const shimmer = {
  background: "linear-gradient(90deg, #1e293b 25%, #243656 50%, #1e293b 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
};

const bar = (width, height = 12, style = {}) => (
  <div style={{ ...shimmer, width, height, borderRadius: 4, ...style }} />
);

// ── RiskTableSkeleton ──────────────────────────────────────────────────────────
// 8 shimmer rows: narrow risk-color column + address + data columns
export function RiskTableSkeleton() {
  const rows = Array.from({ length: 8 });
  return (
    <div style={{ flex: 1, padding: "16px 20px", background: "#001748" }}>
      {/* header row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #082244" }}>
        {bar(40, 10)}
        {bar(200, 10)}
        {bar(80, 10)}
        {bar(80, 10)}
        {bar(80, 10)}
        {bar(60, 10)}
      </div>
      {rows.map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 0",
            borderBottom: "1px solid #082244",
          }}
        >
          {/* risk color swatch */}
          <div style={{ ...shimmer, width: 6, height: 36, borderRadius: 3, flexShrink: 0 }} />
          {/* address — varying width to look natural */}
          {bar(`${120 + (i * 37) % 120}px`, 12)}
          {bar("70px", 12)}
          {bar("70px", 12)}
          {bar("70px", 12)}
          {bar("50px", 12)}
        </div>
      ))}
    </div>
  );
}

// ── BuildingPanelSkeleton ──────────────────────────────────────────────────────
// 380px right sidebar: header bar, score circle, stat rows, section block
export function BuildingPanelSkeleton() {
  return (
    <div
      style={{
        width: 380,
        height: "100%",
        background: "#001748",
        borderLeft: "1px solid #082244",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* header */}
      <div style={{ ...shimmer, height: 52, borderRadius: 0, flexShrink: 0 }} />
      {/* score circle area */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px 16px" }}>
        <div
          style={{
            ...shimmer,
            width: 88,
            height: 88,
            borderRadius: "50%",
            marginBottom: 12,
          }}
        />
        {bar("120px", 14, { margin: "0 auto 6px" })}
        {bar("80px", 10, { margin: "0 auto" })}
      </div>
      {/* stat rows */}
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {bar(`${80 + (i * 23) % 60}px`, 11)}
            {bar("60px", 11)}
          </div>
        ))}
      </div>
      {/* section block */}
      <div
        style={{
          ...shimmer,
          margin: "20px 20px 0",
          height: 90,
          borderRadius: 6,
        }}
      />
    </div>
  );
}

// ── ChartSkeleton ──────────────────────────────────────────────────────────────
// Generic chart placeholder with a subtle axes hint
export function ChartSkeleton() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 280,
        background: "#001748",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 16,
      }}
    >
      {/* title bar */}
      {bar("160px", 14, { marginBottom: 8 })}
      {/* chart body */}
      <div
        style={{
          ...shimmer,
          width: "100%",
          flex: 1,
          minHeight: 200,
          borderRadius: 6,
        }}
      />
      {/* x-axis labels hint */}
      <div style={{ display: "flex", gap: 16, width: "100%", justifyContent: "space-around" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ ...shimmer, width: 40, height: 9, borderRadius: 4 }} />
        ))}
      </div>
    </div>
  );
}

// ── AgentSkeleton ──────────────────────────────────────────────────────────────
// AI Agent tab: search box outline + empty results area
export function AgentSkeleton() {
  return (
    <div
      style={{
        flex: 1,
        background: "#001748",
        display: "flex",
        flexDirection: "column",
        padding: "24px 28px",
        gap: 20,
      }}
    >
      {/* title */}
      {bar("180px", 16)}
      {/* search box */}
      <div
        style={{
          height: 44,
          border: "1px solid #1e293b",
          borderRadius: 8,
          background: "#0a1a2e",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 10,
        }}
      >
        <div style={{ ...shimmer, width: 16, height: 16, borderRadius: "50%", flexShrink: 0 }} />
        {bar("220px", 12)}
      </div>
      {/* results area */}
      <div
        style={{
          flex: 1,
          border: "1px solid #082244",
          borderRadius: 8,
          background: "#030D1A",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 16,
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              ...shimmer,
              height: 56,
              borderRadius: 6,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── SlimSkeleton ───────────────────────────────────────────────────────────────
// Single-line thin shimmer bar for AlertBanner / ProactiveAlertSummary
export function SlimSkeleton() {
  return (
    <div
      style={{
        ...shimmer,
        width: "100%",
        height: 36,
        borderRadius: 0,
        flexShrink: 0,
      }}
    />
  );
}
