/**
 * Archetype Score Calculator
 *
 * Calculates player scores for all archetypes across all positions.
 * Uses normalized stat weights to produce scores in 0-100 range.
 */

import { getArchetypesForPosition } from '@/types/archetypes';
import { positionKeys, type Position } from '@/types/positions';
import type { PlayerArchetypeScores } from '@/types/players';
import type { PlayerStats, StatsKey } from '@/types/stats';
import { statKeys } from '@/types/stats';

/**
 * Normalize stat weights to sum to 1.0
 * This ensures scores are comparable across archetypes
 */
export function normalizeWeights(
  weights: Partial<Record<StatsKey, number>>
): Record<StatsKey, number> {
  const normalized = {} as Record<StatsKey, number>;

  // Calculate sum of all weights
  let total = 0;
  for (const key of statKeys) {
    total += weights[key] ?? 0;
  }

  // Normalize each weight
  if (total > 0) {
    for (const key of statKeys) {
      normalized[key] = (weights[key] ?? 0) / total;
    }
  } else {
    // Edge case: all weights are 0
    for (const key of statKeys) {
      normalized[key] = 0;
    }
  }

  return normalized;
}

/**
 * Calculate score for a single archetype
 * Returns a score in 0-100 range
 */
function calculateArchetypeScore(
  rawStats: PlayerStats,
  weights: Partial<Record<StatsKey, number>>
): number {
  const normalized = normalizeWeights(weights);

  let score = 0;
  for (const statKey of statKeys) {
    const weight = normalized[statKey];
    const statValue = rawStats[statKey];
    score += statValue * weight;
  }

  return score;
}

/**
 * Calculate all archetype scores for a player
 * Returns nested structure: position -> archetype scores
 */
export function calculateArchetypeScores(rawStats: PlayerStats): PlayerArchetypeScores {
  const result: PlayerArchetypeScores = {};

  // Calculate scores for each position
  for (const position of positionKeys) {
    const archetypes = getArchetypesForPosition(position);

    if (archetypes.length === 0) {
      // Position has no archetypes (shouldn't happen with current data)
      continue;
    }

    // Calculate score for each archetype in this position
    const archetypeScores: Record<string, number> = {};
    let bestScore = 0;
    let bestArchetypeId = archetypes[0].id;

    for (const archetype of archetypes) {
      const score = calculateArchetypeScore(rawStats, archetype.weights);
      archetypeScores[archetype.id] = score;

      if (score > bestScore) {
        bestScore = score;
        bestArchetypeId = archetype.id;
      }
    }

    // Store result for this position
    result[position] = {
      bestScore,
      bestArchetypeId,
      archetypes: archetypeScores
    };
  }

  return result;
}

/**
 * Get position scores (best archetype score per position)
 * Returns simple Position -> score mapping for compatibility with old system
 */
export function getPositionScores(archetypeScores: PlayerArchetypeScores): Record<Position, number> {
  const scores = {} as Record<Position, number>;

  for (const position of positionKeys) {
    scores[position] = archetypeScores[position]?.bestScore ?? 0;
  }

  return scores;
}

/**
 * Calculate zone fit scores (for backward compatibility with old ZoneScores type)
 * Takes best archetype score for each position
 */
export function calculateZoneScores(rawStats: PlayerStats): Record<Position, number> {
  const archetypeScores = calculateArchetypeScores(rawStats);
  return getPositionScores(archetypeScores);
}

/**
 * Get top N archetypes across ALL positions within an absolute score threshold
 * Used for showing player's best archetype fits regardless of position
 * Excludes goalkeepers
 *
 * @param archetypeScores - Player's archetype scores
 * @param maxCount - Maximum number of archetypes to return (default 5)
 * @param thresholdDifference - Absolute score difference from best to include (default 3)
 * @returns Array of {position, archetypeId, score} sorted by score descending
 */
export function getTopArchetypes(
  archetypeScores: PlayerArchetypeScores,
  maxCount: number = 5,
  thresholdDifference: number = 3
): Array<{ position: Position; archetypeId: string; score: number }> {
  const allArchetypes: Array<{ position: Position; archetypeId: string; score: number }> = [];

  // Collect all archetype scores across all positions (excluding GK)
  for (const position of positionKeys) {
    if (position === 'GK') continue; // Skip goalkeepers
    const posData = archetypeScores[position];
    if (!posData) continue;

    for (const [archetypeId, score] of Object.entries(posData.archetypes)) {
      allArchetypes.push({ position, archetypeId, score });
    }
  }

  // Sort by score descending
  allArchetypes.sort((a, b) => b.score - a.score);

  // Find threshold based on absolute difference from best score
  if (allArchetypes.length === 0) return [];
  const bestScore = allArchetypes[0].score;
  const threshold = bestScore - thresholdDifference;

  // Filter by threshold and limit count
  return allArchetypes
    .slice(0, maxCount)
    .filter(item => item.score >= threshold);
}

/**
 * Get top position groups with their archetypes within absolute threshold of player's BEST archetype
 * Only includes positions where at least one archetype meets the threshold
 * Sub-archetypes must be within threshold of the GLOBAL best score (not position's best)
 *
 * @param archetypeScores - Player's archetype scores
 * @param maxPositions - Maximum number of position groups to return (default 5)
 * @param thresholdDifference - Absolute score difference from best to include archetypes (default 3)
 * @returns Array of position groups with archetypes meeting threshold
 */
export function getTopPositionGroups(
  archetypeScores: PlayerArchetypeScores,
  maxPositions: number = 5,
  thresholdDifference: number = 3
): Array<{
  position: Position;
  archetypes: Array<{ archetypeId: string; score: number; isBest: boolean }>;
}> {
  // Find global best score across all archetypes (excluding GK)
  let globalBestScore = 0;
  for (const position of positionKeys) {
    if (position === 'GK') continue; // Skip goalkeepers
    const posData = archetypeScores[position];
    if (posData && posData.bestScore > globalBestScore) {
      globalBestScore = posData.bestScore;
    }
  }

  const threshold = globalBestScore - thresholdDifference;
  const groups: Array<{
    position: Position;
    bestPositionScore: number;
    archetypes: Array<{ archetypeId: string; score: number; isBest: boolean }>;
  }> = [];

  // Build groups for each position (excluding GK)
  for (const position of positionKeys) {
    if (position === 'GK') continue; // Skip goalkeepers
    const posData = archetypeScores[position];
    if (!posData) continue;

    const { bestArchetypeId, archetypes } = posData;

    // Filter archetypes that meet the global threshold
    const qualifyingArchetypes = Object.entries(archetypes)
      .filter(([_, score]) => score >= threshold)
      .map(([archetypeId, score]) => ({
        archetypeId,
        score,
        isBest: archetypeId === bestArchetypeId
      }))
      .sort((a, b) => b.score - a.score);

    // Only include position if it has at least one qualifying archetype
    if (qualifyingArchetypes.length > 0) {
      groups.push({
        position,
        bestPositionScore: posData.bestScore,
        archetypes: qualifyingArchetypes
      });
    }
  }

  // Sort by best position score and limit to maxPositions
  groups.sort((a, b) => b.bestPositionScore - a.bestPositionScore);

  return groups.slice(0, maxPositions).map(({ position, archetypes }) => ({
    position,
    archetypes
  }));
}

/**
 * Get all positions grouped by their best archetype scores
 * Used for displaying complete position breakdown in expanded view
 * Excludes goalkeepers
 *
 * @param archetypeScores - Player's archetype scores
 * @returns Array of all position groups sorted by best score
 */
export function getAllPositionArchetypeGroups(
  archetypeScores: PlayerArchetypeScores
): Array<{
  position: Position;
  bestScore: number;
  bestArchetypeId: string;
  allArchetypes: Array<{ archetypeId: string; score: number }>;
}> {
  const groups: Array<{
    position: Position;
    bestScore: number;
    bestArchetypeId: string;
    allArchetypes: Array<{ archetypeId: string; score: number }>;
  }> = [];

  for (const position of positionKeys) {
    if (position === 'GK') continue; // Skip goalkeepers
    const posData = archetypeScores[position];
    if (!posData) continue;

    const { bestScore, bestArchetypeId, archetypes } = posData;

    // Get all archetypes sorted by score
    const allArchetypes = Object.entries(archetypes)
      .map(([archetypeId, score]) => ({ archetypeId, score }))
      .sort((a, b) => b.score - a.score);

    groups.push({
      position,
      bestScore,
      bestArchetypeId,
      allArchetypes
    });
  }

  // Sort by best score descending
  groups.sort((a, b) => b.bestScore - a.bestScore);

  return groups;
}
