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
