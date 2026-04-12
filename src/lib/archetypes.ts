/**
 * Player Archetype System
 *
 * The single source of truth for "what kind of player is this". Replaces the
 * old capability-driven label / zone / position logic with a catalog of
 * concrete player types, each with explicit detection rules and downstream
 * metadata (positions, zone affinities, quality scoring).
 *
 * Key principles:
 *   - Detection reads TRAITS, not capabilities. Capabilities are derived
 *     numbers and have already proven fragile (athletic-cap = strong + smart,
 *     not necessarily fast). Traits are the raw vote inputs.
 *   - Quality is per-archetype: a Destroyer's quality function rewards
 *     destroyer traits, a Maestro's rewards creator traits. Each function
 *     uses weights that sum to 1.0, producing a 0-100 score on the same scale.
 *   - Best-fit by quality: a player can match multiple archetypes; the one
 *     with the highest quality score wins. No strict priority order.
 *   - Zone affinity: each archetype maps to all three zones (def/mid/att)
 *     with weights. The primary zone is 1.0, others 0.35-0.85 depending on
 *     how flexibly the type can drop in.
 *   - Position preference: ordered list. The position assigner uses this to
 *     decide where each player slots. A linear falloff (1.0 → 0.85 → 0.7…)
 *     scores the player at each preference rank.
 */

import type { Position } from "@/types/positions";
import type { PlayerTraits, ZoneEffectiveness, ZoneKey } from "@/types/traits";

// ─── Catalog Types ──────────────────────────────────────────────────────────

export type ArchetypeId =
    | "anchor"
    | "athletic_defender"
    | "ball_playing_defender"
    | "full_back"
    | "destroyer"
    | "deep_playmaker"
    | "box_to_box"
    | "maestro"
    | "pace_merchant"
    | "winger"
    | "inside_forward"
    | "target_striker"
    | "playmaker"
    | "pressing_forward"
    | "versatile";

export interface ArchetypeDef {
    id: ArchetypeId;
    /** Label shown to the user */
    displayName: string;
    /** Primary zone — used for the secondary tag and for default classification */
    primaryZone: ZoneKey;
    /** How effective this type is in each zone, scaled by quality */
    zoneAffinity: ZoneEffectiveness;
    /** Ordered position preferences, best-fit first */
    positionPreference: Position[];
    /** Power curve exponent for zone contribution scaling.
     *  1.0 = linear (no compression, respectable archetype).
     *  >1.0 = compresses high scores (limited archetype — speed alone isn't skill).
     *  Formula: (quality/100)^scale * 100.
     *  Only Pace Merchant gets meaningful compression (~1.6). */
    scale: number;
    /** Returns true if this archetype is a plausible fit for the traits */
    detect: (traits: PlayerTraits) => boolean;
    /** Returns a 0-100 score for how well the player embodies this archetype */
    quality: (traits: PlayerTraits) => number;
}

/** A specific player's classification — pairs an archetype def with their quality */
export interface PlayerArchetype {
    id: ArchetypeId;
    def: ArchetypeDef;
    quality: number;
}

// ─── Catalog ────────────────────────────────────────────────────────────────
// Each entry is a complete player type. Detect rules are conservative (false
// matches are worse than missed matches — players who don't match anything
// fall through to Versatile). Quality functions use weights summing to 1.0.

export const ARCHETYPES: ArchetypeDef[] = [
    {
        id: "anchor",
        displayName: "Anchor",
        primaryZone: "def",
        zoneAffinity: { def: 1.0, mid: 0.6, att: 0.35 },
        positionPreference: ["CB", "DM", "FB"],
        scale: 1.0,
        detect: (t) => t.tackling >= 70 && t.defIntent >= 65 && t.speed < 78,
        quality: (t) =>
            t.tackling * 0.25 +
            t.defIntent * 0.2 +
            t.strength * 0.15 +
            t.gameSense * 0.15 +
            t.stamina * 0.15 +
            t.aerial * 0.1,
    },
    {
        id: "athletic_defender",
        displayName: "Athletic Defender",
        primaryZone: "def",
        zoneAffinity: { def: 1.0, mid: 0.65, att: 0.5 },
        positionPreference: ["CB", "FB", "DM"],
        scale: 1.0,
        detect: (t) => t.tackling >= 65 && t.speed >= 75 && t.strength >= 60 && t.defIntent >= 60,
        quality: (t) =>
            t.tackling * 0.2 +
            t.speed * 0.2 +
            t.strength * 0.15 +
            t.stamina * 0.1 +
            t.defIntent * 0.15 +
            t.gameSense * 0.1 +
            t.aerial * 0.1,
    },
    {
        id: "ball_playing_defender",
        displayName: "Ball-Playing Defender",
        primaryZone: "def",
        zoneAffinity: { def: 1.0, mid: 0.8, att: 0.5 },
        positionPreference: ["CB", "DM", "FB"],
        scale: 1.0,
        detect: (t) => t.tackling >= 65 && t.passing >= 70 && t.gameSense >= 70 && t.defIntent >= 60,
        quality: (t) =>
            t.tackling * 0.2 +
            t.passing * 0.2 +
            t.gameSense * 0.15 +
            t.defIntent * 0.15 +
            t.strength * 0.1 +
            t.stamina * 0.1 +
            t.aerial * 0.1,
    },
    {
        id: "full_back",
        displayName: "Full Back",
        primaryZone: "def",
        zoneAffinity: { def: 0.95, mid: 0.75, att: 0.55 },
        positionPreference: ["FB", "WM", "CB"],
        scale: 1.0,
        detect: (t) => t.speed >= 70 && t.stamina >= 65 && t.tackling >= 50 && t.tackling < 75 && t.defIntent >= 55,
        quality: (t) =>
            t.speed * 0.2 +
            t.stamina * 0.2 +
            t.tackling * 0.15 +
            t.defIntent * 0.15 +
            t.passing * 0.1 +
            t.dribbling * 0.1 +
            t.gameSense * 0.1,
    },
    {
        id: "destroyer",
        displayName: "Destroyer",
        primaryZone: "mid",
        zoneAffinity: { def: 0.85, mid: 1.0, att: 0.45 },
        positionPreference: ["DM", "CM", "CB"],
        scale: 1.0,
        detect: (t) => t.tackling >= 70 && t.defIntent >= 70 && t.stamina >= 65 && (t.strength >= 65 || t.speed >= 70),
        quality: (t) =>
            t.tackling * 0.25 +
            t.defIntent * 0.2 +
            t.stamina * 0.15 +
            t.strength * 0.15 +
            t.gameSense * 0.15 +
            t.speed * 0.1,
    },
    {
        id: "deep_playmaker",
        displayName: "Deep Playmaker",
        primaryZone: "mid",
        zoneAffinity: { def: 0.8, mid: 1.0, att: 0.65 },
        positionPreference: ["DM", "CM", "AM"],
        scale: 1.0,
        detect: (t) => t.passing >= 75 && t.gameSense >= 75 && t.defIntent >= 65 && t.tackling >= 60,
        quality: (t) =>
            t.passing * 0.25 +
            t.gameSense * 0.25 +
            t.defIntent * 0.15 +
            t.tackling * 0.15 +
            t.dribbling * 0.1 +
            t.flair * 0.1,
    },
    {
        id: "box_to_box",
        displayName: "Box-to-Box",
        primaryZone: "mid",
        zoneAffinity: { def: 0.85, mid: 1.0, att: 0.7 },
        positionPreference: ["CM", "DM", "AM"],
        scale: 1.0,
        detect: (t) => t.stamina >= 75 && t.attIntent >= 65 && t.defIntent >= 65 && t.passing >= 60 && t.tackling >= 55,
        quality: (t) =>
            t.stamina * 0.2 +
            t.attIntent * 0.15 +
            t.defIntent * 0.15 +
            t.passing * 0.15 +
            t.tackling * 0.1 +
            t.speed * 0.15 +
            t.gameSense * 0.1,
    },
    {
        id: "maestro",
        displayName: "Maestro",
        primaryZone: "mid",
        zoneAffinity: { def: 0.5, mid: 1.0, att: 0.85 },
        positionPreference: ["AM", "CM", "WM"],
        scale: 1.0,
        detect: (t) => t.passing >= 75 && (t.dribbling >= 75 || t.flair >= 75) && t.gameSense >= 70,
        quality: (t) =>
            t.passing * 0.25 +
            t.dribbling * 0.2 +
            t.gameSense * 0.2 +
            t.flair * 0.15 +
            t.attIntent * 0.1 +
            t.shooting * 0.1,
    },
    {
        id: "pace_merchant",
        displayName: "Pace Merchant",
        primaryZone: "att",
        zoneAffinity: { def: 0.45, mid: 0.7, att: 1.0 },
        positionPreference: ["WR", "WM", "ST"],
        scale: 1.3,
        detect: (t) => t.speed >= 80 && t.dribbling >= 60 && t.passing < 75 && t.attIntent >= 60,
        quality: (t) =>
            t.speed * 0.25 +
            t.stamina * 0.15 +
            t.dribbling * 0.15 +
            t.attIntent * 0.15 +
            t.shooting * 0.1 +
            t.gameSense * 0.1 +
            t.flair * 0.1,
    },
    {
        id: "winger",
        displayName: "Winger",
        primaryZone: "att",
        zoneAffinity: { def: 0.5, mid: 0.85, att: 1.0 },
        positionPreference: ["WR", "AM", "WM"],
        scale: 1.0,
        detect: (t) => t.speed >= 75 && t.dribbling >= 70 && t.flair >= 65 && t.passing >= 60,
        quality: (t) =>
            t.speed * 0.2 +
            t.dribbling * 0.25 +
            t.gameSense * 0.15 +
            t.passing * 0.15 +
            t.shooting * 0.1 +
            t.flair * 0.1 +
            t.attIntent * 0.05,
    },
    {
        id: "inside_forward",
        displayName: "Inside Forward",
        primaryZone: "att",
        zoneAffinity: { def: 0.45, mid: 0.8, att: 1.0 },
        positionPreference: ["WR", "ST", "AM"],
        scale: 1.0,
        detect: (t) => t.speed >= 70 && t.shooting >= 70 && t.dribbling >= 70 && t.attIntent >= 70 && t.finishing >= 60,
        quality: (t) =>
            t.shooting * 0.2 +
            t.dribbling * 0.2 +
            t.speed * 0.15 +
            t.finishing * 0.15 +
            t.attIntent * 0.1 +
            t.gameSense * 0.1 +
            t.flair * 0.1,
    },
    {
        id: "target_striker",
        displayName: "Target Striker",
        primaryZone: "att",
        zoneAffinity: { def: 0.35, mid: 0.65, att: 1.0 },
        positionPreference: ["ST", "AM"],
        scale: 1.0,
        detect: (t) => t.shooting >= 70 && t.strength >= 70 && t.attIntent >= 65 && t.finishing >= 70,
        quality: (t) =>
            t.shooting * 0.2 +
            t.finishing * 0.2 +
            t.strength * 0.15 +
            t.aerial * 0.15 +
            t.attIntent * 0.1 +
            t.gameSense * 0.1 +
            t.stamina * 0.1,
    },
    {
        id: "pressing_forward",
        displayName: "Pressing Forward",
        primaryZone: "att",
        zoneAffinity: { def: 0.5, mid: 0.8, att: 1.0 },
        positionPreference: ["ST", "AM", "WR"],
        scale: 1.0,
        detect: (t) => t.shooting >= 65 && t.stamina >= 75 && t.attIntent >= 75 && t.finishing >= 55,
        quality: (t) =>
            t.shooting * 0.15 +
            t.stamina * 0.2 +
            t.attIntent * 0.15 +
            t.speed * 0.15 +
            t.finishing * 0.1 +
            t.gameSense * 0.1 +
            t.dribbling * 0.1 +
            t.tackling * 0.05,
    },
    {
        // Cerebral creator — great passer and reader of the game but doesn't
        // need flair or dribbling. The Lampard / late Gerrard / KDB-from-deep type.
        // Distinct from Maestro (who needs flash) and Deep Playmaker (who defends).
        id: "playmaker",
        displayName: "Playmaker",
        primaryZone: "mid",
        zoneAffinity: { def: 0.55, mid: 1.0, att: 0.8 },
        positionPreference: ["AM", "CM", "WM"],
        scale: 1.0,
        detect: (t) => t.passing >= 75 && t.gameSense >= 75,
        quality: (t) =>
            t.passing * 0.25 +
            t.gameSense * 0.25 +
            t.shooting * 0.15 +
            t.dribbling * 0.1 +
            t.attIntent * 0.1 +
            t.stamina * 0.1 +
            t.flair * 0.05,
    },
    {
        id: "versatile",
        displayName: "Versatile",
        primaryZone: "mid",
        zoneAffinity: { def: 0.85, mid: 1.0, att: 0.85 },
        positionPreference: ["CM", "AM", "FB", "WM"],
        scale: 1.1,
        // Always detects — used as the fallback when nothing else matches
        detect: () => true,
        quality: (t) =>
            (t.tackling +
                t.passing +
                t.dribbling +
                t.shooting +
                t.gameSense +
                t.stamina +
                t.speed +
                t.strength +
                t.flair +
                t.attIntent +
                t.defIntent +
                t.finishing +
                t.aerial) /
            13,
    },
];

// Lookup by ID for fast access elsewhere
const ARCHETYPES_BY_ID = new Map(ARCHETYPES.map((a) => [a.id, a]));

export function getArchetypeById(id: ArchetypeId): ArchetypeDef {
    const def = ARCHETYPES_BY_ID.get(id);
    if (!def) throw new Error(`Unknown archetype: ${id}`);
    return def;
}

// ─── Full Archetype Profile ─────────────────────────────────────────────────

/** A single archetype's quality score for a player */
export interface ArchetypeScore {
    id: ArchetypeId;
    displayName: string;
    primaryZone: ZoneKey;
    quality: number;
    scale: number;
    detected: boolean;
}

/** Complete archetype analysis of a player */
export interface ArchetypeProfile {
    /** Primary archetype — best quality among DETECTED archetypes.
     *  This drives the label and position preference. */
    primary: PlayerArchetype;
    /** All archetype scores, sorted by quality descending.
     *  Used for zone effectiveness and the "top archetypes" display. */
    allScores: ArchetypeScore[];
    /** Zone effectiveness — best archetype quality per zone across ALL
     *  archetypes (not just detected ones). This gives an honest view of
     *  a player's zone ability, e.g. JP (Target Striker) still shows high
     *  def zone because his Anchor score is elite too. */
    zones: ZoneEffectiveness;
}

// ─── Detection ──────────────────────────────────────────────────────────────

/**
 * Compute the best-fit archetype for a player (primary label only).
 *
 * Walks the catalog, collects every archetype whose detect() returns true,
 * computes their quality scores, and returns the one with the highest score.
 */
export function computeArchetype(traits: PlayerTraits): PlayerArchetype {
    return computeArchetypeProfile(traits).primary;
}

/**
 * Compute the FULL archetype profile for a player — primary archetype,
 * all quality scores, and honest zone effectiveness.
 *
 * Quality is computed for ALL 14 archetypes regardless of detect() — the
 * quality functions naturally produce low scores for poor fits. detect()
 * only gates which archetype becomes the PRIMARY (label/position driver).
 *
 * Zone effectiveness = best archetype quality per zone. A complete player
 * like JP will show high scores in all three zones because they fit elite
 * archetypes in each zone.
 */
export function computeArchetypeProfile(traits: PlayerTraits): ArchetypeProfile {
    // Compute quality for ALL archetypes
    const allScores: ArchetypeScore[] = ARCHETYPES.map((def) => ({
        id: def.id,
        displayName: def.displayName,
        primaryZone: def.primaryZone,
        quality: def.quality(traits),
        scale: def.scale,
        detected: def.detect(traits),
    })).sort((a, b) => b.quality - a.quality);

    // Primary = best SCALED quality among DETECTED archetypes.
    // Scaling must gate the label too — a Pace Merchant whose scaled score is
    // lower than their Winger score should be labeled Winger, not PM.
    let primary: PlayerArchetype | null = null;
    for (const score of allScores) {
        if (!score.detected) continue;
        const scaled = (score.quality / 100) ** score.scale * 100;
        if (!primary || scaled > primary.quality) {
            primary = { id: score.id, def: getArchetypeById(score.id), quality: scaled };
        }
    }
    if (!primary) {
        const versatile = getArchetypeById("versatile");
        const q = versatile.quality(traits);
        primary = { id: versatile.id, def: versatile, quality: (q / 100) ** versatile.scale * 100 };
    }

    // Zone effectiveness = best SCALED quality per zone across ALL archetypes.
    // Each archetype's zone contribution is run through a power curve:
    //   scaled = (quality/100)^scale * 100
    // Scale 1.0 = linear (no change). Scale >1.0 = compresses high scores.
    // Only Pace Merchant (1.6) gets meaningful compression — everyone else is
    // a respectable archetype at 1.0.
    const zones: ZoneEffectiveness = { def: 0, mid: 0, att: 0 };
    for (const score of allScores) {
        const scaled = (score.quality / 100) ** score.scale * 100;
        if (scaled > zones[score.primaryZone]) {
            zones[score.primaryZone] = scaled;
        }
    }

    return { primary, allScores, zones };
}

// ─── Position Fit from Archetype ────────────────────────────────────────────

/**
 * Score how well a player fits a specific position based on their archetype's
 * position preference list. Returns 0 if the position isn't in the preferences.
 *
 * Linear falloff: index 0 (top preference) = 1.0, index 1 = 0.85, index 2 = 0.7,
 * index 3 = 0.55, etc. Caps at 0.3 minimum so even distant preferences are
 * better than zero.
 */
const POSITION_FALLOFF = [1.0, 0.85, 0.7, 0.55, 0.4, 0.3];

export function positionFitWeight(pa: PlayerArchetype, position: Position): number {
    const idx = pa.def.positionPreference.indexOf(position);
    if (idx < 0) return 0;
    return POSITION_FALLOFF[Math.min(idx, POSITION_FALLOFF.length - 1)];
}

/**
 * Convenience: score the player at a position by combining their quality
 * with the archetype's position preference weight.
 */
export function positionScoreFromArchetype(pa: PlayerArchetype, position: Position): number {
    return pa.quality * positionFitWeight(pa, position);
}
