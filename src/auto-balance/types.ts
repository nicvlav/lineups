/**
 * Auto-Balance Type Definitions
 *
 * Core types and interfaces for the team balancing system.
 *
 * @module auto-balance/types
 */

import type { ScoredGamePlayer } from "@/types/players";
import type { Formation, StarZoneClassification } from "@/types/positions";
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

    /** Currently assigned position index (-1 if unassigned) */
    assignedPosition: number;

    /** Assigned team */
    team: "A" | "B" | null;

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

    /** Pre-calculated specialist status */
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

// ===== ZONE AFFINITY SYSTEM (Gradient Specialist Profiles) =====

/**
 * Continuous zone affinity profile for a player
 *
 * Replaces binary specialist classification with gradient values
 * that capture "how much" of a specialist a player is, not just "is/isn't".
 *
 * Uses softmax normalization for affinity distribution and entropy-based
 * specialist strength calculation.
 */
export interface ZoneAffinityProfile {
    /** Raw zone scores from FastPlayer.zoneScores */
    rawScores: {
        def: number;
        mid: number;
        att: number;
    };

    /**
     * Normalized affinity distribution (sums to 1.0)
     * Calculated via softmax to concentrate mass on strongest zones
     */
    affinity: {
        def: number;
        mid: number;
        att: number;
    };

    /**
     * Specialist strength: 0 = pure all-rounder, 1 = extreme specialist
     * Calculated as 1 - (entropy / maxEntropy)
     */
    specialistStrength: number;

    /**
     * Flexibility score: how usable is this player across multiple zones?
     * Calculated from score range: narrow range = more flexible
     */
    flexibility: number;

    /**
     * Dominant zone for backward compatibility with existing classification
     * Only set if one zone has >= 45% affinity, otherwise 'balanced'
     */
    dominantZone: "def" | "mid" | "att" | "balanced";
}

/**
 * Pre-computed and ranked star split for guided Monte Carlo
 *
 * Generated by testing all C(n, n/2) possible star distributions
 * and scoring them using gradient affinity metrics.
 */
export interface RankedStarSplit {
    /** Indices of star players assigned to team A */
    teamAIndices: number[];

    /** Indices of star players assigned to team B */
    teamBIndices: number[];

    /** Quality score for this split (0-1, higher is better) */
    score: number;

    /** Rank in the sorted list (0 = best) */
    rank: number;

    /** Breakdown of component scores for debugging/logging */
    breakdown: {
        /** Zone affinity balance between teams (gradient-based) */
        affinityBalance: number;
        /** Sum of star quality balance between teams */
        qualityBalance: number;
        /** Flexibility balance between teams */
        flexibilityBalance: number;
        /** Count-based specialist balance (backward compat) */
        specialistCountBalance: number;
        /** Peak talent distribution balance (prevents star concentration) */
        peakTalentBalance: number;
    };
}

/**
 * Pool characteristics for dynamic strictness calculation
 *
 * Captures properties of the player pool that affect how
 * strict or lenient the penalty system should be.
 */
export interface PoolCharacteristics {
    /** Total number of star players */
    numStars: number;

    /** Standard deviation of star quality scores */
    qualityVariance: number;

    /**
     * Specialization entropy: how diverse are specialist types?
     * 0 = all same type, 1 = perfectly balanced across types
     */
    specializationEntropy: number;

    /** Best achievable split score from pre-computation */
    bestAchievableSplit: number;

    /** Mean split score across all combinations */
    meanSplitScore: number;

    /** Ratio of best to mean (higher = more differentiation possible) */
    optimizationPotential: number;
}

/**
 * Configuration for guided Monte Carlo star split selection
 */
export interface GuidedSelectionConfig {
    /**
     * Concentration parameter for weighted selection
     * Higher = stronger preference for top-ranked splits
     * Range: 1.0 (uniform) to 8.0 (heavily concentrated)
     */
    concentrationParameter: number;

    /**
     * Minimum probability for any split (ensures exploration)
     * Prevents complete elimination of lower-ranked options
     */
    minProbability: number;
}

/**
 * Dynamic strictness parameters calculated from pool characteristics
 */
export interface DynamicStrictness {
    /**
     * Shaping exponent for penalty curves
     * Range: 1.0 (gentle) to 4.0 (harsh)
     */
    shapingExponent: number;

    /** Concentration for guided selection */
    concentrationParameter: number;

    /** Weight for quality penalty component */
    qualityPenaltyWeight: number;
}

/**
 * Extended optimal distribution stats including ranked splits
 */
export interface ExtendedOptimalStats {
    /** Best (highest) penalty achievable */
    best: number;

    /** Worst (lowest) penalty achievable */
    worst: number;

    /** Mean penalty across all splits */
    mean: number;

    /** Total star player count */
    numStars: number;

    /** Number of combinations tested */
    combinations: number;

    /** Pre-ranked star splits for guided selection */
    rankedSplits: RankedStarSplit[];

    /** Pool characteristics for dynamic strictness */
    poolCharacteristics: PoolCharacteristics;

    /** Calculated dynamic strictness parameters */
    strictness: DynamicStrictness;
}
