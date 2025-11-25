/**
 * Auto-Balance Adapters
 *
 * Bridges the new archetype-based player system with the existing FastPlayer format
 * used by the auto-balance algorithm. This keeps the core algorithm unchanged.
 */

import type { PlayerArchetypeScores, ScoredGamePlayer } from '@/types/players';
import type { FastPlayer } from './types';
import { POSITION_COUNT, INDEX_TO_POSITION } from './constants';
import { getPositionScores } from '@/lib/positions/calculator';

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
    team: null
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
