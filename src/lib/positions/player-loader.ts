/**
 * Player Loading Utilities
 *
 * Helpers for loading players from the database and enriching them with archetype scores.
 */

import type { Player, PlayerWithArchetypes } from '@/types/players';
import { calculateArchetypeScores } from './calculator';

/**
 * Enrich a player loaded from database with archetype scores
 * Converts from legacy Player type to PlayerWithArchetypes
 */
export function enrichPlayerWithArchetypes(player: Player): PlayerWithArchetypes {
  return {
    id: player.id,
    name: player.name,
    rawStats: player.stats,
    avatar_url: player.avatar_url,
    vote_count: player.vote_count,
    archetypeScores: calculateArchetypeScores(player.stats)
  };
}

/**
 * Bulk enrich multiple players with archetype scores
 */
export function enrichPlayersWithArchetypes(players: Player[]): PlayerWithArchetypes[] {
  return players.map(enrichPlayerWithArchetypes);
}

/**
 * Enrich player record (keyed by ID) with archetype scores
 */
export function enrichPlayerRecordWithArchetypes(
  playerRecord: Record<string, Player>
): Record<string, PlayerWithArchetypes> {
  const enriched: Record<string, PlayerWithArchetypes> = {};

  for (const [id, player] of Object.entries(playerRecord)) {
    enriched[id] = enrichPlayerWithArchetypes(player);
  }

  return enriched;
}
