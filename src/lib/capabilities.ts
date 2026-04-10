/**
 * Capability Computation
 *
 * Derives 6 capability dimensions from 11 traits, zone effectiveness from
 * capabilities, overall quality, and player labels. Single source of truth
 * for all player evaluation — replaces the old archetype/calculator system.
 */

import type { CapabilityKey, PlayerCapabilities, PlayerTraits, ZoneEffectiveness } from "@/types/traits";

// ─── Capability Formulas ────────────────────────────────────────────────────
// Each capability is a weighted sum of traits. Weights sum to 1.0.

export function computeCapabilities(traits: PlayerTraits): PlayerCapabilities {
    // Game sense is the universal quality multiplier — the "composure" that
    // separates good from elite in every capability.
    const gs = traits.gameSense;

    return {
        defending: traits.tackling * 0.3 + gs * 0.25 + traits.strength * 0.25 + traits.stamina * 0.2,
        playmaking: traits.passing * 0.3 + gs * 0.3 + traits.flair * 0.2 + traits.dribbling * 0.2,
        goalThreat: traits.shooting * 0.35 + gs * 0.2 + traits.flair * 0.2 + traits.dribbling * 0.25,
        athleticism: traits.speed * 0.35 + traits.stamina * 0.35 + traits.strength * 0.15 + gs * 0.15,
        engine: (() => {
            const maxIntent = Math.max(traits.attIntent, traits.defIntent);
            const minIntent = Math.min(traits.attIntent, traits.defIntent);
            const intentScore = maxIntent * 0.8 + minIntent * 0.2;
            return intentScore * 0.4 + traits.stamina * 0.3 + traits.speed * 0.15 + gs * 0.15;
        })(),
        technique: traits.dribbling * 0.3 + traits.passing * 0.25 + traits.flair * 0.2 + traits.shooting * 0.1 + gs * 0.15,
    };
}

// ─── Zone Effectiveness ─────────────────────────────────────────────────────
//
// Key insight: zone effectiveness uses a player's TOP 2 relevant capabilities
// weighted more heavily. A deep playmaker (defending + playmaking) doesn't
// need athleticism to dominate midfield — just like Busquets.
//
// Formula: take all relevant capabilities, sort by strength, weight the top
// ones more than the bottom. This means specialists get rewarded while
// all-rounders also score well.

function topWeightedScore(values: number[]): number {
    const sorted = [...values].sort((a, b) => b - a);
    // Weights: best capability matters most, diminishing for each additional one
    const weights = [0.45, 0.3, 0.15, 0.1];
    let total = 0;
    let weightSum = 0;
    for (let i = 0; i < sorted.length && i < weights.length; i++) {
        total += sorted[i] * weights[i];
        weightSum += weights[i];
    }
    return total / weightSum;
}

/**
 * Zone effectiveness: primary capability is the anchor (50%), supporting
 * capabilities fill the rest via top-weighted scoring.
 * This prevents high engine/athleticism from inflating a zone where the
 * core skill is lacking.
 */
export function computeZoneEffectiveness(capabilities: PlayerCapabilities): ZoneEffectiveness {
    return {
        def: capabilities.defending * 0.55 + topWeightedScore([capabilities.engine, capabilities.athleticism]) * 0.45,
        mid:
            capabilities.playmaking * 0.35 +
            topWeightedScore([capabilities.defending, capabilities.engine, capabilities.technique, capabilities.athleticism]) * 0.65,
        att:
            capabilities.goalThreat * 0.4 +
            topWeightedScore([capabilities.technique, capabilities.athleticism, capabilities.playmaking]) * 0.6,
    };
}

// ─── Overall Quality ────────────────────────────────────────────────────────

/**
 * Overall = best zone effectiveness.
 * A player is rated by what they do best — like FIFA.
 */
export function computeOverall(capabilities: PlayerCapabilities): number {
    const zones = computeZoneEffectiveness(capabilities);
    return Math.max(zones.def, zones.mid, zones.att);
}

// ─── Player Labels ──────────────────────────────────────────────────────────

export interface PlayerLabel {
    primary: string;
    secondary: string;
}

/** Threshold for a capability to be considered "dominant" (vs player's own capability mean) */
const DOMINANCE_THRESHOLD = 1.1;
export function computeLabel(capabilities: PlayerCapabilities): PlayerLabel {
    const values = Object.values(capabilities);
    const capMean = values.reduce((sum, v) => sum + v, 0) / values.length;
    if (capMean === 0) return { primary: "Unknown", secondary: "" };

    const dominant: CapabilityKey[] = [];

    for (const [key, value] of Object.entries(capabilities) as [CapabilityKey, number][]) {
        if (value > capMean * DOMINANCE_THRESHOLD) dominant.push(key);
    }

    const primary = derivePrimaryLabel(dominant, capabilities);

    const zones = computeZoneEffectiveness(capabilities);
    const bestZone =
        zones.def >= zones.mid && zones.def >= zones.att
            ? "Defensive"
            : zones.att >= zones.mid
              ? "Attacking"
              : "Midfield";

    return { primary, secondary: dominant.length <= 1 ? bestZone : "" };
}

function derivePrimaryLabel(dominant: CapabilityKey[], caps: PlayerCapabilities): string {
    const has = (key: CapabilityKey) => dominant.includes(key);
    const count = dominant.length;

    // Triple+ dominant — elite multi-dimensional players
    if (count >= 3) {
        if (has("defending") && has("engine") && has("athleticism")) return "Destroyer";
        if (has("defending") && has("playmaking") && has("engine")) return "Deep Playmaker";
        if (has("defending") && has("playmaking") && has("technique")) return "Deep Playmaker";
        if (has("goalThreat") && has("athleticism") && has("technique")) return "Complete Forward";
        if (has("playmaking") && has("technique") && has("engine")) return "Maestro";
        if (has("goalThreat") && has("athleticism") && has("engine")) return "Pressing Forward";
    }

    // Dual dominant
    if (has("defending") && has("playmaking")) return "Deep Playmaker";
    if (has("defending") && has("athleticism")) return "Enforcer";
    if (has("defending") && has("engine")) return "Destroyer";
    if (has("defending") && has("technique")) return "Ball Player";
    if (has("defending")) return "Defender";

    if (has("playmaking") && has("technique")) return "Maestro";
    if (has("playmaking") && has("engine")) return "Conductor";
    if (has("playmaking")) return "Playmaker";

    if (has("goalThreat") && has("athleticism")) return "Speedster";
    if (has("goalThreat") && has("technique")) return "Finisher";
    if (has("goalThreat")) return "Goal Threat";

    if (has("athleticism") && has("engine")) return "Pressing Machine";
    if (has("athleticism")) return "Athlete";

    if (has("engine")) return "Engine";
    if (has("technique")) return "Technician";

    // No dominant capability
    const values = Object.values(caps);
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max - min < 10) return "All-Rounder";

    return "Balanced";
}
