/**
 * Auto-Balance Metric Transformations
 *
 * Calibrated scoring functions that replace arbitrary Math.pow() calls
 * with interpretable, threshold-based transformations.
 *
 * Key Philosophy:
 * - Raw measurements (ratios, differences) → Normalized scores (0-1)
 * - Thresholds define what's perfect/acceptable/poor
 * - Steepness controls how harshly we penalize imperfection
 * - All transformations are documented and debuggable
 *
 * @module auto-balance/metric-transformations
 */

import type { MetricThresholds } from "./metrics-config";

/**
 * Steepness levels for score degradation
 * Controls how quickly scores drop below "acceptable"
 */
export enum Steepness {
    /** Very gentle falloff - even poor performance scores 0.4+ */
    VeryGentle = 1.0,

    /** Gentle falloff - poor performance scores ~0.3 */
    Gentle = 1.5,

    /** Moderate falloff - poor performance scores ~0.2 */
    Moderate = 2.0,

    /** Steep falloff - poor performance scores ~0.1 */
    Steep = 3.0,

    /** Very steep falloff - poor performance scores near 0 */
    VerySteep = 4.0,
}

/**
 * Calibrated score transformation
 *
 * Maps raw ratios (0-1) to normalized scores (0-1) based on defined thresholds.
 * Replaces arbitrary Math.pow(ratio, X) with interpretable threshold-based scoring.
 *
 * Score Behavior:
 * - ratio >= perfect: Returns 1.0 (perfect score)
 * - ratio >= acceptable: Returns 0.8-1.0 (smooth curve)
 * - ratio between acceptable and poor: Returns 0.2-0.8 (steeper curve)
 * - ratio <= poor: Returns 0.0-0.2 (very steep penalty)
 *
 * @param ratio Raw balance ratio (0-1, where 1 = perfect balance)
 * @param thresholds Perfect/acceptable/poor thresholds
 * @param steepness How harshly to penalize below acceptable (1-5)
 * @returns Normalized score (0-1)
 *
 * @example
 * // Score balance: within 1% = perfect, within 3% = acceptable, >10% = poor
 * const thresholds = { perfect: 0.99, acceptable: 0.97, poor: 0.90 };
 *
 * calibratedScore(0.995, thresholds, Steepness.Moderate); // → 1.0 (perfect)
 * calibratedScore(0.98, thresholds, Steepness.Moderate);  // → 0.9 (good)
 * calibratedScore(0.95, thresholds, Steepness.Moderate);  // → 0.5 (mediocre)
 * calibratedScore(0.85, thresholds, Steepness.Moderate);  // → 0.1 (poor)
 */
export function calibratedScore(
    ratio: number,
    thresholds: MetricThresholds,
    steepness: Steepness = Steepness.Moderate
): number {
    // Clamp ratio to valid range
    const clampedRatio = Math.max(0, Math.min(1, ratio));

    // Perfect or better
    if (clampedRatio >= thresholds.perfect) {
        return 1.0;
    }

    // Below poor threshold - severe penalty
    if (clampedRatio <= thresholds.poor) {
        // Linear interpolation from 0 at ratio=0 to 0.2 at ratio=poor
        return 0.2 * (clampedRatio / thresholds.poor);
    }

    // Between acceptable and perfect - gentle curve
    if (clampedRatio >= thresholds.acceptable) {
        const range = thresholds.perfect - thresholds.acceptable;
        const position = (clampedRatio - thresholds.acceptable) / range;

        // Smooth curve from 0.8 to 1.0
        // Using inverse steepness for gentler curve (rewarding good performance)
        return 0.8 + 0.2 * position ** (1 / steepness);
    }

    // Between poor and acceptable - steeper penalty
    const range = thresholds.acceptable - thresholds.poor;
    const position = (clampedRatio - thresholds.poor) / range;

    // Steeper curve from 0.2 to 0.8
    // Using steepness directly (penalizing mediocre performance)
    return 0.2 + 0.6 * position ** steepness;
}

/**
 * Linear score transformation
 *
 * Simple linear mapping from ratio to score.
 * Use when you want predictable, proportional scoring.
 *
 * @param ratio Raw balance ratio (0-1)
 * @returns Score (0-1), same as input
 */
export function linearScore(ratio: number): number {
    return Math.max(0, Math.min(1, ratio));
}

/**
 * Exponential penalty transformation
 *
 * For metrics where small imbalances should be heavily penalized.
 * Equivalent to Math.pow(ratio, power) but with clear intent.
 *
 * @param ratio Raw balance ratio (0-1)
 * @param power Exponent (higher = harsher penalty)
 * @returns Score (0-1)
 *
 * @example
 * exponentialPenalty(0.95, 2); // → 0.9025 (gentle)
 * exponentialPenalty(0.95, 4); // → 0.8145 (moderate)
 * exponentialPenalty(0.95, 9); // → 0.6302 (harsh)
 * exponentialPenalty(0.95, 16); // → 0.4401 (very harsh)
 */
export function exponentialPenalty(ratio: number, power: number): number {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    return clampedRatio ** power;
}

/**
 * Step function transformation
 *
 * Binary scoring - either acceptable or not.
 * Use for hard requirements.
 *
 * @param ratio Raw balance ratio (0-1)
 * @param threshold Minimum acceptable ratio
 * @returns 1.0 if ratio >= threshold, else 0.0
 */
export function stepFunction(ratio: number, threshold: number): number {
    return ratio >= threshold ? 1.0 : 0.0;
}

/**
 * Sigmoid transformation
 *
 * S-shaped curve - gentle at extremes, steep in middle.
 * Use when you want smooth transitions with a clear inflection point.
 *
 * @param ratio Raw balance ratio (0-1)
 * @param midpoint Center of the curve (inflection point)
 * @param steepness How quickly the curve transitions (higher = steeper)
 * @returns Score (0-1)
 */
export function sigmoidScore(ratio: number, midpoint: number = 0.9, steepness: number = 10): number {
    // Sigmoid function: 1 / (1 + e^(-k*(x-x0)))
    return 1 / (1 + Math.exp(-steepness * (ratio - midpoint)));
}

/**
 * Calculate basic difference ratio
 *
 * Standard ratio calculation used throughout metrics.
 * Returns 1.0 for perfect balance, approaches 0 for extreme imbalance.
 *
 * @param a First value
 * @param b Second value
 * @returns Balance ratio (0-1)
 *
 * @example
 * calculateBasicDifferenceRatio(100, 100); // → 1.0 (perfect)
 * calculateBasicDifferenceRatio(100, 105); // → 0.95 (5% difference)
 * calculateBasicDifferenceRatio(100, 120); // → 0.80 (20% difference)
 */
export function calculateBasicDifferenceRatio(a: number, b: number): number {
    const minValue = Math.min(a, b);

    // Handle zero case - if both are zero, they're balanced
    if (minValue === 0) {
        return a === 0 && b === 0 ? 1.0 : 0.0;
    }

    const differenceRatio = Math.abs(a - b) / minValue;
    return Math.max(0, 1 - differenceRatio);
}

/**
 * Weighted average of multiple ratios
 *
 * Combines multiple balance ratios into a single score.
 * Weights should sum to 1.0 for interpretability.
 *
 * @param ratios Array of balance ratios
 * @param weights Corresponding weights (should sum to 1.0)
 * @returns Weighted average ratio
 */
export function weightedRatioAverage(ratios: number[], weights: number[]): number {
    if (ratios.length !== weights.length) {
        throw new Error("Ratios and weights must have same length");
    }

    let sum = 0;
    let totalWeight = 0;

    for (let i = 0; i < ratios.length; i++) {
        sum += ratios[i] * weights[i];
        totalWeight += weights[i];
    }

    // Normalize by total weight (in case weights don't sum to 1.0)
    return totalWeight > 0 ? sum / totalWeight : 0;
}

/**
 * Multiplicative penalty combination
 *
 * Combines multiple penalties multiplicatively.
 * One bad penalty drags down the entire score.
 *
 * Use when ALL components must be good for overall score to be good.
 *
 * @param penalties Array of penalty values (0-1)
 * @returns Combined penalty (0-1)
 *
 * @example
 * multiplicativePenalty([0.9, 0.9, 0.9]); // → 0.729 (all good → result good)
 * multiplicativePenalty([0.9, 0.5, 0.9]); // → 0.405 (one bad → result bad)
 */
export function multiplicativePenalty(penalties: number[]): number {
    return penalties.reduce((product, penalty) => product * penalty, 1.0);
}

/**
 * Geometric mean
 *
 * Alternative to multiplicative that's less harsh.
 * All components matter, but one bad component doesn't destroy the score.
 *
 * @param values Array of values (0-1)
 * @returns Geometric mean (0-1)
 */
export function geometricMean(values: number[]): number {
    if (values.length === 0) return 0;

    const product = values.reduce((prod, val) => prod * val, 1.0);
    return product ** (1 / values.length);
}

/**
 * Harmonic mean
 *
 * Even less harsh than geometric mean.
 * Dominated by the smallest value.
 *
 * @param values Array of values (0-1)
 * @returns Harmonic mean (0-1)
 */
export function harmonicMean(values: number[]): number {
    if (values.length === 0) return 0;

    const sumOfReciprocals = values.reduce((sum, val) => sum + 1 / Math.max(val, 0.001), 0);
    return values.length / sumOfReciprocals;
}

/**
 * Debug: Print transformation curve
 *
 * Utility to visualize how a transformation function behaves.
 * Useful for understanding and tuning threshold parameters.
 *
 * @param transformFn Transformation function to analyze
 * @param points Number of sample points (default: 20)
 * @returns String representation of the curve
 */
export function visualizeTransformation(transformFn: (ratio: number) => number, points: number = 20): string {
    const lines: string[] = [];
    lines.push("Ratio → Score");
    lines.push("═".repeat(40));

    for (let i = 0; i <= points; i++) {
        const ratio = i / points;
        const score = transformFn(ratio);
        const bar = "█".repeat(Math.round(score * 30));

        lines.push(`${ratio.toFixed(2)} → ${score.toFixed(3)} ${bar}`);
    }

    return lines.join("\n");
}

/**
 * Debug: Compare transformations
 *
 * Side-by-side comparison of multiple transformation functions.
 *
 * @param transforms Map of name → transformation function
 * @param testRatios Specific ratios to test
 */
export function compareTransformations(
    transforms: Record<string, (ratio: number) => number>,
    testRatios: number[] = [0.99, 0.97, 0.95, 0.9, 0.85, 0.8]
): string {
    const lines: string[] = [];
    const names = Object.keys(transforms);

    // Header
    lines.push("Ratio   | " + names.map((n) => n.padEnd(10)).join(" | "));
    lines.push("─".repeat(10 + names.length * 13));

    // Data rows
    for (const ratio of testRatios) {
        const scores = names.map((name) => transforms[name](ratio).toFixed(3));
        lines.push(`${ratio.toFixed(2)}    | ` + scores.join(" | "));
    }

    return lines.join("\n");
}

/**
 * Sensitivity analysis
 *
 * Shows how sensitive a score is to changes in input ratio.
 * Higher sensitivity = small changes in ratio cause large score changes.
 *
 * @param transformFn Transformation function
 * @param ratio Point to analyze
 * @param delta Small change to test (default: 0.01)
 * @returns Sensitivity value (score change per ratio change)
 */
export function calculateSensitivity(
    transformFn: (ratio: number) => number,
    ratio: number,
    delta: number = 0.01
): number {
    const scoreBefore = transformFn(ratio - delta / 2);
    const scoreAfter = transformFn(ratio + delta / 2);

    return (scoreAfter - scoreBefore) / delta;
}
