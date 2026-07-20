"""Badge tier logic, mirroring src/lib/badges.ts exactly (same thresholds/colors)."""
from typing import Optional, TypedDict


class BadgeTier(TypedDict):
    name: str
    threshold: int
    color: str
    glow: str


BADGE_TIERS: list[BadgeTier] = [
    {"name": "Bronze", "threshold": 100, "color": "#b45309", "glow": "#f59e0b"},
    {"name": "Silver", "threshold": 250, "color": "#64748b", "glow": "#cbd5e1"},
    {"name": "Gold", "threshold": 500, "color": "#ca8a04", "glow": "#fde047"},
    {"name": "Diamond", "threshold": 1000, "color": "#0891b2", "glow": "#67e8f9"},
    {"name": "Platinum", "threshold": 2000, "color": "#475569", "glow": "#e2e8f0"},
    {"name": "Legend", "threshold": 5000, "color": "#7c3aed", "glow": "#c4b5fd"},
]


def current_tier(points: int) -> Optional[BadgeTier]:
    tier: Optional[BadgeTier] = None
    for t in BADGE_TIERS:
        if points >= t["threshold"]:
            tier = t
    return tier


def next_tier(points: int) -> Optional[BadgeTier]:
    for t in BADGE_TIERS:
        if points < t["threshold"]:
            return t
    return None


def tier_progress(points: int) -> int:
    current = current_tier(points)
    nxt = next_tier(points)
    base = current["threshold"] if current else 0
    target = nxt["threshold"] if nxt else base
    if target == base:
        return 100
    return min(100, round(((points - base) / (target - base)) * 100))
