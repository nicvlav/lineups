/**
 * Player Scoring Utilities
 *
 * Legacy scoring functions for backward compatibility.
 * New code should use the archetype system from @/lib/positions instead.
 */

import type { Player, ZoneScores } from '@/types/players';
import type { PlayerStats, StatCategory, StatsKey } from '@/types/stats';
import { CategorizedStats, statKeys } from '@/types/stats';
import { calculateArchetypeScores } from '@/lib/positions/calculator';
import { ARCHETYPES } from '@/types/archetypes';
import { POSITIONS, type Position } from '@/types/positions';

/**
 * Position weighting structure (legacy)
 */
export interface PositionWeighting {
  positionName: string;
  zone: string;
  shortName: string;
  weights: Record<StatsKey, number>;
  isCentral: boolean;
  absoluteYPosition: number;
  priorityStat: number;
}

/**
 * Legacy weighting type
 */
export type Weighting = Record<Position, PositionWeighting>;

/**
 * Calculate zone averages by stat category
 */
export interface ZoneAverages {
  technical: number;
  tactical: number;
  physical: number;
  mental: number;
}

/**
 * Get zone averages for a player
 */
export function getZoneAverages(player: Player): ZoneAverages {
  const result: ZoneAverages = {
    technical: 0,
    tactical: 0,
    physical: 0,
    mental: 0,
  };

  for (const [zone, stats] of Object.entries(CategorizedStats)) {
    const total = stats.reduce((sum, stat) => sum + player.stats[stat], 0);
    result[zone as StatCategory] = Math.round(total / stats.length);
  }

  return result;
}

/**
 * Calculate position scores using archetype system
 * (Replaces old calculateScoresForStats)
 *
 * @param stats - Player stats
 * @param _zoneWeights - Optional legacy weights (ignored, kept for backward compatibility)
 */
export function calculateScoresForStats(stats: PlayerStats, _zoneWeights?: Weighting): ZoneScores {
  // New implementation uses archetype system and ignores _zoneWeights
  const archetypeScores = calculateArchetypeScores(stats);

  const scores: ZoneScores = {
    GK: 0, CB: 0, FB: 0, DM: 0, CM: 0, WM: 0, AM: 0, ST: 0, WR: 0
  };

  for (const position of Object.keys(scores) as Position[]) {
    scores[position] = archetypeScores[position]?.bestScore ?? 0;
  }

  return scores;
}

/**
 * Normalize weights to sum to 1.0
 */
export function normalizeWeights(weights: Partial<Record<StatsKey, number>>): Record<StatsKey, number> {
  const normalized = {} as Record<StatsKey, number>;

  let total = 0;
  for (const key of statKeys) {
    total += weights[key] ?? 0;
  }

  if (total > 0) {
    for (const key of statKeys) {
      normalized[key] = (weights[key] ?? 0) / total;
    }
  } else {
    for (const key of statKeys) {
      normalized[key] = 0;
    }
  }

  return normalized;
}

/**
 * Create default zone weights from archetypes
 * Takes the first archetype for each position as the default
 */
export function createDefaultZoneWeights(): Weighting {
  const weights: Partial<Weighting> = {};

  for (const position of Object.values(POSITIONS)) {
    const archetypes = ARCHETYPES.filter(a => a.position === position.position);
    const firstArchetype = archetypes[0];

    if (firstArchetype) {
      weights[position.position] = {
        positionName: position.name,
        zone: position.zone,
        shortName: position.shortName,
        weights: firstArchetype.weights as Record<StatsKey, number>,
        isCentral: position.isCentral,
        absoluteYPosition: position.absoluteYPosition,
        priorityStat: position.priority
      };
    }
  }

  return weights as Weighting;
}

/**
 * Normalized default weights (legacy)
 * Initialized lazily to avoid circular dependencies
 */
let _normalizedDefaultWeights: Weighting | null = null;
export const normalizedDefaultWeights: Weighting = new Proxy({} as Weighting, {
  get(_target, prop) {
    if (!_normalizedDefaultWeights) {
      const defaultWeights = createDefaultZoneWeights();
      _normalizedDefaultWeights = { ...defaultWeights };

      for (const [_, posWeighting] of Object.entries(_normalizedDefaultWeights)) {
        posWeighting.weights = normalizeWeights(posWeighting.weights);
      }
    }
    return _normalizedDefaultWeights[prop as Position];
  }
});

/**
 * Position labels (legacy)
 */
export const PositionLabels: Record<Position, string> = {
  GK: "Goalkeeper",
  CB: "Center Back",
  FB: "Full back",
  DM: "Defensive Mid",
  CM: "Center Mid",
  WM: "Wide Mid",
  AM: "Attacking Mid",
  ST: "Striker",
  WR: "Winger",
} as const;

/**
 * Position short labels (legacy)
 */
export const PositionShortLabels: Record<Position, string> = {
  GK: "GK",
  CB: "CB",
  FB: "FB",
  DM: "DM",
  CM: "CM",
  WM: "WM",
  AM: "AM",
  ST: "ST",
  WR: "WR",
} as const;
