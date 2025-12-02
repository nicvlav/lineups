/**
 * Unified Relative Scoring System
 *
 * Central utility for calculating and displaying relative scores across the entire app.
 * Philosophy: A player's best position/archetype = 100%, everything else is relative to that.
 *
 * Used by:
 * - Player dialog position scores
 * - Archetype bars on cards
 * - Any other relative comparison UI
 */

/**
 * Apply exponential/logarithmic scaling to visual bar width
 * Makes small differences more visible while keeping 100% at 100%
 *
 * This is ONLY for visual presentation (bar length), not the actual score.
 * The color thresholds use the non-scaled relative percentage.
 *
 * @param relativePercent - The relative percentage (0-100)
 * @param exponent - Controls curve steepness (default: 2.5)
 * @returns Scaled percentage for visual display (0-100)
 *
 * @example
 * applyVisualScaling(90) // Returns ~72 (shorter bar, more visual distinction)
 * applyVisualScaling(100) // Returns 100 (best always shows full)
 */
export function applyVisualScaling(relativePercent: number, exponent: number = 2.5): number {
  if (relativePercent <= 0) return 0;
  if (relativePercent >= 100) return 100;

  const x = relativePercent / 100; // Normalize to 0-1
  const scaled = Math.pow(x, exponent); // Exponential transform

  return scaled * 100;
}

/**
 * Calculate relative percentage from best score
 * Formula: 100 - (bestScore - currentScore)
 *
 * @param currentScore - The score for this position/archetype
 * @param bestScore - The player's best score
 * @returns Relative percentage (0-100)
 *
 * @example
 * // Player's best is 65, current is 62
 * calculateRelativeScore(62, 65) // Returns 97
 *
 * @example
 * // Player's best is 80, current is 70
 * calculateRelativeScore(70, 80) // Returns 90
 */
export function calculateRelativeScore(currentScore: number, bestScore: number): number {
  if (bestScore === 0) return 0;
  if (currentScore >= bestScore) return 100;

  return 100 - (bestScore - currentScore);
}

/**
 * Calculate relative scores for all items in a collection
 *
 * @param scores - Object mapping keys to absolute scores
 * @returns Object mapping keys to relative percentages (0-100)
 *
 * @example
 * const positions = { ST: 65, AM: 62, CM: 58 };
 * calculateAllRelativeScores(positions);
 * // Returns: { ST: 100, AM: 95, CM: 90 }
 */
export function calculateAllRelativeScores<T extends Record<string, number>>(
  scores: T
): Record<keyof T, number> {
  const values = Object.values(scores) as number[];
  const bestScore = Math.max(...values);

  if (bestScore === 0) {
    // No data - return zeros
    return Object.fromEntries(
      Object.keys(scores).map(key => [key, 0])
    ) as Record<keyof T, number>;
  }

  return Object.fromEntries(
    Object.entries(scores).map(([key, score]) => [
      key,
      calculateRelativeScore(score as number, bestScore)
    ])
  ) as Record<keyof T, number>;
}

/**
 * Get top N items sorted by relative score
 *
 * @param scores - Object mapping keys to relative scores
 * @param n - Number of top items to return
 * @param excludeKeys - Keys to exclude from results
 * @returns Array of [key, score] tuples, sorted by score descending
 */
export function getTopRelativeScores<T extends Record<string, number>>(
  scores: T,
  n: number,
  excludeKeys: (keyof T)[] = []
): Array<[keyof T, number]> {
  return Object.entries(scores)
    .filter(([key]) => !excludeKeys.includes(key as keyof T))
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, n) as Array<[keyof T, number]>;
}
