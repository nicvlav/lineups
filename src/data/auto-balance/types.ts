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
 * Configuration for the auto-balance algorithm
 */
export interface BalanceConfig {
    /** Number of Monte Carlo simulations to run */
    numSimulations: number;
    
    /** Weights for different optimization criteria (must sum to 1.0) */
    weights: {
        /** Team strength balance (equal total strength) */
        balance: number;
        /** Position-specific balance between teams */
        positionBalance: number;
        /** Zone balance within each team */
        zonalBalance: number;
        /** Attack vs Defense balance between teams */
        attackDefenseBalance: number;
        /** Energy balance (stamina + work rates) between teams */
        energy: number;
    };
    
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
    
    /** Total player count */
    playerCount: number;
    
    /** Peak potential score */
    peakPotential: number;
    
    /** Formation used for this team */
    formation: Formation | null;
    
    /** Attack/Defense scores for balance calculation */
    defensiveScore: number;
    neutralScore: number;
    attackingScore: number;

    /** Energy scores for energy balance calculation */
    staminaScore: number;
    attackWorkRateScore: number;
    defensiveWorkRateScore: number;
}

/**
 * Result of a simulation run
 */
export interface SimulationResult {
    teamA: FastTeam;
    teamB: FastTeam;
    score: number;
    metrics: BalanceMetrics;
}

/**
 * Detailed balance metrics
 */
export interface BalanceMetrics {
    balance: number;
    positionBalance: number;
    zonalBalance: number;
    attackDefenseBalance: number;
    energy: number;
}