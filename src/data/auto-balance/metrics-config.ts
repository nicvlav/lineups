/**
 * Auto-Balance Metrics Configuration
 *
 * Centralized configuration for all metric thresholds, weights, and parameters.
 * This file eliminates magic numbers and provides clear, documented control points.
 *
 * @module auto-balance/metrics-config
 */

/**
 * Threshold configuration for a metric
 * Defines what constitutes perfect/acceptable/poor performance
 */
export interface MetricThresholds {
    /** Ratio >= this value scores as 1.0 (perfect) */
    perfect: number;

    /** Ratio >= this value scores as ~0.8 (acceptable) */
    acceptable: number;

    /** Ratio <= this value scores as ~0.2 (poor) */
    poor: number;
}

/**
 * Metric weight configuration
 * All weights should sum to 1.0 for interpretability
 */
export interface MetricWeights {
    /** Primary metrics - what users care about most */
    primary: {
        /** Overall team score balance (actual assigned scores) */
        scoreBalance: number;

        /** Star player distribution (top talent evenly split) */
        starDistribution: number;

        /** Peak potential balance */
        peakPotential: number;


    };

    /** Secondary metrics - fine-tuning adjustments */
    secondary: {
        /** Zone balance (defense/midfield/attack evenness) */
        zoneBalance: number;

        /** Sum of all individual player stats */
        allStatBalance: number;

        /** Stamina and work rate balance */
        energy: number;

        /** Vision, passing, composure balance */
        creativity: number;

        /** Finishing, technique, positioning balance */
        striker: number;
    };
}

/**
 * Algorithm behavior configuration
 */
export interface AlgorithmConfig {
    /** Maximum score difference to consider players as "similar quality" */
    proximityThreshold: number;

    /** Scale candidate pool size with team size */
    topNScaling: boolean;

    /** Base number of candidates to consider (before scaling) */
    baseTopN: number;

    /** How to select positions within a zone */
    zonePositionStrategy: 'random' | 'priority' | 'weighted';

    /** Probability weights for selecting from top N candidates [1st, 2nd, 3rd, 4th...] */
    selectionWeights: number[];
}

/**
 * Monte Carlo simulation configuration
 */
export interface MonteCarloConfig {
    /** Maximum iterations before stopping */
    maxIterations: number;

    /** Number of top results to track */
    trackTopN: number;

    /** Enable refinement pass on best result */
    enableRefinement: boolean;

    /** Iterations for refinement pass */
    refinementIterations: number;
}

/**
 * Star player classification thresholds
 */
export interface StarPlayerThresholds {
    /** Minimum absolute threshold for "star" classification */
    absoluteMinimum: number;

    /** Use statistical quartile (75th percentile) if higher than absolute */
    useQuartile: boolean;

    /** Points above threshold to classify as "superstar" */
    superstarBonus: number;

    /** Points below threshold still considered "solid" */
    solidRange: number;

    /** Zone specialization thresholds */
    zoneSpecialization: {
        /** Minimum score difference between best zone and average to be considered a specialist */
        specialistGapThreshold: number;

        /** Minimum score difference between defensive and attacking zones for all-rounder classification */
        allRounderBalanceThreshold: number;

        /** Penalty multiplier per extra specialist in same zone beyond balanced distribution */
        zoneStackingPenalty: number;
    };
}

/**
 * Statistical formulas and weights used in composite metrics
 */
export interface CompositeMetricFormulas {
    /** Creativity score formula weights */
    creativity: {
        vision: number;
        teamwork: number;
        decisions: number;
        passing: number;
        composure: number;
    };

    /** Striker score formula weights */
    striker: {
        finishing: number;
        offTheBall: number;
        technique: number;
        attWorkrate: number;
    };

    /** Star distribution tier weights */
    starDistribution: {
        superstars: number;
        stars: number;
        solid: number;
    };

    /** Zone directional penalty thresholds */
    zoneDirectionality: {
        /** Ratio threshold for considering a zone "neutral" (balanced) */
        neutralEpsilon: number;

        /** Penalty for 3-0 zone split (one team dominates all zones) */
        dominationPenalty: number;

        /** Penalty for 2-0-1 zone split (two zones favor one team) */
        twoZonePenalty: number;
    };

    /** Midfield preference penalty */
    midfieldPreference: {
        /** How strongly to penalize non-midfield-dominant teams (0-1) */
        penaltyStrength: number;
    };

    /** Positional balance formula */
    positionalBalance: {
        /** Weight for efficiency difference component */
        diffWeight: number;

        /** Weight for overall efficiency component */
        efficiencyWeight: number;
    };

    /** Directional imbalance penalty */
    directionalImbalance: {
        /** Penalty per component favoring same team (0-1) */
        penaltyPerComponent: number;
    };
}

/**
 * Complete balance configuration
 * Single source of truth for all auto-balance parameters
 */
export interface BalanceConfiguration {
    /** Metric weight distribution */
    weights: MetricWeights;

    /** Acceptable threshold ranges for each metric */
    thresholds: {
        scoreBalance: MetricThresholds;
        starDistribution: MetricThresholds;
        zoneBalance: MetricThresholds;
        peakPotential: MetricThresholds;
        allStatBalance: MetricThresholds;
        energy: MetricThresholds;
        creativity: MetricThresholds;
        striker: MetricThresholds;
    };

    /** Algorithm behavior settings */
    algorithm: AlgorithmConfig;

    /** Monte Carlo simulation settings */
    monteCarlo: MonteCarloConfig;

    /** Star player classification */
    starPlayers: StarPlayerThresholds;

    /** Composite metric formulas */
    formulas: CompositeMetricFormulas;
}

/**
 * Default production configuration
 * Carefully calibrated based on real-world testing
 */
export const DEFAULT_BALANCE_CONFIG: BalanceConfiguration = {
    weights: {
        primary: {
            // #1 Priority: Actual score balance (what users see and care about)
            scoreBalance: 0.1,

            // #1 Priority: Top talent evenly distributed
            starDistribution: 0.175,

            // #2 Priority: Each zone (DEF/MID/ATT) competitive
            peakPotential: 0.2,
        },
        secondary: {
            // Peak potential matters less than actual scores
            zoneBalance: 0.1,

            // All-stat balance ensures no hidden advantages
            allStatBalance: 0.05,

            // Fine-tuning metrics
            energy: 0.125,
            creativity: 0.125,
            striker: 0.125,
        }
    },

    thresholds: {
        // Score balance: Within 1% = perfect, within 3% = acceptable, >10% = poor
        scoreBalance: {
            perfect: 0.88,      // <1% difference (e.g., 400 vs 404 out of 800 total)
            acceptable: 0.85,   // <3% difference (e.g., 400 vs 412)
            poor: 0.83,         // >10% difference (e.g., 400 vs 440)
        },

        // Star distribution: Perfect = equal split, acceptable = ±1 player, poor = ±3 players
        starDistribution: {
            perfect: 0.99,
            acceptable: 0.975,
            poor: 0.95,
        },

        // Peak potential: Theoretical max strength
        peakPotential: {
            perfect: 0.9995,      // <2% difference in potential
            acceptable: 0.99,   // <5% difference
            poor: 0.95,         // >15% difference
        },

        // Zone balance: Each zone competitive between teams
        zoneBalance: {
            perfect: 0.97,      // All zones within 5% of each other
            acceptable: 0.93,   // Most zones balanced, one slightly off
            poor: 0.90,         // Multiple zones significantly imbalanced
        },

        // Peak potential: Theoretical max strength
        allStatBalance: {
            perfect: 0.99,
            acceptable: 0.975,
            poor: 0.95,
        },

        // Energy: Stamina + work rate
        energy: {
            perfect: 0.99,
            acceptable: 0.975,
            poor: 0.95,
        },

        // Creativity: Vision, passing, composure
        creativity: {
            perfect: 0.99,
            acceptable: 0.975,
            poor: 0.95,
        },

        // Energy: Stamina + work rate
        striker: {
            perfect: 0.99,
            acceptable: 0.94,
            poor: 0.93,
        },
    },

    algorithm: {
        // Only randomize between players within 5 points of best
        proximityThreshold: 10,

        // Scale candidate pool with team size (20 players = top 4 candidates)
        topNScaling: true,
        baseTopN: 8,

        // Use priority-based position selection within zones
        zonePositionStrategy: 'priority',

        // Weighted probability for selecting from top N: [50%, 30%, 15%, 5%]
        selectionWeights: [0.4, 0.2, 0.15, 0.1, 0.05, 0.05, 0.025, 0.025],
    },

    monteCarlo: {
        // Run up to 200 iterations
        maxIterations: 50000,

        // Track top 10 results
        trackTopN: 20,

        // Enable refinement pass on best result
        enableRefinement: true,
        refinementIterations: 50,
    },

    starPlayers: {
        // Minimum 87 rating to be considered "star"
        absoluteMinimum: 87,

        // Also use 75th percentile if higher than 87
        useQuartile: true,

        // +3 points above threshold = "superstar" (typically 90+)
        superstarBonus: 3,

        // -5 points below threshold still "solid" (82-86)
        solidRange: 5,

        // Zone specialization configuration
        zoneSpecialization: {
            // A star is a specialist if their best zone is 8+ points above their average
            // Example: CB 95, other positions 80s = specialist defender
            specialistGapThreshold: 6,

            // All-rounder if defensive and attacking scores are within 5 points
            // Example: DEF 90, ATT 88 = balanced all-rounder
            allRounderBalanceThreshold: 5,

            // Apply 0.15 penalty multiplier per extra stacked specialist beyond balance
            // Example: Team A has 3 defensive specialists, Team B has 1 → 2 extra → 0.7 penalty
            zoneStackingPenalty: 0.15,
        },
    },

    formulas: {
        creativity: {
            // Vision is most important for creativity
            vision: 5,
            teamwork: 1,
            decisions: 1,
            passing: 1,
            composure: 1,
        },

        striker: {
            // Finishing is most important for striker quality
            finishing: 5,
            offTheBall: 1,
            technique: 1,
            attWorkrate: 1,
        },

        starDistribution: {
            // Superstar distribution matters most
            superstars: 0.60,
            stars: 0.30,
            solid: 0.10,
        },

        zoneDirectionality: {
            // Consider zone balanced if within 0.5% (ratio >= 0.995)
            neutralEpsilon: 0.995,

            // 90% penalty if one team wins all 3 zones (DEF/MID/ATT)
            dominationPenalty: 0.10,

            // 60% penalty if one team wins 2 zones decisively
            twoZonePenalty: 0.40,
        },

        midfieldPreference: {
            // Moderate penalty (50%) for not having midfield as strongest zone
            penaltyStrength: 0.2,
        },

        positionalBalance: {
            // Efficiency difference matters more than absolute efficiency
            diffWeight: 0.8,
            efficiencyWeight: 0.2,
        },

        directionalImbalance: {
            // 30% penalty per component that favors the same team
            penaltyPerComponent: 0.3,
        },
    },
} as const;

/**
 * Utility function to get total weight for validation
 */
export function getTotalWeight(weights: MetricWeights): number {
    const primaryTotal = Object.values(weights.primary).reduce((sum, w) => sum + w, 0);
    const secondaryTotal = Object.values(weights.secondary).reduce((sum, w) => sum + w, 0);
    return primaryTotal + secondaryTotal;
}

/**
 * Validate that weights sum to approximately 1.0
 */
export function validateWeights(weights: MetricWeights): boolean {
    const total = getTotalWeight(weights);
    const tolerance = 0.001; // Allow tiny floating point errors
    return Math.abs(total - 1.0) < tolerance;
}

/**
 * Get human-readable explanation of a threshold
 */
export function explainThreshold(
    metricName: string,
    thresholds: MetricThresholds,
    totalScore: number = 100
): string {
    const perfectDiff = totalScore * (1 - thresholds.perfect);
    const acceptableDiff = totalScore * (1 - thresholds.acceptable);
    const poorDiff = totalScore * (1 - thresholds.poor);

    return `${metricName}:
  - Perfect: <${perfectDiff.toFixed(1)} point difference (ratio >= ${thresholds.perfect})
  - Acceptable: <${acceptableDiff.toFixed(1)} point difference (ratio >= ${thresholds.acceptable})
  - Poor: >${poorDiff.toFixed(1)} point difference (ratio <= ${thresholds.poor})`;
}
