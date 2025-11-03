/**
 * Auto-Balance Type Definitions
 * 
 * Core types and interfaces for the team balancing system.
 * 
 * @module auto-balance/types
 */

import type { Formation } from "@/data/position-types";
import type { ScoredGamePlayer } from "@/data/player-types";

/**
 * Balance metrics for evaluating team balance quality
 *
 * Each metric is a score from 0 (completely imbalanced) to 1 (perfectly balanced)
 */
export interface BalanceMetrics {
    /** Overall team strength balance (comparing peak potential between teams) */
    overallStrengthBalance: number;

    /** Positional score balance (comparing actual assigned scores between teams) */
    positionalScoreBalance: number;

    /** Zonal distribution balance (evenness of zone distribution within each team) */
    zonalDistributionBalance: number;

    /** Energy balance (stamina and work rate balance between teams) */
    energyBalance: number;

    /** Creativity balance (vision, passing, and teamwork balance between teams) */
    creativityBalance: number;    
    
    /** Striker balance (finishing, technique, etc between teams) */
    strikerBalance: number;

    /** All-stat balance (sum of all aggregate player stats between teams) */
    allStatBalance: number;

    /** Talent distribution balance (comparing standard deviation of player scores) */
    talentDistributionBalance: number;
}

/**
 * Configuration for the auto-balance algorithm
 */
export interface BalanceConfig {
    /** Weights for different optimization criteria (must sum to 1.0) */
    weights: BalanceMetrics;

    /** Ratio for specialist detection (higher = stricter) */
    dominanceRatio: number;

    /** Enable recursive optimization for better results */
    recursive: boolean;

    /** Depth of recursive optimization */
    recursiveDepth: number;

    /** Enable debug logging */
    debugMode: boolean;
}

/**
 * Performance-optimized player representation
 * Uses TypedArrays for cache-friendly access patterns
 */
export interface FastPlayer {
    /** Reference to original player data */
    original: ScoredGamePlayer;

    /** Flat array of position scores for O(1) access */
    scores: Float32Array;

    /** Pre-calculated best score */
    bestScore: number;

    /** Index of best position */
    bestPosition: number;

    /** Second best score for versatility calculation */
    secondBestScore: number;

    /** Specialization ratio (best/secondBest) */
    specializationRatio: number;

    /** Currently assigned position index (-1 if unassigned) */
    assignedPosition: number;

    /** Assigned team */
    team: 'A' | 'B' | null;
}

/**
 * Optimized team structure
 */
export interface FastTeam {
    /** Players grouped by position index */
    positions: FastPlayer[][];

    /** Total team score */
    totalScore: number;

    /** Scores by zone [GK, DEF, MID, ATT] */
    zoneScores: Float32Array;

    /** Peak cores by zone [GK, DEF, MID, ATT] */
    zonePeakScores: Float32Array;

    /** Total player count */
    playerCount: number;

    /** Peak potential score */
    peakPotential: number;

    /** Formation used for this team */
    formation: Formation | null;

    /** Stamina score for energy balance calculation */
    staminaScore: number;

    /** Workrate score for energy balance calculation */
    workrateScore: number;

    /** Creativity score for creativity balance calculation */
    creativityScore: number;    
    
    /** Creativity score for creativity balance calculation */
    strikerScore: number;
}

/**
 * Result of a team generation run
 */
export interface Teams {
    teamA: FastTeam;
    teamB: FastTeam;
}


/**
 * Result of a simulation run
 */
export interface SimulationResult {
    teams: Teams;
    score: number;
    metrics: BalanceMetrics;
}

