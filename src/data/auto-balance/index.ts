/**
 * Auto-Balance System v2
 * 
 * Professional-grade team balancing algorithm using Monte Carlo optimization.
 * Provides fair team distribution based on player skills and positions.
 * 
 * Features:
 * - High-performance implementation using TypedArrays
 * - Type-safe position and formation handling
 * - Configurable balancing weights
 * - Comprehensive debugging and metrics
 * - 100% backward compatible API
 * 
 * @module auto-balance
 */

import type {
    FilledGamePlayer,
    ScoredGamePlayer
} from "@/data/player-types";
import { normalizedDefaultWeights } from "@/data/position-types";

// Import internal modules
import type { BalanceConfig, BalanceMetrics } from "./types";
import { ENABLE_DEBUG, DEFAULT_CONFIG } from "./constants";
import { toFastPlayer } from "./utils";
import {
    runMonteCarlo,
    runTopLevelRecursiveOptimization,
    convertToGamePlayers
} from "./algorithm";
import { calculateMetrics } from "./metrics";

// Re-export types for external use
export type { BalanceConfig, BalanceMetrics } from "./types";

// Re-export utilities
export { canAutoBalance, getAvailableFormations } from "./formation";

// Backward compatibility exports (these were in auto-balance-types.tsx)
// These are deprecated but kept for compatibility
export const toArrayScoredGamePlayers = (players: ScoredGamePlayer[]) => players;
export const assignPositions = (players: ScoredGamePlayer[]) => players;
export const calculateScores = (players: ScoredGamePlayer[]) => players;

/**
 * Main entry point for team auto-balancing
 * 
 * @param players - Array of scored players to balance
 * @param debugMode - Enable debug logging
 * @returns Balanced teams with assigned positions
 * @throws Error if player count is invalid
 * 
 * @example
 * ```typescript
 * const teams = autoCreateTeamsScored(players);
 * console.log(`Team A: ${teams.a.length} players`);
 * console.log(`Team B: ${teams.b.length} players`);
 * ```
 */
export function autoCreateTeamsScored(
    players: ScoredGamePlayer[],
    debugMode: boolean = false
): { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] } {
    // Validate input
    if (players.length < 10) {
        throw new Error("Not enough players to form teams (minimum: 10)");
    }
    if (players.length > 26) {
        throw new Error("Too many players to form teams (maximum: 24)");
    }

    // Convert to optimized format
    const fastPlayers = players.map(toFastPlayer);

    // Configure algorithm - ENABLE_DEBUG overrides everything
    const config: BalanceConfig = {
        ...DEFAULT_CONFIG,
        // recursiveDepth: 50,
        debugMode: ENABLE_DEBUG || debugMode,
    };

    if (config.debugMode) {
        console.log("\n🔍 DEBUG MODE ENABLED (set ENABLE_DEBUG to false to disable)");
        console.log(`Running auto-balance for ${players.length} players...`);
    }

    // Run optimization
    const result = config.recursive
        ? runTopLevelRecursiveOptimization(fastPlayers, config)
        : runMonteCarlo(fastPlayers, config);

    if (!result) {
        throw new Error("Failed to balance teams - no valid formation found");
    }


    // Log results if debugging
    calculateMetrics(result.teams.teamA, result.teams.teamB, config, true);

    // Convert and return
    return convertToGamePlayers(result);
}

/**
 * Convenience wrapper for filled game players
 * 
 * @param players - Array of players with stats
 * @param debugMode - Enable debug logging
 * @returns Balanced teams with assigned positions
 */
export function autoCreateTeamsFilled(
    players: FilledGamePlayer[],
    debugMode: boolean = false
): { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] } {
    // Import here to avoid circular dependency
    const { calculateScoresForStats } = require("@/data/player-types");

    const scoredPlayers = players.map(player => ({
        ...player,
        zoneFit: calculateScoresForStats(player.stats, normalizedDefaultWeights),
    })) as ScoredGamePlayer[];

    return autoCreateTeamsScored(scoredPlayers, debugMode);
}

/**
 * Advanced API with custom configuration
 * 
 * @param players - Array of scored players
 * @param customConfig - Custom balance configuration
 * @returns Balanced teams with detailed metrics
 */
export function autoBalanceWithConfig(
    players: ScoredGamePlayer[],
    customConfig: Partial<BalanceConfig> = {}
): {
    teams: { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] };
    metrics: BalanceMetrics;
} {
    // Validate input
    if (players.length < 10 || players.length > 26) {
        throw new Error(`Invalid player count: ${players.length} (must be 10-26)`);
    }

    // Merge with defaults
    const config: BalanceConfig = {
        ...DEFAULT_CONFIG,
        ...customConfig,
        // recursiveDepth: 50,
        weights: {
            ...DEFAULT_CONFIG.weights,
            ...customConfig.weights,
        },
    };

    // Normalize weights to sum to 1
    const weightSum = Object.values(config.weights).reduce((a, b) => a + b, 0);
    if (weightSum > 0) {
        // Auto-normalize weights if they don't sum to 1
        Object.keys(config.weights).forEach(key => {
            config.weights[key as keyof typeof config.weights] /= weightSum;
        });
    }

    // Convert and optimize
    const fastPlayers = players.map(toFastPlayer);
    const result = config.recursive
        ? runTopLevelRecursiveOptimization(fastPlayers, config)
        : runMonteCarlo(fastPlayers, config);

    if (!result) {
        throw new Error("Failed to balance teams");
    }

    calculateMetrics(result.teams.teamA, result.teams.teamB, config, true);

    return {
        teams: convertToGamePlayers(result),
        metrics: result.metrics,
    };
}