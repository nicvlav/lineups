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

/** Default Monte Carlo configuration */
export const DEFAULT_CONFIG: BalanceConfig = {
    numSimulations: 500,
    weights: {
        overallStrengthBalance: 0.20,           // Peak potential balance between teams
        positionalScoreBalance: 0.15,          // Actual score balance between teams
        zonalDistributionBalance: 0.15,        // Zone distribution balance within teams
        energyBalance: 0.20,                   // Energy balance (stamina + work rates) between teams
        creativityBalance: 0.10,               // Creativity balance between teams
        allStatBalance: 0.10,                  // All-stat balance (sum of all stats) between teams
        talentDistributionBalance: 0.10,       // Talent distribution balance (std dev of player scores)
    },
    dominanceRatio: 1.03,  // Very low threshold: 5% better = specialist (e.g., 77 vs 73)
    recursive: true,
    recursiveDepth: 25,
    debugMode: false,  // Use ENABLE_DEBUG flag instead
} as const;