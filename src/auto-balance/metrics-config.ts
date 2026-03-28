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

    /** Probability weights for selecting from top N candidates [1st, 2nd, 3rd, 4th...] */
    selectionWeights: number[];
}

/**
 * Monte Carlo simulation configuration
 */
export interface MonteCarloConfig {
    /** Maximum iterations before stopping */
    maxIterations: number;
}

/**
 * Star player classification thresholds
 */
export interface StarPlayerThresholds {
    /** Minimum absolute threshold for "star" classification */
    absoluteMinimum: number;
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
    // ── Weights ─────────────────────────────────────────────────────────────
    // Primary + secondary weights sum to 1.0.
    // Primary drives the headline balance; secondary fine-tunes "feel".
    weights: {
        primary: {
            // How closely placed scores match peak potential per player
            scoreBalance: 0.1,
            // Even distribution of top-rated players across teams
            starDistribution: 0.1,
            // Theoretical maximum team strength must be close
            peakPotential: 0.3,
        },
        secondary: {
            // Per-zone (DEF/MID/ATT) competitiveness between teams
            zoneBalance: 0.02,
            // Sum of all raw stats — catches hidden attribute advantages
            allStatBalance: 0.05,
            // Stamina + work rate balance — affects match endurance
            energy: 0.16,
            // Vision, passing, composure — playmaking balance
            creativity: 0.15,
            // Finishing, positioning — goalscoring threat balance
            striker: 0.12,
        },
    },

    // ── Thresholds ────────────────────────────────────────────────────────
    // Each metric gets a calibrated [perfect, acceptable, poor] curve via
    // calibratedScore(). Values are ratio-based (1.0 = perfectly balanced).
    thresholds: {
        scoreBalance: {
            perfect: 0.95,
            acceptable: 0.85,
            poor: 0.7,
        },
        starDistribution: {
            perfect: 0.99,
            acceptable: 0.975,
            poor: 0.9,
        },
        // Very strict — even tiny peak-potential gaps are noticeable
        peakPotential: {
            perfect: 0.99995,
            acceptable: 0.999,
            poor: 0.95,
        },
        zoneBalance: {
            perfect: 0.97,
            acceptable: 0.93,
            poor: 0.8,
        },
        allStatBalance: {
            perfect: 0.99,
            acceptable: 0.94,
            poor: 0.9,
        },
        energy: {
            perfect: 0.99,
            acceptable: 0.94,
            poor: 0.85,
        },
        creativity: {
            perfect: 0.99,
            acceptable: 0.975,
            poor: 0.9,
        },
        striker: {
            perfect: 0.99,
            acceptable: 0.94,
            poor: 0.9,
        },
    },

    // ── Algorithm ─────────────────────────────────────────────────────────
    algorithm: {
        // Only randomize between players within this many points of the best candidate
        proximityThreshold: 5,
        // Whether to scale candidate pool size with team size
        topNScaling: false,
        // Number of top candidates to choose from at each position fill
        baseTopN: 5,
        // Weighted probability for selecting from top N (must match baseTopN length)
        selectionWeights: [0.5, 0.25, 0.15, 0.05, 0.05],
    },

    monteCarlo: {
        // Higher = better results but slower. 40k gives good convergence.
        maxIterations: 40000,
    },

    starPlayers: {
        // Players scoring >= 87 in their best position are "star" tier.
        // Roughly the top 20-30% in a typical pool of 18-22 players.
        absoluteMinimum: 87,
    },

    // ── Composite Formulas ────────────────────────────────────────────────
    // Weighted stat combinations used to derive team-level composite scores.
    // Weight of 5 = primary driver; weight of 1 = contributing factor.
    formulas: {
        creativity: {
            vision: 5,
            teamwork: 1,
            decisions: 1,
            passing: 1,
            composure: 1,
        },
        striker: {
            finishing: 5,
            offTheBall: 1,
            technique: 1,
            attWorkrate: 1,
        },
        // Tier weights for star distribution — superstars matter most
        starDistribution: {
            superstars: 0.6,
            stars: 0.3,
            solid: 0.1,
        },
        zoneDirectionality: {
            // Zone within 0.5% is considered neutral (no winner)
            neutralEpsilon: 0.995,
            // 3-0 zone sweep: one team dominates all zones → 90% penalty
            dominationPenalty: 0.1,
            // 2-0-1 sweep: two decisive zones → 60% penalty
            twoZonePenalty: 0.4,
        },
        midfieldPreference: {
            // Penalize teams whose strongest zone isn't midfield (midfield controls the game)
            penaltyStrength: 0.2,
        },
        positionalBalance: {
            diffWeight: 0.8,
            efficiencyWeight: 0.2,
        },
        directionalImbalance: {
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
export function explainThreshold(metricName: string, thresholds: MetricThresholds, totalScore: number = 100): string {
    const perfectDiff = totalScore * (1 - thresholds.perfect);
    const acceptableDiff = totalScore * (1 - thresholds.acceptable);
    const poorDiff = totalScore * (1 - thresholds.poor);

    return `${metricName}:
  - Perfect: <${perfectDiff.toFixed(1)} point difference (ratio >= ${thresholds.perfect})
  - Acceptable: <${acceptableDiff.toFixed(1)} point difference (ratio >= ${thresholds.acceptable})
  - Poor: >${poorDiff.toFixed(1)} point difference (ratio <= ${thresholds.poor})`;
}
