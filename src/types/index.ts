/**
 * Core Types - Central Export Point
 *
 * Re-exports all types for easy importing throughout the codebase.
 * This allows gradual migration from old paths to new paths.
 */

// Archetypes
export type { Archetype } from "./archetypes";
export {
    ARCHETYPES,
    getArchetypeById,
    getArchetypeCountByPosition,
    getArchetypesForPosition,
} from "./archetypes";
// Formations
// Re-export Formation from positions for backward compatibility
export type { Formation, Formation as FormationCompat } from "./formations";
export {
    formationTemplates,
    getFormation,
    getFormationsForCount,
} from "./formations";
// Players
export type {
    FilledGamePlayer,
    GamePlayer,
    Player,
    PlayerArchetypeScores,
    PlayerWithArchetypes,
    Point,
    PositionAndScore,
    PositionedFilledGamePlayer,
    PositionedGamePlayer,
    PositionedScoredGamePlayer,
    ScoredGamePlayer,
    ZoneAverages,
    ZoneScores,
} from "./players";
export {
    emptyZoneScores,
    getBestArchetypeForPosition,
    getTopPositions,
    isPositionSpecialist,
} from "./players";
// Positions
export type {
    Position,
    PositionDefinition,
    Zone,
} from "./positions";
export {
    getPosition,
    getPositionsInZone,
    getPositionsSortedByPriority,
    POSITIONS,
    positionKeys,
    ZONE_LABELS,
    ZONE_POSITIONS,
} from "./positions";
// Stats
export type {
    PlayerStats,
    StatCategory,
    StatsKey,
} from "./stats";
export {
    CategorizedStats,
    defaultStatScores,
    StatCategoryKeys,
    StatCategoryNameMap,
    statColorsMap,
    statKeys,
    statLabelMap,
    statShortLabelMap,
} from "./stats";
