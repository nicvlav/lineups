/**
 * Position & Archetype System
 *
 * Central export point for all position and archetype functionality.
 */

export type { Archetype } from "@/types/archetypes";
// Archetype definitions and utilities
export {
    ARCHETYPES,
    getArchetypeById,
    getArchetypeCountByPosition,
    getArchetypesForPosition,
} from "@/types/archetypes";
export type { PlayerArchetypeScores, PlayerWithArchetypes } from "@/types/players";
// Player utilities
export {
    getBestArchetypeForPosition,
    getTopPositions,
    isPositionSpecialist,
} from "@/types/players";
// Core types
export type { Position, PositionDefinition, Zone } from "@/types/positions";
// Position definitions and utilities
export {
    getPosition,
    getPositionsInZone,
    getPositionsSortedByPriority,
    POSITIONS,
    positionKeys,
    ZONE_LABELS,
    ZONE_POSITIONS,
} from "@/types/positions";

// Calculation utilities
export {
    calculateArchetypeScores,
    calculateZoneScores,
    getPositionScores,
    normalizeWeights,
} from "./calculator";
