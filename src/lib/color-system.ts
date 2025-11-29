/**
 * Unified Color System
 *
 * Provides consistent color theming across all player visualizations:
 * - Card underlines
 * - Archetype bars
 * - Admin stats
 *
 * Uses a more nuanced 5-tier system with gradient support
 */

// ============ Color Tiers ============

export type ColorTier = 'elite' | 'excellent' | 'good' | 'average' | 'below';

export interface ColorScheme {
  tier: ColorTier;
  // Solid colors (for underlines, borders, text)
  solid: string;
  solidBg: string;
  text: string;
  // Gradient colors (for bars)
  gradient: string;
  // Opacity variants
  subtle: string; // Low opacity for backgrounds
}

/**
 * Unified color palette - more ambiguous and harmonious
 * Uses softer, more similar colors than before
 */
const COLOR_SCHEMES: Record<ColorTier, ColorScheme> = {
  elite: {
    tier: 'elite',
    solid: 'bg-emerald-400',
    solidBg: 'bg-emerald-500',
    text: 'text-emerald-400',
    gradient: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    subtle: 'bg-emerald-400/30',
  },
  excellent: {
    tier: 'excellent',
    solid: 'bg-blue-400',
    solidBg: 'bg-blue-500',
    text: 'text-blue-400',
    gradient: 'bg-gradient-to-r from-blue-500 to-blue-400',
    subtle: 'bg-blue-400/30',
  },
  good: {
    tier: 'good',
    solid: 'bg-cyan-400',
    solidBg: 'bg-cyan-500',
    text: 'text-cyan-400',
    gradient: 'bg-gradient-to-r from-cyan-500 to-cyan-400',
    subtle: 'bg-cyan-400/30',
  },
  average: {
    tier: 'average',
    solid: 'bg-amber-400',
    solidBg: 'bg-amber-500',
    text: 'text-amber-400',
    gradient: 'bg-gradient-to-r from-amber-500 to-amber-400',
    subtle: 'bg-amber-400/30',
  },
  below: {
    tier: 'below',
    solid: 'bg-slate-400',
    solidBg: 'bg-slate-500',
    text: 'text-slate-400',
    gradient: 'bg-gradient-to-r from-slate-500 to-slate-400',
    subtle: 'bg-slate-400/30',
  },
};

// ============ Card Underlines (Rating-based) ============

/**
 * Get color for card underlines based on overall rating
 * Thresholds: 90, 80, 70, 60, <60
 */
export function getCardUnderlineColor(rating: number): string {
  const tier = getRatingTier(rating);
  return COLOR_SCHEMES[tier].subtle;
}

/**
 * Determine color tier from overall rating
 */
function getRatingTier(rating: number): ColorTier {
  if (rating >= 90) return 'elite';
  if (rating >= 80) return 'excellent';
  if (rating >= 70) return 'good';
  if (rating >= 60) return 'average';
  return 'below';
}

// ============ Archetype Bars (Relative to Best) ============

/**
 * Get gradient color for archetype bars based on difference from global best
 * Thresholds: ≤3, ≤7, ≤12, ≤20, >20
 */
export function getArchetypeBarColor(score: number, globalBestScore: number): string {
  const tier = getRelativeTier(score, globalBestScore);
  return COLOR_SCHEMES[tier].gradient;
}

/**
 * Get text color for archetype scores
 */
export function getArchetypeTextColor(score: number, globalBestScore: number): string {
  const tier = getRelativeTier(score, globalBestScore);
  return COLOR_SCHEMES[tier].text;
}

/**
 * Determine color tier from score relative to global best
 */
function getRelativeTier(score: number, globalBestScore: number): ColorTier {
  const difference = globalBestScore - score;

  if (difference <= 3) return 'elite';
  if (difference <= 7) return 'excellent';
  if (difference <= 12) return 'good';
  if (difference <= 20) return 'average';
  return 'below';
}

// ============ Stats Bars (Admin/Face Stats) ============

/**
 * Get solid color for stat bars (admin stats, face stats)
 * Thresholds: ≥75, ≥60, <60
 *
 * Note: Slightly adjusted thresholds for better distribution
 */
export function getStatBarColor(value: number): string {
  const tier = getStatTier(value);
  return COLOR_SCHEMES[tier].solidBg;
}

/**
 * Get text color for stat values
 */
export function getStatTextColor(value: number): string {
  const tier = getStatTier(value);
  return COLOR_SCHEMES[tier].text;
}

/**
 * Determine color tier from stat value
 */
function getStatTier(value: number): ColorTier {
  if (value >= 80) return 'elite';
  if (value >= 70) return 'excellent';
  if (value >= 60) return 'good';
  if (value >= 50) return 'average';
  return 'below';
}

// ============ Export All Color Schemes ============

/**
 * Get full color scheme for a specific tier
 * Useful for custom implementations
 */
export function getColorScheme(tier: ColorTier): ColorScheme {
  return COLOR_SCHEMES[tier];
}

/**
 * Get color scheme for a rating value
 */
export function getColorSchemeForRating(rating: number): ColorScheme {
  const tier = getRatingTier(rating);
  return COLOR_SCHEMES[tier];
}

/**
 * Get color scheme for a stat value
 */
export function getColorSchemeForStat(value: number): ColorScheme {
  const tier = getStatTier(value);
  return COLOR_SCHEMES[tier];
}
