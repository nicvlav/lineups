/**
 * Position & Archetype System
 *
 * Central export point for all position and archetype functionality.
 */

// Core types
export type { Position, PositionDefinition, Zone } from '@/types/positions';
export type { Archetype } from '@/types/archetypes';
export type { PlayerArchetypeScores, PlayerWithArchetypes } from '@/types/players';

// Position definitions and utilities
export {
  POSITIONS,
  ZONE_POSITIONS,
  ZONE_LABELS,
  positionKeys,
  getPosition,
  getPositionsInZone,
  getPositionsSortedByPriority
} from '@/types/positions';

// Archetype definitions and utilities
export {
  ARCHETYPES,
  getArchetypesForPosition,
  getArchetypeById,
  getArchetypeCountByPosition
} from '@/types/archetypes';

// Player utilities
export {
  getTopPositions,
  getBestArchetypeForPosition,
  isPositionSpecialist
} from '@/types/players';

// Calculation utilities
export {
  calculateArchetypeScores,
  getPositionScores,
  calculateZoneScores,
  normalizeWeights
} from './calculator';
