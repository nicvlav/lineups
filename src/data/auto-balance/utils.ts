/**
 * Auto-Balance Utility Functions
 * 
 * Helper functions for player conversion and team management.
 * 
 * @module auto-balance/utils
 */

import type { ScoredGamePlayer } from "@/data/player-types";
import type { FastPlayer, FastTeam } from "./types";
import { INDEX_TO_POSITION, POSITION_COUNT } from "./constants";

/**
 * Converts a scored player to optimized format
 * Pre-calculates frequently accessed values
 */
export function toFastPlayer(player: ScoredGamePlayer): FastPlayer {
    const scores = new Float32Array(POSITION_COUNT);
    let bestScore = 0;
    let bestPosition = -1;
    let secondBestScore = 0;

    // Fill score array and find best positions
    for (let i = 0; i < POSITION_COUNT; i++) {
        const position = INDEX_TO_POSITION[i];
        const score = player.zoneFit[position] || 0;
        scores[i] = score;

        if (score > bestScore) {
            secondBestScore = bestScore;
            bestScore = score;
            bestPosition = i;
        } else if (score > secondBestScore) {
            secondBestScore = score;
        }
    }

    return {
        original: player,
        scores,
        bestScore,
        bestPosition,
        secondBestScore,
        specializationRatio: secondBestScore > 0 ? bestScore / secondBestScore : Infinity,
        assignedPosition: -1,
        team: null,
    };
}

/**
 * Creates an empty team structure
 */
export function createFastTeam(): FastTeam {
    const positions: FastPlayer[][] = [];
    for (let i = 0; i < POSITION_COUNT; i++) {
        positions[i] = [];
    }

    return {
        positions,
        totalScore: 0,
        zoneScores: new Float32Array(4),
        zonePeakScores: new Float32Array(4),
        playerCount: 0,
        peakPotential: 0,
        formation: null,
        staminaScore: 0,
        attWorkrateScore: 0,
        defWorkrateScore: 0,
        workrateScore: 0,
        creativityScore: 0,
        strikerScore: 0,
    };
}

/**
 * Creates an optimized comparator for position-based sorting
 * MASSIVELY prefers specialists over versatile players
 */
export function createPositionComparator(
    positionIdx: number,
    dominanceRatio: number
): (a: FastPlayer, b: FastPlayer) => number {
    return (a: FastPlayer, b: FastPlayer): number => {
        const aScore = a.scores[positionIdx];
        const bScore = b.scores[positionIdx];

        // Calculate specialization for THIS specific position
        // A specialist is someone whose score at this position dominates their other scores
        const aIsPositionSpecialist = a.bestPosition === positionIdx && a.specializationRatio >= dominanceRatio;
        const bIsPositionSpecialist = b.bestPosition === positionIdx && b.specializationRatio >= dominanceRatio;

        // Priority 1: MASSIVE preference for specialists at this exact position
        if (aIsPositionSpecialist !== bIsPositionSpecialist) {
            // Specialist vs non-specialist: HUGE sorting difference
            return aIsPositionSpecialist ? -1000 : 1000;
        }

        // Priority 2: If both are specialists for this position, prefer stronger specialization
        if (aIsPositionSpecialist && bIsPositionSpecialist) {
            // Higher specialization ratio = more specialized
            const ratioDiff = b.specializationRatio - a.specializationRatio;
            // Even tiny differences matter for specialists
            if (Math.abs(ratioDiff) > 0.01) {
                return ratioDiff > 0 ? 100 : -100;
            }
        }

        // Priority 3: Efficiency - how good are they at THIS position relative to their best?
        const aEfficiency = a.bestScore > 0 ? aScore / a.bestScore : 0;
        const bEfficiency = b.bestScore > 0 ? bScore / b.bestScore : 0;

        // Strong penalty for players who would be "wasted" at this position
        const efficiencyDiff = bEfficiency - aEfficiency;
        if (Math.abs(efficiencyDiff) > 0.02) { // Even 2% efficiency difference matters
            return efficiencyDiff > 0 ? 50 : -50;
        }

        // Priority 4: Raw score at this position
        const scoreDiff = bScore - aScore;
        if (Math.abs(scoreDiff) > 0.01) {
            return scoreDiff;
        }

        // Priority 5: Overall quality as final tiebreaker
        return b.bestScore - a.bestScore;
    };
}

/**
 * Sorts players by worst overall score (for goalkeeper selection)
 */
export function sortWorstInPlace(players: FastPlayer[]): void {
    players.sort((a, b) => a.bestScore - b.bestScore);
}

/**
 * Cryptographically secure random number generator
 * Returns a random float between 0 (inclusive) and 1 (exclusive)
 * Uses crypto.getRandomValues for better randomness than Math.random()
 */
export function cryptoRandom(): number {
    // Use crypto API if available (browser and modern Node.js)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        // Convert to 0-1 range (divide by max uint32 value)
        return array[0] / 0x100000000;
    }
    // Fallback to Math.random if crypto not available
    return Math.random();
}

/**
 * Fisher-Yates shuffle using crypto random
 * Provides better randomization than repeated random picks
 */
export function cryptoShuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(cryptoRandom() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Random integer between min (inclusive) and max (exclusive) using crypto random
 */
export function cryptoRandomInt(min: number, max: number): number {
    return Math.floor(cryptoRandom() * (max - min)) + min;
}

/**
 * Weighted random selection from array
 *
 * Selects an element from the array with probability based on weights.
 * Weights do not need to sum to 1.0 - they will be normalized.
 *
 * @param items Array of items to select from
 * @param weights Array of weights (same length as items)
 * @returns Randomly selected item
 *
 * @example
 * const players = [player1, player2, player3, player4];
 * const weights = [0.50, 0.30, 0.15, 0.05]; // Prefer first player
 * const selected = weightedRandomSelect(players, weights);
 */
export function weightedRandomSelect<T>(items: T[], weights: number[]): T {
    if (items.length === 0) {
        throw new Error("Cannot select from empty array");
    }

    if (items.length !== weights.length) {
        throw new Error("Items and weights must have same length");
    }

    if (items.length === 1) {
        return items[0];
    }

    // Normalize weights to sum to 1.0
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    // Create cumulative distribution
    const cumulativeWeights: number[] = [];
    let cumulative = 0;
    for (const weight of normalizedWeights) {
        cumulative += weight;
        cumulativeWeights.push(cumulative);
    }

    // Select using crypto random
    const rand = cryptoRandom();

    for (let i = 0; i < cumulativeWeights.length; i++) {
        if (rand <= cumulativeWeights[i]) {
            return items[i];
        }
    }

    // Fallback (should never reach here due to floating point rounding)
    return items[items.length - 1];
}

/**
 * Select top N players from available pool with proximity filtering
 *
 * Only includes players whose score is within proximityThreshold of the best player.
 * Then selects from this filtered list using weighted random selection.
 *
 * @param available Array of available players (will be sorted in place)
 * @param positionIdx Position index to evaluate
 * @param comparator Comparator function for sorting
 * @param proximityThreshold Maximum score difference from best (default: 5)
 * @param topN Maximum candidates to consider (default: 4)
 * @param selectionWeights Probability weights for top N (default: [0.5, 0.3, 0.15, 0.05])
 * @returns Selected player
 */
export function selectPlayerWithProximity(
    available: FastPlayer[],
    positionIdx: number,
    comparator: (a: FastPlayer, b: FastPlayer) => number,
    proximityThreshold: number = 5,
    topN: number = 4,
    selectionWeights: number[] = [0.50, 0.30, 0.15, 0.05]
): FastPlayer {
    if (available.length === 0) {
        throw new Error("Cannot select from empty array");
    }

    // Sort by comparator
    available.sort(comparator);

    // Get best player's score
    const bestScore = available[0].scores[positionIdx];

    // Filter candidates within proximity threshold
    const candidates: FastPlayer[] = [];
    const N = Math.min(topN, available.length);

    for (let i = 0; i < N; i++) {
        const player = available[i];
        const scoreDiff = bestScore - player.scores[positionIdx];

        if (scoreDiff <= proximityThreshold) {
            candidates.push(player);
        } 
    }

    // If no candidates within threshold, just take the best
    if (candidates.length === 0) {
        return available[0];
    }

    // If only one candidate, return it
    if (candidates.length === 1) {
        return candidates[0];
    }

    // Use weighted random selection
    const weights = selectionWeights.slice(0, candidates.length);

    return weightedRandomSelect(candidates, weights);
}

/**
 * Get available zones for a formation
 *
 * Returns indices of zones that still need players.
 *
 * @param formation Formation array
 * @returns Array of zone indices that have open positions
 * @deprecated Use getAvailablePositions for position-based selection
 */
export function getAvailableZones(formation: Int8Array): number[] {
    const zones: number[] = [];
    const ZONE_POSITIONS = [
        [0],           // Goalkeeper
        [1, 2],        // Defense
        [3, 4, 5, 6],  // Midfield
        [7, 8],        // Attack
    ];

    for (let zoneIdx = 0; zoneIdx < ZONE_POSITIONS.length; zoneIdx++) {
        const positions = ZONE_POSITIONS[zoneIdx];
        const hasOpenings = positions.some(posIdx => formation[posIdx] > 0);

        if (hasOpenings) {
            zones.push(zoneIdx);
        }
    }

    return zones;
}

/**
 * Get available positions for a formation
 *
 * Returns indices of all positions that still need players.
 * Used for priority-based position selection algorithm.
 *
 * @param formation Formation array where each index is a position and value is remaining count
 * @returns Array of position indices that still need players (where formation[posIdx] > 0)
 */
export function getAvailablePositions(formation: Int8Array): number[] {
    const positions: number[] = [];
    for (let posIdx = 0; posIdx < POSITION_COUNT; posIdx++) {
        if (formation[posIdx] > 0) {
            positions.push(posIdx);
        }
    }
    return positions;
}