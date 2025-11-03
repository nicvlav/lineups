/**
 * Auto-Balance Constants and Configuration
 * 
 * Centralized constants for the team balancing algorithm.
 * 
 * @module auto-balance/constants
 */

import type { Position } from "@/data/position-types";
import type { BalanceConfig } from "./types";

/**
 * 🔍 GLOBAL DEBUG SWITCH
 * ═══════════════════════════════════════════════════════════════════════════
 * Set this to true/false to enable/disable ALL debug output
 * This overrides any other debug settings in the code
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const ENABLE_DEBUG = true;  // ← CHANGE THIS TO false TO DISABLE DEBUG

/** Position indices for array-based operations */
export const POSITION_INDICES = {
    GK: 0, CB: 1, FB: 2, DM: 3, CM: 4, WM: 5, AM: 6, ST: 7, WR: 8
} as const;

/** Reverse mapping from index to position */
export const INDEX_TO_POSITION: readonly Position[] = ['GK', 'CB', 'FB', 'DM', 'CM', 'WM', 'AM', 'ST', 'WR'];

/** Total number of positions */
export const POSITION_COUNT = 9;

/** Zone groupings for metric calculation */
export const ZONE_POSITIONS = [
    [0],           // Goalkeeper
    [1, 2],        // Defense
    [3, 4, 5, 6],  // Midfield
    [7, 8],        // Attack
] as const;

/** Position categorization for attack/defense balance */
export const POSITION_CATEGORIES = {
    defensive: [0, 1, 2, 3] as readonly number[], // GK, CB, FB, DM - defensive minded
    neutral: [4, 5] as readonly number[],         // CM, WM - balanced midfield
    attacking: [6, 7, 8] as readonly number[],    // AM, ST, WR - attack minded
} as const;

/**
 * Calculates dynamic standard deviation threshold based on number of players
 *
 * More players = stricter threshold (lower stdDev required for consistency)
 * Fewer players = more lenient threshold (higher stdDev allowed)
 *
 * This is used in the Monte Carlo quality gate to reject results with inconsistent metrics.
 *
 * @param numPlayers Total number of players
 * @returns Maximum allowed standard deviation for metric consistency
 *
 * Examples:
 * - 18 players → 0.20 (lenient)
 * - 20 players → 0.14
 * - 22 players → 0.08 (strict)
 * - 24+ players → 0.08 (strict)
 */
export function getStdDevThreshold(numPlayers: number): number {
    // Anchor points for interpolation - easily adjustable
    const MIN_PLAYERS = 16;
    const MAX_PLAYERS = 22;
    const LENIENT_THRESHOLD = 0.175;  // For small teams (18 players)
    const STRICT_THRESHOLD = 0.075;   // For large teams (22+ players)

    // Clamp to range
    if (numPlayers <= MIN_PLAYERS) return LENIENT_THRESHOLD;
    if (numPlayers >= MAX_PLAYERS) return STRICT_THRESHOLD;

    // Linear interpolation between anchor points
    const ratio = (numPlayers - MIN_PLAYERS) / (MAX_PLAYERS - MIN_PLAYERS);
    return LENIENT_THRESHOLD - (ratio * (LENIENT_THRESHOLD - STRICT_THRESHOLD));
}

/**
 * General-purpose dynamic power scaling based on number of players
 *
 * More players = harsher penalty (higher power for exponential scaling)
 * Fewer players = gentler penalty (lower power, more linear)
 *
 * This is the core scaling function that can be reused for various metrics.
 *
 * @param numPlayers Total number of players
 * @param gentlePower Power value for small teams (more linear scaling)
 * @param harshPower Power value for large teams (harsh exponential scaling)
 * @param minPlayers Player count threshold for gentle power (default: 18)
 * @param maxPlayers Player count threshold for harsh power (default: 22)
 * @returns Interpolated power value based on player count
 *
 * Examples (with defaults gentlePower=1.5, harshPower=4.0):
 * - 18 players → 1.5 (gentle/linear)
 * - 20 players → 2.75 (moderate)
 * - 22+ players → 4.0 (harsh)
 */
export function getScaledPower(
    numPlayers: number,
    gentlePower: number = 1.5,
    harshPower: number = 4.0,
    minPlayers: number = 16,
    maxPlayers: number = 24
): number {
    // Clamp to range
    if (numPlayers <= minPlayers) return gentlePower;
    if (numPlayers >= maxPlayers) return harshPower;

    // Linear interpolation between anchor points
    const ratio = (numPlayers - minPlayers) / (maxPlayers - minPlayers);
    return gentlePower + (ratio * (harshPower - gentlePower));
}

/**
 * Calculates dynamic power scaling for midfield preference penalty based on number of players
 *
 * More players = harsher penalty (higher power for exponential scaling)
 * Fewer players = gentler penalty (lower power, more linear)
 *
 * @param numPlayers Total number of players
 * @returns Power value to use for penalty scaling
 *
 * Examples:
 * - 18 players → 0.8 (gentle/linear penalty)
 * - 20 players → 2.4 (moderate penalty)
 * - 22+ players → 4.0 (harsh penalty)
 */
export function getMidfieldPenaltyPower(numPlayers: number): number {
    return getScaledPower(numPlayers, 0.8, 4.0);
}

/**
 * Calculates dynamic power scaling for internal variance ratio based on number of players
 *
 * Used for zone balance calculations - ensures stricter requirements for larger teams.
 *
 * @param numPlayers Total number of players
 * @returns Power value to use for internal variance scaling
 *
 * Examples:
 * - 18 players → 1.0 (gentle/linear)
 * - 20 players → 1.5 (moderate)
 * - 22+ players → 2.0 (harsh)
 */
export function getInternalZoneSkillPower(numPlayers: number): number {
    return getScaledPower(numPlayers, 0.75, 2.5);
}

/**
 * Calculates dynamic power scaling for internal variance ratio based on number of players
 *
 * Used for zone balance calculations - ensures stricter requirements for larger teams.
 *
 * @param numPlayers Total number of players
 * @returns Power value to use for internal variance scaling
 *
 * Examples:
 * - 18 players → 1.0 (gentle/linear)
 * - 20 players → 1.5 (moderate)
 * - 22+ players → 2.0 (harsh)
 */
export function getInternalVariancePower(numPlayers: number): number {
    return getScaledPower(numPlayers, 0.75, 1.5);
}

/** Default Monte Carlo configuration */
export const DEFAULT_CONFIG: BalanceConfig = {
    weights: {
        overallStrengthBalance: 0.3,          // Peak potential balance between teams
        positionalScoreBalance: 0.10,          // Actual score balance between teams
        zonalDistributionBalance: 0.05,        // Zone distribution balance within teams
        energyBalance: 0.05,                   // Energy balance (stamina + work rates) between teams
        creativityBalance: 0.05,                // Creativity balance between teams
        allStatBalance: 0.1,                   // All-stat balance (sum of all stats) between teams
        talentDistributionBalance: 0.35,        // Talent distribution balance (std dev of player scores) - THE SECRET SAUCE
    },
    dominanceRatio: 1.03,  // Very low threshold: 5% better = specialist (e.g., 77 vs 73)
    recursive: true,
    recursiveDepth: 25,
    debugMode: false,  // Use ENABLE_DEBUG flag instead
} as const;