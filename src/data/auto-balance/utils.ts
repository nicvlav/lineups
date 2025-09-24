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
        playerCount: 0,
        peakPotential: 0,
        formation: null,
        defensiveScore: 0,
        neutralScore: 0,
        attackingScore: 0,
        staminaScore: 0,
        attackWorkRateScore: 0,
        defensiveWorkRateScore: 0,
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