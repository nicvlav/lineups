/**
 * Auto-Balance Type Definitions
 *
 * Core types and interfaces for the team balancing system.
 *
 * @module auto-balance/types
 */

import type { Formation } from "@/types/positions";
import type { ScoredGamePlayer } from "@/types/players";
import type { BalanceConfiguration } from "./metrics-config";

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
 *
 * @deprecated Use BalanceConfiguration from metrics-config.ts instead
 * This is kept for backwards compatibility during migration
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
 * Convert new BalanceConfiguration to legacy BalanceConfig
 * Helper for gradual migration
 */
export function convertToLegacyConfig(config: BalanceConfiguration): BalanceConfig {
    return {
        weights: {
            overallStrengthBalance: config.weights.primary.peakPotential,
            positionalScoreBalance: config.weights.primary.scoreBalance,
            zonalDistributionBalance: config.weights.secondary.zoneBalance,
            energyBalance: config.weights.secondary.energy,
            creativityBalance: config.weights.secondary.creativity,
            strikerBalance: config.weights.secondary.striker,
            allStatBalance: config.weights.secondary.allStatBalance,
            talentDistributionBalance: config.weights.primary.starDistribution,
        },
        dominanceRatio: 1.03, // Keep default
        recursive: config.monteCarlo.enableRefinement,
        recursiveDepth: config.monteCarlo.maxIterations,
        debugMode: false,
    };
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

    /** Attacking workrate score for energy balance calculation */
    attWorkrateScore: number;

    /** Defensive workrate score for energy balance calculation */
    defWorkrateScore: number;

    /** Workrate score for energy balance calculation (deprecated - kept for compatibility) */
    workrateScore: number;

    /** Creativity score for creativity balance calculation */
    creativityScore: number;

    /** Striker score for striker balance calculation */
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

/**
 * Star player zone classification
 * Categorizes a star player as defensive, attacking, or all-rounder specialist
 */
export interface StarZoneClassification {
    /** The player being classified */
    player: FastPlayer;

    /** The player name being classified */
    name: string;

    /** Type of specialist: defensive, attacking, midfielder, or all-rounder */
    specialistType: 'defensive' | 'attacking' | 'midfielder' | 'all-rounder';

    /** Best defensive position score */
    bestDefensiveScore: number;

    /** Best attacking position score */
    bestMidfieldScore: number;

    /** Best attacking position score */
    bestAttackingScore: number;

    /** Average score across all positions */
    averageScore: number;
}

/**
 * Team star distribution by zone
 */
export interface TeamStarDistribution {
    /** Total star players on the team */
    totalStars: number;

    /** Number of defensive specialists */
    defensiveSpecialists: number;

    /** Number of attacking specialists */
    attackingSpecialists: number;

    /** Number of all-rounders */
    allRounders: number;

    /** Number of midfielders */
    midfielders: number;

    /** Detailed classifications for each star player */
    classifications: StarZoneClassification[];
}

