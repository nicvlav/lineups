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
    return {
        defending: traits.tackling * 0.3 + traits.gameSense * 0.2 + traits.strength * 0.2 + traits.defIntent * 0.3,
        playmaking: traits.passing * 0.35 + traits.gameSense * 0.3 + traits.flair * 0.2 + traits.dribbling * 0.15,
        goalThreat: traits.shooting * 0.4 + traits.flair * 0.2 + traits.dribbling * 0.15 + traits.attIntent * 0.25,
        athleticism: traits.speed * 0.4 + traits.stamina * 0.4 + traits.strength * 0.2,
        engine: (traits.attIntent + traits.defIntent) * 0.25 + traits.stamina * 0.35 + traits.speed * 0.15,
        technique: traits.dribbling * 0.35 + traits.passing * 0.3 + traits.flair * 0.2 + traits.shooting * 0.15,
    };
}

// ─── Overall Quality ────────────────────────────────────────────────────────

export function computeOverall(capabilities: PlayerCapabilities): number {
    const values = Object.values(capabilities);
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ─── Zone Effectiveness ─────────────────────────────────────────────────────
// How well a player fits each zone, derived from capabilities.

export function computeZoneEffectiveness(capabilities: PlayerCapabilities): ZoneEffectiveness {
    return {
        def: capabilities.defending * 0.5 + capabilities.athleticism * 0.2 + capabilities.engine * 0.3,
        mid:
            capabilities.playmaking * 0.35 +
            capabilities.engine * 0.25 +
            capabilities.technique * 0.25 +
            capabilities.defending * 0.15,
        att:
            capabilities.goalThreat * 0.4 +
            capabilities.technique * 0.3 +
            capabilities.athleticism * 0.15 +
            capabilities.playmaking * 0.15,
    };
}

// ─── Player Labels ──────────────────────────────────────────────────────────
// Derived from capability profile shape. Replaces 27 archetype definitions.

export interface PlayerLabel {
    /** Primary label e.g. "Enforcer", "Playmaker", "All-Rounder" */
    primary: string;
    /** Zone hint e.g. "Defensive", "Creative", "Athletic" */
    secondary: string;
}

/** Threshold for a capability to be considered "dominant" */
const DOMINANCE_THRESHOLD = 1.15; // 15% above player's own mean

/** Threshold for a capability to be considered "weak" */
const WEAKNESS_THRESHOLD = 0.85; // 15% below player's own mean

export function computeLabel(capabilities: PlayerCapabilities): PlayerLabel {
    const mean = computeOverall(capabilities);
    if (mean === 0) return { primary: "Unknown", secondary: "" };

    // Find dominant and weak capabilities
    const dominant: CapabilityKey[] = [];
    const weak: CapabilityKey[] = [];

    for (const [key, value] of Object.entries(capabilities) as [CapabilityKey, number][]) {
        if (value > mean * DOMINANCE_THRESHOLD) dominant.push(key);
        if (value < mean * WEAKNESS_THRESHOLD) weak.push(key);
    }

    // Derive primary label from dominant capabilities
    const primary = derivePrimaryLabel(dominant, capabilities);

    // Derive secondary from strongest zone
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

    // Specialist labels (1-2 dominant capabilities)
    if (has("defending") && has("athleticism")) return "Enforcer";
    if (has("defending") && has("engine")) return "Destroyer";
    if (has("defending") && has("playmaking")) return "Ball Player";
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

    // No dominant capability — check if all-round or just average
    const values = Object.values(caps);
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max - min < 10) return "All-Rounder";

    return "Balanced";
}
