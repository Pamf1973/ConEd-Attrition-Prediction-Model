/**
 * Canonical Critical v1.1 filter — Q3 sign-off.
 * Single source of truth used by CriticalQueue, ThisWeekPage, and buildDigest.
 *
 * ml_risk >= 0.6 AND norm_delta_23_24 not null AND (outlier OR accelerating)
 */
export function isCritical(b) {
  if (!b) return false;
  return (
    typeof b.ml_risk === "number" && b.ml_risk >= 0.6 &&
    b.norm_delta_23_24 != null &&
    (b.outlier_23_24 === true || b.outlier_22_23 === true ||
     b.decline_trend_label === "accelerating")
  );
}
