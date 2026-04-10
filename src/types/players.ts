/**
 * Player Type Definitions (V2)
 *
 * Re-exports PlayerV2 as Player for backward compatibility across the codebase.
 * The canonical player type lives in use-players.ts; this file ensures all
 * existing `import type { Player } from "@/types/players"` keep working.
 */

import type { GamePlayer as GamePlayerType } from "@/context/game-provider";
import type { PlayerV2 } from "@/hooks/use-players";
import type { Position } from "./positions";

export type { PlayerV2 };

/** Player is now an alias for PlayerV2 */
export type Player = PlayerV2;

/** Game player in an active session */
export type GamePlayer = GamePlayerType;

/** @deprecated Use GamePlayer instead */
export type ScoredGamePlayer = GamePlayerType;

/**
 * Point on pitch (0-1 normalized coordinates)
 */
export interface Point {
    x: number;
    y: number;
}

/**
 * Position scores for all 9 positions (legacy — used by formations and pitch rendering)
 */
export type ZoneScores = Record<string, number>;

export const emptyZoneScores: ZoneScores = {
    GK: 0,
    CB: 0,
    FB: 0,
    DM: 0,
    CM: 0,
    WM: 0,
    AM: 0,
    ST: 0,
    WR: 0,
} as const;

// ─── Legacy stubs (old UI components use these until fully migrated) ────────

/** @deprecated Use PlayerCapabilities from @/types/traits */
export type PlayerArchetypeScores = Record<
    string,
    {
        bestScore: number;
        bestArchetypeId: string;
        archetypes: Record<string, number>;
    }
>;

/** @deprecated Use PlayerCapabilities */
export type ZoneAverages = Record<string, number>;

/** @deprecated Zone averages are now capabilities on PlayerV2 */
export function getZoneAverages(player: PlayerV2): ZoneAverages {
    return {
        attacking: player.capabilities.goalThreat,
        creative: player.capabilities.playmaking,
        defending: player.capabilities.defending,
        physical: player.capabilities.athleticism,
        mental: (player.capabilities.engine + player.capabilities.technique) / 2,
    };
}

/** @deprecated Positions are derived from zone effectiveness */
export function getTopPositions(
    _archetypeScores: PlayerArchetypeScores,
    _count = 3
): Array<{ position: Position; score: number; archetypeId: string }> {
    return [];
}

/** @deprecated */
export function getBestArchetypeForPosition(
    _archetypeScores: PlayerArchetypeScores,
    _position: Position
): { archetypeId: string; score: number } | null {
    return null;
}

/** @deprecated */
export function isPositionSpecialist(_best: number, _secondBest: number, _threshold = 3): boolean {
    return false;
}

/** @deprecated Use PlayerTraits directly */
export type PlayerStats = Record<string, number>;

/** @deprecated */
export function calculateScoresForStats(_stats: Record<string, number>, _weights: Record<string, unknown>): ZoneScores {
    return { ...emptyZoneScores };
}

/** @deprecated */
export interface PositionAndScore {
    position: string;
    score: number;
}

/** @deprecated */
export type FilledGamePlayer = GamePlayerType & { stats?: Record<string, number> };
export type PositionedGamePlayer = GamePlayerType;
export type PositionedFilledGamePlayer = GamePlayerType;
export type PositionedScoredGamePlayer = GamePlayerType;
export type PlayerWithArchetypes = PlayerV2;
