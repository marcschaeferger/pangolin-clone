export function parseDataSize(sizeStr: string): number {
  if (!sizeStr) return 0;
  const match = sizeStr.trim().toUpperCase().match(/^([\d.]+)\s*([KMGT]?B)$/);
  if (!match) return 0;
  const [, numStr, unit] = match;
  const num = parseFloat(numStr) || 0;
  const multipliers: Record<string, number> = {
    B: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4,
  };
  return num * (multipliers[unit] || 1);
}