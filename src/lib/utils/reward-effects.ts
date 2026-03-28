/**
 * Maps DB `effect_key` to a globals.css class `effect-{key}`.
 * Only allows safe identifier characters to avoid class injection.
 */
export function rewardEffectClassName(
  effectKey: string | null | undefined,
): string | undefined {
  const k = effectKey?.trim();
  if (!k) return undefined;
  if (!/^[a-z0-9_-]+$/i.test(k)) return undefined;
  return `effect-${k}`;
}
