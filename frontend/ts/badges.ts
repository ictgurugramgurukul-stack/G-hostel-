export interface BadgeTier {
  name: string;
  threshold: number;
  color: string;
  glow: string;
}

export const BADGE_TIERS: BadgeTier[] = [
  { name: "Bronze", threshold: 100, color: "#b45309", glow: "#f59e0b" },
  { name: "Silver", threshold: 250, color: "#64748b", glow: "#cbd5e1" },
  { name: "Gold", threshold: 500, color: "#ca8a04", glow: "#fde047" },
  { name: "Diamond", threshold: 1000, color: "#0891b2", glow: "#67e8f9" },
  { name: "Platinum", threshold: 2000, color: "#475569", glow: "#e2e8f0" },
  { name: "Legend", threshold: 5000, color: "#7c3aed", glow: "#c4b5fd" },
];

export function currentTier(points: number): BadgeTier | null {
  let tier: BadgeTier | null = null;
  for (const t of BADGE_TIERS) {
    if (points >= t.threshold) tier = t;
  }
  return tier;
}

export function nextTier(points: number): BadgeTier | null {
  for (const t of BADGE_TIERS) {
    if (points < t.threshold) return t;
  }
  return null;
}

export function tierProgress(points: number): number {
  const current = currentTier(points);
  const next = nextTier(points);
  const base = current?.threshold ?? 0;
  const target = next?.threshold ?? base;
  if (target === base) return 100;
  return Math.min(100, Math.round(((points - base) / (target - base)) * 100));
}

export function badgeMedal(points: number, size: "sm" | "md" | "lg" = "md"): string {
  const tier = currentTier(points);
  const sizeClass = size === "lg" ? "medal-lg" : size === "sm" ? "medal-sm" : "medal-md";
  if (!tier) {
    return `<div class="medal ${sizeClass}" style="background:var(--muted);color:var(--muted-foreground);font-size:.7rem;">--</div>`;
  }
  return `<div class="medal ${sizeClass}" style="background:radial-gradient(circle at 30% 30%, ${tier.glow}, ${tier.color})" title="${tier.name}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="55%" height="55%"><circle cx="12" cy="14" r="6"/><path d="M9 3l3 8 3-8"/></svg>
  </div>`;
}
