/**
 * Auto-Balance Adapters
 *
 * Bridges the new archetype-based player system with the existing FastPlayer format
 * used by the auto-balance algorithm. This keeps the core algorithm unchanged.
 */

import type { PlayerArchetypeScores, ScoredGamePlayer } from '@/types/players';
import type { FastPlayer } from './types';
import type { BalanceConfiguration } from './metrics-config';
import { POSITION_COUNT, INDEX_TO_POSITION, ZONE_POSITIONS } from './constants';
import { getPositionScores } from '@/lib/positions/calculator';
import { classifyStarPlayerByZone } from './metrics';

/**
 * Convert player with archetype scores to FastPlayer for auto-balance
 * Takes BEST archetype score per position (keeps algorithm unchanged)
 */
export function archetypeScoresToFastPlayer(
  archetypeScores: PlayerArchetypeScores,
  originalPlayer: ScoredGamePlayer
): FastPlayer {
  const scores = new Float32Array(POSITION_COUNT);

  // Extract best score for each position
  for (let i = 0; i < POSITION_COUNT; i++) {
    const position = INDEX_TO_POSITION[i];
    const posData = archetypeScores[position];
    scores[i] = posData?.bestScore ?? 0;
  }

  // Find best position overall
  let bestScore = 0;
  let bestPosition = 0;
  let secondBestScore = 0;

  for (let i = 0; i < POSITION_COUNT; i++) {
    if (scores[i] > bestScore) {
      secondBestScore = bestScore;
      bestScore = scores[i];
      bestPosition = i;
    } else if (scores[i] > secondBestScore) {
      secondBestScore = scores[i];
    }
  }

  return {
    original: originalPlayer,
    scores,
    bestScore,
    bestPosition,
    secondBestScore,
    specializationRatio: secondBestScore > 0 ? bestScore / secondBestScore : 1,
    assignedPosition: -1,
    team: null,
    // Pre-calculated analytics (initialized to 0, calculated by preCalculatePlayerAnalytics)
    creativityScore: 0,
    strikerScore: 0,
    staminaScore: 0,
    attWorkrateScore: 0,
    defWorkrateScore: 0,
    zoneScores: new Float32Array(4),
    primaryZone: 0,
    isStarPlayer: false,
    starTier: 0,
    isSpecialist: false,
    starClassification: null
  };
}

/**
 * Convert new Player format to legacy ScoredGamePlayer format
 * This allows gradual migration from old to new types
 */
export function playerWithArchetypesToScoredGamePlayer(
  player: {
    id: string;
    name: string;
    archetypeScores: PlayerArchetypeScores;
    rawStats: any;
  },
  team: string = '',
  position: { x: number; y: number } = { x: 0.5, y: 0.5 }
): ScoredGamePlayer {
  const positionScores = getPositionScores(player.archetypeScores);

  return {
    id: player.id,
    name: player.name,
    guest_name: null,
    team,
    position,
    exactPosition: null,
    zoneFit: positionScores,
    stats: player.rawStats
  };
}

/**
 * Bulk convert array of players with archetypes to FastPlayer array
 */
export function convertPlayersToFastPlayers(
  players: Array<{
    id: string;
    name: string;
    archetypeScores: PlayerArchetypeScores;
    rawStats: any;
  }>
): FastPlayer[] {
  return players.map(player => {
    const scoredPlayer = playerWithArchetypesToScoredGamePlayer(player);
    return archetypeScoresToFastPlayer(player.archetypeScores, scoredPlayer);
  });
}

/**
 * Pre-calculate all player analytics before Monte Carlo simulation
 * This moves expensive calculations outside the Monte Carlo loop for massive performance gains
 *
 * Calculates:
 * - Weighted creativity, striker, and energy scores
 * - Zone-based best scores
 * - Star player classification
 * - Specialist detection
 *
 * @param players Array of FastPlayers to analyze
 * @param config Balance configuration with formula weights and star thresholds
 */
export function preCalculatePlayerAnalytics(
  players: FastPlayer[],
  config: BalanceConfiguration
): void {
  const creativityFormula = config.formulas.creativity;
  const strikerFormula = config.formulas.striker;
  const starThreshold = config.starPlayers.absoluteMinimum;

  for (const player of players) {
    const stats = player.original.stats;

    // Calculate weighted stat scores (if stats exist)
    if (stats) {
      // Creativity score (vision + teamwork + decisions + passing + composure)
      player.creativityScore =
        stats.vision * creativityFormula.vision +
        stats.teamwork * creativityFormula.teamwork +
        stats.decisions * creativityFormula.decisions +
        stats.passing * creativityFormula.passing +
        stats.composure * creativityFormula.composure;

      // Striker score (finishing + offTheBall + technique + attWorkrate)
      player.strikerScore =
        stats.finishing * strikerFormula.finishing +
        stats.offTheBall * strikerFormula.offTheBall +
        stats.technique * strikerFormula.technique +
        stats.attWorkrate * strikerFormula.attWorkrate;

      // Energy scores
      player.staminaScore = stats.stamina;
      player.attWorkrateScore = stats.attWorkrate;
      player.defWorkrateScore = stats.defWorkrate;
    } else {
      // No stats available - set to 0
      player.creativityScore = 0;
      player.strikerScore = 0;
      player.staminaScore = 0;
      player.attWorkrateScore = 0;
      player.defWorkrateScore = 0;
    }

    // Calculate best score per zone [GK, DEF, MID, ATT]
    for (let zoneIdx = 0; zoneIdx < 4; zoneIdx++) {
      let bestZoneScore = 0;
      for (const posIdx of ZONE_POSITIONS[zoneIdx]) {
        if (player.scores[posIdx] > bestZoneScore) {
          bestZoneScore = player.scores[posIdx];
        }
      }
      player.zoneScores[zoneIdx] = bestZoneScore;
    }

    // Determine primary zone (zone with highest score, excluding GK)
    let maxZoneScore = player.zoneScores[1]; // Start with defense
    player.primaryZone = 1;
    for (let zoneIdx = 2; zoneIdx < 4; zoneIdx++) {
      if (player.zoneScores[zoneIdx] > maxZoneScore) {
        maxZoneScore = player.zoneScores[zoneIdx];
        player.primaryZone = zoneIdx;
      }
    }

    // Star player classification
    player.isStarPlayer = player.bestScore >= starThreshold;

    // Star tier classification
    if (player.bestScore >= 80) {
      player.starTier = 3; // World-class
    } else if (player.bestScore >= 75) {
      player.starTier = 2; // Elite
    } else if (player.bestScore >= starThreshold) {
      player.starTier = 1; // Good
    } else {
      player.starTier = 0; // Not a star
    }

    // Specialist detection (specialization ratio >= 1.8)
    player.isSpecialist = player.specializationRatio >= 1.8;

    // Star zone classification (expensive - only do for star players!)
    if (player.isStarPlayer) {
      player.starClassification = classifyStarPlayerByZone(player);
    } else {
      player.starClassification = null;
    }
  }
}
