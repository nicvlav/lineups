/**
 * Auto-Balance Metrics — Shared Helpers
 *
 * Formatting utilities and calculation primitives used across all metric modules.
 *
 * @module auto-balance/metrics-helpers
 */

import type { Formation } from "@/types/positions";
import { INDEX_TO_POSITION, ZONE_POSITIONS } from "./constants";
import { calibratedScore, Steepness } from "./metric-transformations";
import { DEFAULT_BALANCE_CONFIG } from "./metrics-config";
import type { FastTeam } from "./types";

/**
 * Helper function to format a simple comparison for debug output
 */
export function formatComparison(label: string, valueA: number, valueB: number, ratio: number): string {
    const diff = Math.abs(valueA - valueB);
    return `  ${label}: ${valueA.toFixed(1)} | ${valueB.toFixed(1)} | Diff: ${diff.toFixed(1)} | Ratio: ${ratio.toFixed(3)}`;
}

/**
 * Helper function to format zone scores in a compact table
 */
export function formatZoneScores(teamA: FastTeam, teamB: FastTeam): string {
    let output = "  Zone Scores:\n";
    output += "         GK      DEF     MID     ATT\n";
    output += `  A:  ${Array.from(teamA.zoneScores)
        .map((s) => s.toFixed(1).padStart(6))
        .join(" ")}\n`;
    output += `  B:  ${Array.from(teamB.zoneScores)
        .map((s) => s.toFixed(1).padStart(6))
        .join(" ")}\n`;
    return output;
}

/**
 * Helper function to format zone peak scores in a compact table
 */
export function formatZonePeakScores(teamA: FastTeam, teamB: FastTeam): string {
    let output = "  Zone Peak Scores:\n";
    output += "         GK      DEF     MID     ATT\n";
    output += `  A:  ${Array.from(teamA.zonePeakScores)
        .map((s) => s.toFixed(1).padStart(6))
        .join(" ")}\n`;
    output += `  B:  ${Array.from(teamB.zonePeakScores)
        .map((s) => s.toFixed(1).padStart(6))
        .join(" ")}\n`;
    return output;
}

/**
 * Helper function to format zone average ratings in a compact table
 */
export function formatZoneAverageRatings(teamA: FastTeam, teamB: FastTeam): string {
    const teamAZoneAverages = calculateZoneAverageRatings(teamA);
    const teamBZoneAverages = calculateZoneAverageRatings(teamB);

    let output = "  Zone Average Ratings:\n";
    output += "         GK      DEF     MID     ATT\n";
    output += `  A:  ${Array.from(teamAZoneAverages)
        .map((s) => s.toFixed(1).padStart(6))
        .join(" ")}\n`;
    output += `  B:  ${Array.from(teamBZoneAverages)
        .map((s) => s.toFixed(1).padStart(6))
        .join(" ")}\n`;
    return output;
}

/**
 * Calculate difference ratio
 *
 * Any time we have two values to compare for a balance ratio
 * We can use this - where 1.0 means perfectly even and 0.0 means the opposite
 */
export function calculateBasicDifferenceRatio(a: number, b: number): number {
    const minValue = Math.min(a, b);
    const maxValue = Math.max(a, b);

    // If both are zero, they're perfectly balanced
    if (maxValue === 0) return 1.0;

    // If one is zero and the other isn't, that's maximum imbalance
    if (minValue === 0) return 0.0;

    const differenceRatio = Math.abs(a - b) / maxValue;
    return 1 - differenceRatio;
}

/**
 * Calculates the inner variance of a team's zones
 *
 * @param zoneScores Float32Array of zone scores
 * @returns Balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
export const calculateSingleTeamZonalBalance = (zoneScores: Float32Array): number => {
    // Extract non-goalkeeper zones: Defense (1), Midfield (2), Attack (3)
    const defenseZoneScore = zoneScores[1];
    const midfieldZoneScore = zoneScores[2];
    const attackZoneScore = zoneScores[3];

    const nonGoalkeeperZones = [defenseZoneScore, midfieldZoneScore, attackZoneScore];
    const zoneTotal = nonGoalkeeperZones.reduce((sum, score) => sum + score, 0);
    const zoneAverage = zoneTotal / 3;

    // Perfect balance when all zones are empty or equal
    if (zoneAverage === 0) return 1;

    // Calculate variance to measure how spread out the zone scores are
    // Lower variance = more balanced distribution
    const zoneVariance = nonGoalkeeperZones.reduce((sum, zoneScore) => sum + (zoneScore - zoneAverage) ** 2, 0) / 3;

    const zoneStandardDeviation = Math.sqrt(zoneVariance);

    // Coefficient of variation: standard deviation relative to mean
    // Measures relative variability (0 = perfectly even, higher = more uneven)
    const coefficientOfVariation = zoneStandardDeviation / zoneAverage;

    // Convert to balance score using inverse relationship
    // Lower CV = higher balance score
    const zonalBalanceScore = 1 / (1 + coefficientOfVariation);

    return zonalBalanceScore;
};

/**
 * Helper to determine how many players are in a zone for a given formation
 * Uses ZONE_POSITIONS constant for zone boundaries
 */
function getNumPlayersForZone(zoneIdx: number, formation: Formation | null): number {
    if (!formation) return 1;

    let count = 0;

    const zone = ZONE_POSITIONS[zoneIdx];

    zone.forEach((val) => {
        count += formation.positions[INDEX_TO_POSITION[val]];
    });

    // Fallback (should never reach here if ZONE_POSITIONS is complete)
    return count;
}

/**
 * Calculates the average player rating per zone for a team
 *
 * @param team Team to analyze
 * @returns Array of average ratings per zone [GK, DEF, MID, ATT]
 */
export function calculateZoneAverageRatings(team: FastTeam): Float32Array {
    const sums = team.zoneScores.map((val, i) => {
        return val / getNumPlayersForZone(i, team.formation);
    });

    return sums;
}

/**
 * Calculates midfield preference penalty for a single team
 *
 * Penalizes scenarios where the midfield (zone 2) isn't the strongest zone
 * (excluding GK). The penalty is based on how far the midfield average is
 * from the maximum zone average.
 *
 * Power scaling adjusts based on player count:
 * - Small teams (18 players): gentler penalty (power ~1.5, more linear)
 * - Large teams (22+ players): harsher penalty (power ~4.0, exponential)
 *
 * @param zoneAverages Array of zone average ratings [GK, DEF, MID, ATT]
 * @param penaltyStrength How harsh the penalty should be (0-1, where 1 is max penalty) - comes from config
 * @param numPlayers Total number of players (used for dynamic power scaling)
 * @returns Penalty multiplier from 0 (harsh penalty) to 1 (no penalty)
 */
export function calculateMidfieldPreferencePenalty(zoneAverages: Float32Array): number {
    // Extract non-GK zones
    const defAvg = zoneAverages[1]; // DEF
    const midAvg = zoneAverages[2]; // MID
    const attAvg = zoneAverages[3]; // ATT

    // Find the maximum average among DEF, MID, ATT
    const maxZoneAvg = Math.max(defAvg, midAvg, attAvg);

    // If midfield is already the strongest (or tied), no penalty
    if (midAvg >= maxZoneAvg) {
        return 1.0;
    }

    return calibratedScore(
        calculateBasicDifferenceRatio(maxZoneAvg, midAvg),
        DEFAULT_BALANCE_CONFIG.thresholds.starDistribution,
        Steepness.Steep
    );
}

/**
 * Calculates the standard deviation of individual player scores within a team
 *
 * This measures talent distribution consistency - whether a team has
 * spiky talent (few superstars + many weak players) or flat talent
 * (consistently solid players throughout).
 *
 * @param team Team to analyze
 * @returns Standard deviation of player scores
 */
export function calculatePlayerScoreStdDev(team: FastTeam): number {
    const playerScores: number[] = [];

    // Collect all player scores from all positions
    for (let posIdx = 0; posIdx < team.positions.length; posIdx++) {
        const positionPlayers = team.positions[posIdx];
        for (const player of positionPlayers) {
            // Use the position index from the team structure, not player.assignedPosition
            // which may have been mutated by subsequent Monte Carlo iterations
            playerScores.push(player.scores[posIdx]);
        }
    }

    // Handle empty team case
    if (playerScores.length === 0) return 0;

    // Calculate mean
    const mean = playerScores.reduce((sum, score) => sum + score, 0) / playerScores.length;

    // Calculate variance
    const variance = playerScores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / playerScores.length;

    // Return standard deviation
    return Math.sqrt(variance);
}

/**
 * Generates all combinations of size k from array of size n
 * Uses iterative approach to avoid stack overflow for large n
 *
 * @param n Total number of items
 * @param k Size of each combination
 * @returns Array of combinations (each combination is array of indices)
 */
export function generateCombinations(n: number, k: number): number[][] {
    const results: number[][] = [];

    // Handle edge cases
    if (k > n || k <= 0) return [];
    if (k === n) return [Array.from({ length: n }, (_, i) => i)];

    // Start with first combination [0, 1, 2, ..., k-1]
    const current = Array.from({ length: k }, (_, i) => i);
    results.push([...current]);

    // Generate remaining combinations
    while (true) {
        // Find rightmost element that can be incremented
        let i = k - 1;
        while (i >= 0 && current[i] === n - k + i) {
            i--;
        }

        // If no element can be incremented, we're done
        if (i < 0) break;

        // Increment this element
        current[i]++;

        // Set all elements to the right
        for (let j = i + 1; j < k; j++) {
            current[j] = current[i] + (j - i);
        }

        results.push([...current]);
    }

    return results;
}
