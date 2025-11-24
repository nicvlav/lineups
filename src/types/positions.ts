/**
 * Core Position Definitions
 *
 * Static, immutable position metadata.
 * These are domain constants, not configuration.
 */

export type Position = 'GK' | 'CB' | 'FB' | 'DM' | 'CM' | 'WM' | 'AM' | 'ST' | 'WR';

export type Zone = 'goalkeeper' | 'defense' | 'midfield' | 'attack';

export const positionKeys: Position[] = [
  'GK',
  'CB',
  'FB',
  'DM',
  'CM',
  'WM',
  'AM',
  'ST',
  'WR',
] as const;

/**
 * Static position metadata
 * Defines intrinsic properties of each position
 */
export interface PositionDefinition {
  position: Position;
  name: string;
  shortName: string;
  isCentral: boolean;
  absoluteYPosition: number;
  priority: number; // Monte Carlo fill order (lower = filled first)
  zone: Zone;
}

/**
 * Immutable position definitions
 * Used for rendering, sorting, and game logic
 */
export const POSITIONS: Record<Position, PositionDefinition> = {
  GK: {
    position: 'GK',
    name: 'Goalkeeper',
    shortName: 'GK',
    isCentral: true,
    absoluteYPosition: 1.0,
    priority: 100,
    zone: 'goalkeeper'
  },
  AM: {
    position: 'AM',
    name: 'Attacking Mid',
    shortName: 'AM',
    isCentral: true,
    absoluteYPosition: 0.325,
    priority: 1,
    zone: 'midfield'
  },
  ST: {
    position: 'ST',
    name: 'Striker',
    shortName: 'ST',
    isCentral: true,
    absoluteYPosition: 0.175,
    priority: 2,
    zone: 'attack'
  },
  DM: {
    position: 'DM',
    name: 'Defensive Mid',
    shortName: 'DM',
    isCentral: true,
    absoluteYPosition: 0.5,
    priority: 2,
    zone: 'midfield'
  },
  CB: {
    position: 'CB',
    name: 'Center Back',
    shortName: 'CB',
    isCentral: true,
    absoluteYPosition: 0.675,
    priority: 3,
    zone: 'defense'
  },
  CM: {
    position: 'CM',
    name: 'Central Mid',
    shortName: 'CM',
    isCentral: true,
    absoluteYPosition: 0.45,
    priority: 3,
    zone: 'midfield'
  },
  WR: {
    position: 'WR',
    name: 'Winger',
    shortName: 'WR',
    isCentral: false,
    absoluteYPosition: 0.2,
    priority: 3,
    zone: 'attack'
  },
  WM: {
    position: 'WM',
    name: 'Wide Mid',
    shortName: 'WM',
    isCentral: false,
    absoluteYPosition: 0.4,
    priority: 4,
    zone: 'midfield'
  },
  FB: {
    position: 'FB',
    name: 'Full Back',
    shortName: 'FB',
    isCentral: false,
    absoluteYPosition: 0.65,
    priority: 6,
    zone: 'defense'
  },
} as const;

/**
 * Zone to positions mapping
 */
export const ZONE_POSITIONS: Record<Zone, Position[]> = {
  goalkeeper: ['GK'],
  defense: ['CB', 'FB'],
  midfield: ['DM', 'CM', 'WM', 'AM'],
  attack: ['ST', 'WR'],
} as const;

/**
 * Zone labels for display
 */
export const ZONE_LABELS: Record<Zone, string> = {
  goalkeeper: 'Goalkeeper',
  defense: 'Defense',
  midfield: 'Midfield',
  attack: 'Attack',
} as const;

/**
 * Get position definition by position key
 */
export function getPosition(position: Position): PositionDefinition {
  return POSITIONS[position];
}

/**
 * Get all positions in a zone
 */
export function getPositionsInZone(zone: Zone): PositionDefinition[] {
  return ZONE_POSITIONS[zone].map(pos => POSITIONS[pos]);
}

/**
 * Get positions sorted by priority (for Monte Carlo fill order)
 */
export function getPositionsSortedByPriority(): PositionDefinition[] {
  return Object.values(POSITIONS).sort((a, b) => a.priority - b.priority);
}

// Re-export Formation for backward compatibility
export type { Formation } from './formations';

// Re-export legacy utilities for backward compatibility
export {
  getPointForPosition,
  getThreatScore,
  emptyZoneScores
} from '../lib/utils/pitch-rendering';

export {
  normalizedDefaultWeights,
  PositionLabels,
  PositionShortLabels,
  type PositionWeighting,
  type Weighting
} from '../lib/utils/player-scoring';

// Export default zone weights as defaultZoneWeights for backward compatibility
export { normalizedDefaultWeights as defaultZoneWeights } from '../lib/utils/player-scoring';

// Re-export formationTemplates for backward compatibility
export { formationTemplates } from './formations';

// Re-export Point and ZoneScores from players
export type { Point, ZoneScores } from './players';
