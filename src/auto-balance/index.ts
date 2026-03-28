/**
 * Auto-Balance System
 *
 * Team balancing algorithm using guided Monte Carlo with calibrated metrics.
 * 200-250 iterations with weighted top-N selection and proximity filtering.
 *
 * @module auto-balance
 */

import { logger } from "@/lib/logger";
import type { ScoredGamePlayer } from "@/types/players";
import type { Formation } from "@/types/positions";
import { convertToGamePlayers, runGuidedMonteCarlo } from "./algorithm";
import { diagnosticReport } from "./debug-tools";
import { calculateMetrics } from "./metrics-balance";
import { type BalanceConfiguration, DEFAULT_BALANCE_CONFIG } from "./metrics-config";
import type { BalanceMetrics } from "./types";
import { toFastPlayer } from "./utils";

/** 5v5 is the smallest meaningful game */
const MIN_PLAYERS_FOR_BALANCE = 10;
/** 13v13 is the largest supported formation */
const MAX_PLAYERS_FOR_BALANCE = 26;

/**
 * @param players - Array of scored players to balance
 * @param customConfig - Optional custom configuration (merges with defaults)
 * @param debugMode - Enable detailed debug logging with metrics explanations
 * @returns Balanced teams with comprehensive metrics
 *
 * @example
 * ```typescript
 * // Basic usage with detailed debug output
 * const result = autoBalance(players, undefined, true);
 * console.log(`Score: ${result.score.toFixed(3)}`);
 * console.log(result.diagnostic);
 *
 * // Custom configuration
 * const result = autoBalance(players, {
 *     weights: {
 *         primary: {
 *             starDistribution: 0.40,  // Emphasize star balance
 *             scoreBalance: 0.25,
 *             zoneBalance: 0.15,
 *         }
 *     },
 *     monteCarlo: {
 *         maxIterations: 300,  // More thorough search
 *     }
 * }, true);
 * ```
 */
export function autoBalance(
    players: ScoredGamePlayer[],
    customConfig?: Partial<BalanceConfiguration>,
    debugMode: boolean = false
): {
    teams: { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] };
    formationA: Formation | undefined;
    formationB: Formation | undefined;
    metrics: BalanceMetrics;
    score: number;
    diagnostic: string;
} {
    // Validate input
    if (players.length < MIN_PLAYERS_FOR_BALANCE) {
        throw new Error(`Not enough players to form teams (minimum: ${MIN_PLAYERS_FOR_BALANCE})`);
    }
    if (players.length > MAX_PLAYERS_FOR_BALANCE) {
        throw new Error(`Too many players to form teams (maximum: ${MAX_PLAYERS_FOR_BALANCE})`);
    }

    // Merge with defaults (deep merge for nested objects)
    const config: BalanceConfiguration = {
        ...DEFAULT_BALANCE_CONFIG,
        ...customConfig,
        weights: {
            primary: {
                ...DEFAULT_BALANCE_CONFIG.weights.primary,
                ...customConfig?.weights?.primary,
            },
            secondary: {
                ...DEFAULT_BALANCE_CONFIG.weights.secondary,
                ...customConfig?.weights?.secondary,
            },
        },
        thresholds: {
            ...DEFAULT_BALANCE_CONFIG.thresholds,
            ...customConfig?.thresholds,
        },
        algorithm: {
            ...DEFAULT_BALANCE_CONFIG.algorithm,
            ...customConfig?.algorithm,
        },
        monteCarlo: {
            ...DEFAULT_BALANCE_CONFIG.monteCarlo,
            ...customConfig?.monteCarlo,
        },
        starPlayers: {
            ...DEFAULT_BALANCE_CONFIG.starPlayers,
            ...customConfig?.starPlayers,
        },
        formulas: {
            ...DEFAULT_BALANCE_CONFIG.formulas,
            ...customConfig?.formulas,
        },
    };

    if (debugMode) {
        logger.debug("\n╔══════════════════════════════════════════════════════════════════════╗");
        logger.debug("║       AUTO-BALANCE - PROFESSIONAL CALIBRATED SYSTEM 🚀           ║");
        logger.debug("╚══════════════════════════════════════════════════════════════════════╝");
        logger.debug(`\nConfiguration:`);
        logger.debug(`   Players: ${players.length}`);
        logger.debug(`   Max Iterations: ${config.monteCarlo.maxIterations}`);
        logger.debug(`   Proximity Threshold: ${config.algorithm.proximityThreshold}`);
        logger.debug("");
        logger.debug("Metric Weights:");
        logger.debug(
            `   PRIMARY: Star=${config.weights.primary.starDistribution}, Score=${config.weights.primary.scoreBalance}, Zone=${config.weights.primary.peakPotential}`
        );
        logger.debug(
            `   SECONDARY: Peak=${config.weights.secondary.zoneBalance}, AllStat=${config.weights.secondary.allStatBalance}, Energy=${config.weights.secondary.energy}`
        );
        logger.debug("");
    }

    // Convert to optimized format
    const fastPlayers = players.map(toFastPlayer);

    const result = runGuidedMonteCarlo(fastPlayers, config, true);

    if (!result) {
        throw new Error("Failed to balance teams - no valid formation found");
    }

    // Calculate metrics
    const metricsResult = calculateMetrics(result.teams.teamA, result.teams.teamB, config, false);

    // Generate enhanced diagnostic report
    const diagnostic = diagnosticReport(
        result.teams.teamA,
        result.teams.teamB,
        metricsResult.details,
        metricsResult.score,
        config
    );

    if (debugMode) {
        logger.debug(diagnostic);
    }

    const convertedTeams = convertToGamePlayers(result);

    return {
        teams: { a: convertedTeams.a, b: convertedTeams.b },
        formationA: convertedTeams.formationA,
        formationB: convertedTeams.formationB,
        metrics: metricsResult.details,
        score: metricsResult.score,
        diagnostic,
    };
}
