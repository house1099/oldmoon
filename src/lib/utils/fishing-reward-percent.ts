/**
 * DB `fishing_rewards.weight`: bigint — hundredths of a percent within the tier (100 = 1.00%).
 * Picking uses relative weights (normalize within tier).
 */

export function weightBpToPercentNumber(weight: number | bigint): number {
  const n = typeof weight === "bigint" ? Number(weight) : weight;
  return n / 100;
}

/** Parse user input like "12.34" or "12" to weight units; min 1 bp = 0.01%. */
export function percentInputToWeightBp(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number.parseFloat(t.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const bp = Math.round(n * 100);
  if (bp < 1) return 1;
  if (bp > Number.MAX_SAFE_INTEGER) return null;
  return bp;
}

export function formatPercentInputFromWeightBp(weight: number | bigint): string {
  const n = weightBpToPercentNumber(weight);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}
