/**
 * Player Trait & Capability Definitions
 *
 * 13 observable traits (what voters rate) → 6 capability dimensions (what the radar displays).
 * Archetypes (src/lib/archetypes.ts) are the structural source of truth for labels,
 * zones, and position fits — capabilities are display-only.
 */

// ─── Traits (voter input) ───────────────────────────────────────────────────

export type TraitKey =
    | "speed"
    | "stamina"
    | "strength"
    | "tackling"
    | "passing"
    | "dribbling"
    | "shooting"
    | "gameSense"
    | "flair"
    | "attIntent"
    | "defIntent"
    | "finishing"
    | "aerial";

export const TRAIT_KEYS: TraitKey[] = [
    // Physical
    "speed",
    "stamina",
    "strength",
    "aerial",
    // Defending
    "tackling",
    // Technical
    "passing",
    "dribbling",
    "shooting",
    "flair",
    // Mental
    "gameSense",
    "finishing",
    "attIntent",
    "defIntent",
] as const;

export const traitLabelMap: Record<TraitKey, string> = {
    speed: "Speed",
    stamina: "Stamina",
    strength: "Strength",
    tackling: "Tackling",
    passing: "Passing",
    dribbling: "Dribbling",
    shooting: "Shooting",
    gameSense: "Game Sense",
    flair: "Flair",
    attIntent: "Attacking Intent",
    defIntent: "Defensive Intent",
    finishing: "Finishing",
    aerial: "Aerial",
};

export const traitShortLabelMap: Record<TraitKey, string> = {
    speed: "SPD",
    stamina: "STA",
    strength: "STR",
    tackling: "TAC",
    passing: "PAS",
    dribbling: "DRI",
    shooting: "SHO",
    gameSense: "SNS",
    flair: "FLA",
    attIntent: "ATT",
    defIntent: "DEF",
    finishing: "FIN",
    aerial: "AER",
};

/** Player's 13 trait scores (1-100) */
export type PlayerTraits = Record<TraitKey, number>;

export const defaultTraits: PlayerTraits = Object.fromEntries(TRAIT_KEYS.map((key) => [key, 50])) as PlayerTraits;

// ─── Capabilities (algorithm input) ─────────────────────────────────────────

export type CapabilityKey = "defending" | "playmaking" | "goalThreat" | "athleticism" | "engine" | "technique";

export const CAPABILITY_KEYS: CapabilityKey[] = [
    "defending",
    "playmaking",
    "goalThreat",
    "athleticism",
    "engine",
    "technique",
] as const;

export const capabilityLabelMap: Record<CapabilityKey, string> = {
    defending: "Defending",
    playmaking: "Playmaking",
    goalThreat: "Goal Threat",
    athleticism: "Athleticism",
    engine: "Engine",
    technique: "Technique",
};

export const capabilityShortLabelMap: Record<CapabilityKey, string> = {
    defending: "DEF",
    playmaking: "PLY",
    goalThreat: "GOL",
    athleticism: "ATH",
    engine: "ENG",
    technique: "TEC",
};

/** Player's 6 computed capability scores (1-100) */
export type PlayerCapabilities = Record<CapabilityKey, number>;

// ─── Zone Effectiveness ─────────────────────────────────────────────────────

export type ZoneKey = "def" | "mid" | "att";

export const ZONE_KEYS: ZoneKey[] = ["def", "mid", "att"] as const;

export const zoneLabelMap: Record<ZoneKey, string> = {
    def: "Defence",
    mid: "Midfield",
    att: "Attack",
};

/** How effective a player is in each zone (1-100) */
export type ZoneEffectiveness = Record<ZoneKey, number>;

// ─── DB Mapping ─────────────────────────────────────────────────────────────

/** Frontend camelCase → DB snake_case for trait columns on player_votes */
export const TRAIT_TO_DB: Record<TraitKey, string> = {
    speed: "speed",
    stamina: "stamina",
    strength: "strength",
    tackling: "tackling",
    passing: "passing",
    dribbling: "dribbling",
    shooting: "shooting",
    gameSense: "game_sense",
    flair: "flair",
    attIntent: "att_intent",
    defIntent: "def_intent",
    finishing: "finishing",
    aerial: "aerial",
};

/** DB snake_case → frontend camelCase */
export const DB_TO_TRAIT: Record<string, TraitKey> = Object.fromEntries(
    Object.entries(TRAIT_TO_DB).map(([trait, db]) => [db, trait as TraitKey])
) as Record<string, TraitKey>;

/** Frontend camelCase → DB _avg column on players table */
export const TRAIT_TO_AVG_COL: Record<TraitKey, string> = Object.fromEntries(
    Object.entries(TRAIT_TO_DB).map(([trait, db]) => [trait, `${db}_avg`])
) as Record<TraitKey, string>;

/** DB _avg column → frontend camelCase */
export const AVG_COL_TO_TRAIT: Record<string, TraitKey> = Object.fromEntries(
    Object.entries(TRAIT_TO_DB).map(([trait, db]) => [`${db}_avg`, trait as TraitKey])
) as Record<string, TraitKey>;
