/**
 * Player Type Definitions
 *
 * Core player types with archetype support and game-specific extensions.
 */

import type { Position } from './positions';
import type { PlayerStats, StatCategory } from './stats';

/**
 * Point on pitch (0-1 normalized coordinates)
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Position scores for all 9 positions
 */
export type ZoneScores = Record<Position, number>;

/**
 * Empty zone scores (all zeros)
 */
export const emptyZoneScores: ZoneScores = {
  GK: 0, CB: 0, FB: 0, DM: 0, CM: 0, WM: 0, AM: 0, ST: 0, WR: 0
} as const;

// ============ Core Player Types ============

/**
 * Player's calculated archetype scores for all positions
 * Structure: position -> { best archetype info + all archetype scores }
 */
export interface PlayerArchetypeScores {
  [position: string]: {
    /** Best archetype score for this position (for quick lookup) */
    bestScore: number;

    /** ID of best archetype for this position */
    bestArchetypeId: string;

    /** All archetype scores for this position */
    archetypes: Record<string, number>; // archetypeId -> normalized score (0-100)
  };
}

/**
 * Core player data from database
 */
export interface Player {
  id: string;
  name: string;
  stats: PlayerStats;
  avatar_url?: string;
  vote_count: number;
}

/**
 * Player enriched with archetype scores
 */
export interface PlayerWithArchetypes {
  id: string;
  name: string;
  rawStats: PlayerStats;
  avatar_url?: string;
  vote_count: number;
  /** Calculated archetype scores for all positions */
  archetypeScores: PlayerArchetypeScores;
}

// ============ Game-Specific Player Types ============

/**
 * Player in a game session (local-only attributes)
 * Position is stored as Point for rendering, exactPosition is required for analysis
 */
export interface GamePlayer {
  id: string;
  name: string;
  isGuest: boolean;
  team: string;
  position: Point;
  exactPosition: Position;
}

/**
 * Game player with stats
 */
export interface FilledGamePlayer extends GamePlayer {
  stats: PlayerStats;
}

/**
 * Game player with position scores
 */
export interface ScoredGamePlayer extends GamePlayer {
  zoneFit: ZoneScores;
  stats?: PlayerStats;
}


// ============ Formation-Specific Player Types ============

/**
 * Game player with exact position for formation
 */
export interface PositionedGamePlayer extends GamePlayer {
  exactPosition: Position;
}

/**
 * Positioned game player with stats
 */
export interface PositionedFilledGamePlayer extends PositionedGamePlayer {
  stats: PlayerStats;
}

/**
 * Positioned game player with scores
 */
export interface PositionedScoredGamePlayer extends PositionedGamePlayer {
  zoneFit: ZoneScores;
}

// ============ Helper Types ============

/**
 * Position with score for display
 */
export interface PositionAndScore {
  position: string;
  score: number;
}

/**
 * Zone averages by stat category
 */
export type ZoneAverages = Record<StatCategory, number>;

// ============ Helper Functions ============

/**
 * Get best N positions for a player with archetype info
 */
export function getTopPositions(
  archetypeScores: PlayerArchetypeScores,
  count: number = 3
): Array<{ position: Position; score: number; archetypeId: string }> {
  return Object.entries(archetypeScores)
    .map(([pos, data]) => ({
      position: pos as Position,
      score: data.bestScore,
      archetypeId: data.bestArchetypeId
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

/**
 * Get best archetype for a specific position
 */
export function getBestArchetypeForPosition(
  archetypeScores: PlayerArchetypeScores,
  position: Position
): { archetypeId: string; score: number } | null {
  const posData = archetypeScores[position];
  if (!posData) return null;

  return {
    archetypeId: posData.bestArchetypeId,
    score: posData.bestScore
  };
}

/**
 * Check if player is specialist (>97% threshold for one position)
 */
export function isPositionSpecialist(
  best: number,
  secondBest: number,
  threshold: number = 3
): boolean {

  return (best - secondBest) >= threshold;
}


// Re-export legacy utility functions for backward compatibility
export {
  calculateScoresForStats,
  getZoneAverages,
  type ZoneAverages as ZoneAveragesType
} from '../lib/utils/player-scoring';
