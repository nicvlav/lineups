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

    // ===== PRE-CALCULATED ANALYTICS (calculated once before Monte Carlo) =====

    /** Pre-calculated weighted creativity score (vision, teamwork, decisions, passing, composure) */
    allStatsScore: number;

    /** Pre-calculated weighted creativity score (vision, teamwork, decisions, passing, composure) */
    creativityScore: number;

    /** Pre-calculated weighted striker score (finishing, offTheBall, technique, attWorkrate) */
    strikerScore: number;

    /** Pre-calculated stamina score */
    staminaScore: number;

    /** Pre-calculated attacking workrate score */
    attWorkrateScore: number;

    /** Pre-calculated defensive workrate score */
    defWorkrateScore: number;

    /** Pre-calculated best score by zone [GK, DEF, MID, ATT] - for star classification */
    zoneScores: Float32Array;

    /** Pre-calculated primary zone index (0=GK, 1=DEF, 2=MID, 3=ATT) */
    primaryZone: number;

    /** Pre-calculated star player status (bestScore >= threshold) */
    isStarPlayer: boolean;

    /** Pre-calculated star tier (0=not star, 1=good, 2=elite, 3=world-class) */
    starTier: number;

    /** Pre-calculated specialist status (specializationRatio >= 1.8) */
    isSpecialist: boolean;

    /** Pre-calculated star zone classification (only relevant if isStarPlayer = true) */
    starClassification: StarZoneClassification | null;
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

    /** Stamina score for energy balance calculation */
    allStatsScore: number;
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

/**
 * Context object for the team assignment algorithm
 * Encapsulates all state needed during the assignment process
 */
export interface AssignmentContext {
    // Input configuration
    config: BalanceConfiguration;

    // Teams being built
    teamA: FastTeam;
    teamB: FastTeam;

    // Formation arrays (mutable - decremented as positions are filled)
    formationA: Int8Array;
    formationB: Int8Array;

    // Available players pool (mutable - players removed as assigned)
    available: FastPlayer[];

    // Position priorities (mutable - incremented as positions are filled)
    teamAPriorities: Int8Array;
    teamBPriorities: Int8Array;

    // Pre-built comparators for each position
    comparators: Map<number, (a: FastPlayer, b: FastPlayer) => number>;

    // Algorithm configuration
    proximityThreshold: number;
    selectionWeights: number[];
    topN: number;
}

