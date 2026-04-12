/**
 * Capability Computation
 *
 * Computes the 6 display capabilities (defending, playmaking, goal threat,
 * athleticism, engine, technique) from the 11 raw traits. These are used for
 * the radar chart and per-player capability bars ONLY.
 *
 * Structural decisions — labels, zones, position fits, overall — all live in
 * `src/lib/archetypes.ts` now. Capabilities are display data; archetypes are
 * the source of truth for what kind of player someone is and where they play.
 */

import { computeArchetypeProfile } from "@/lib/archetypes";
import type { PlayerCapabilities, PlayerTraits, ZoneEffectiveness, ZoneKey } from "@/types/traits";

// ─── Capability Formulas ────────────────────────────────────────────────────
// Each capability is a weighted sum of traits. Weights sum to 1.0.
// These exist for the radar chart and capability bars only — they no longer
// drive zone classification, position assignment, or overall computation.

/**
 * Asymmetric intent penalty (Herzberg-style "hygiene factor").
 *
 * Intent acts as a downward gate on capability, never as an upward boost.
 * Floored at 0.5 so even worst-case you keep half your skill ceiling.
 */
const INTENT_BASELINE = 65;
const INTENT_MIN_MULTIPLIER = 0.5;

function intentMultiplier(intent: number, skill: number): number {
    if (intent >= INTENT_BASELINE) return 1.0;
    const deficit = (INTENT_BASELINE - intent) / INTENT_BASELINE;
    const skillFactor = skill / 100;
    return Math.max(INTENT_MIN_MULTIPLIER, 1 - deficit * skillFactor);
}

export function computeCapabilities(traits: PlayerTraits): PlayerCapabilities {
    const gs = traits.gameSense;

    const defendingSkill = traits.tackling * 0.35 + gs * 0.3 + traits.strength * 0.2 + traits.stamina * 0.15;
    const goalThreatSkill = traits.shooting * 0.4 + traits.dribbling * 0.25 + gs * 0.2 + traits.flair * 0.15;

    return {
        defending: defendingSkill * intentMultiplier(traits.defIntent, defendingSkill),
        playmaking: traits.passing * 0.35 + gs * 0.3 + traits.dribbling * 0.25 + traits.flair * 0.1,
        goalThreat: goalThreatSkill * intentMultiplier(traits.attIntent, goalThreatSkill),
        athleticism: traits.speed * 0.35 + traits.stamina * 0.35 + traits.strength * 0.15 + gs * 0.15,
        engine: (() => {
            const maxIntent = Math.max(traits.attIntent, traits.defIntent);
            const minIntent = Math.min(traits.attIntent, traits.defIntent);
            const intentScore = maxIntent * 0.8 + minIntent * 0.2;
            return intentScore * 0.4 + traits.stamina * 0.3 + traits.speed * 0.15 + gs * 0.15;
        })(),
        technique:
            traits.dribbling * 0.35 + traits.passing * 0.3 + gs * 0.15 + traits.shooting * 0.1 + traits.flair * 0.1,
    };
}

// ─── Archetype-Driven Quantities ────────────────────────────────────────────
// Overall, zone effectiveness, and labels all derive from the archetype now.
// These thin wrappers exist so callers don't need to know about archetypes.

/**
 * Zone effectiveness — best archetype quality per zone across ALL archetypes.
 * A complete player like JP shows high def (from Anchor score), high mid
 * (from Destroyer score), and high att (from Target Striker score) — an
 * honest cross-zone picture regardless of their primary label.
 */
export function computeZoneEffectiveness(traits: PlayerTraits): ZoneEffectiveness {
    return computeArchetypeProfile(traits).zones;
}

/**
 * Overall = the player's quality score under their best-fit archetype.
 * A Destroyer is rated as a destroyer; a Maestro is rated as a maestro.
 */
export function computeOverall(traits: PlayerTraits): number {
    const zones = computeArchetypeProfile(traits).zones;
    return Math.max(zones.def, zones.mid, zones.att);
}

// ─── Player Labels ──────────────────────────────────────────────────────────

export interface PlayerLabel {
    primary: string;
    secondary: string;
}

const ZONE_LABEL: Record<ZoneKey, string> = {
    def: "Defensive",
    mid: "Midfield",
    att: "Attacking",
};

/**
 * Display label for a player. Primary = archetype display name, secondary =
 * primary zone of that archetype. The same archetype always produces the same
 * label, which means the label and the position assignment can never disagree.
 */
export function computeLabel(traits: PlayerTraits): PlayerLabel {
    const profile = computeArchetypeProfile(traits);
    return {
        primary: profile.primary.def.displayName,
        secondary: ZONE_LABEL[profile.primary.def.primaryZone],
    };
}

export type { ArchetypeProfile, PlayerArchetype } from "@/lib/archetypes";
// Re-export archetype types and helpers for callers that want richer info
export { computeArchetypeProfile };
