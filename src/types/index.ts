/**
 * Core Types - Central Export Point
 *
 * Re-exports all types for easy importing throughout the codebase.
 * This allows gradual migration from old paths to new paths.
 */

// Stats
export type {
  StatsKey,
  PlayerStats,
  StatCategory
} from './stats';

export {
  statKeys,
  statLabelMap,
  statShortLabelMap,
  statColorsMap,
  defaultStatScores,
  StatCategoryKeys,
  StatCategoryNameMap,
  CategorizedStats
} from './stats';

// Positions
export type {
  Position,
  PositionDefinition,
  Zone
} from './positions';

export {
  POSITIONS,
  ZONE_POSITIONS,
  ZONE_LABELS,
  positionKeys,
  getPosition,
  getPositionsInZone,
  getPositionsSortedByPriority
} from './positions';

// Archetypes
export type { Archetype } from './archetypes';

export {
  ARCHETYPES,
  getArchetypesForPosition,
  getArchetypeById,
  getArchetypeCountByPosition
} from './archetypes';

// Formations
export type { Formation } from './formations';

export {
  formationTemplates,
  getFormation,
  getFormationsForCount
} from './formations';

// Re-export Formation from positions for backward compatibility
export type { Formation as FormationCompat } from './formations';

// Players
export type {
  Point,
  ZoneScores,
  PlayerArchetypeScores,
  Player,
  PlayerWithArchetypes,
  GamePlayer,
  FilledGamePlayer,
  ScoredGamePlayer,
  ScoredGamePlayerWithThreat,
  PositionedGamePlayer,
  PositionedFilledGamePlayer,
  PositionedScoredGamePlayer,
  PositionedScoredGamePlayerWithThreat,
  PositionAndScore,
  ZoneAverages
} from './players';

export {
  emptyZoneScores,
  getTopPositions,
  getBestArchetypeForPosition,
  isPositionSpecialist
} from './players';
