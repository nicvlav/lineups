/**
 * Unified Color System - FOREST GREEN anchor
 *
 * Provides consistent color theming across all player visualizations:
 * - Card underlines
 * - Archetype bars
 * - Admin stats
 *
 * FOREST GREEN to purply-blue with reduced muting throughout
 * - Elite (90+): Forest green (145° - pitch background inspired, chroma 0.16)
 * - Excellent (80-89): Cyan-green (180° - bridge, chroma 0.15)
 * - Great (70-79): Sky blue (220° - chroma 0.14)
 * - Good (60-69): Blue-purple (250° - chroma 0.13)
 * - Solid (<60): Purply-blue (270° - chroma 0.12, reduced muting)
 *
 * Color philosophy:
 * - 125° rotation (forest green→cyan→blue→purple) - all cool tones
 * - Elite matches pitch background green aesthetic (145° vs pitch ~130°)
 * - True forest green at top (not lime, not cyan-green)
 * - REDUCED muting: chroma only drops 0.16 → 0.12 (gentle 25% decline)
 * - More vibrant lower tiers - all colors stay visible and energetic
 * - Gentler lightness progression: 0.72 → 0.64
 * - Bottom tier (purply-blue at 270°) is same hue but WAY less muted
 * - Clean, professional, balanced - no tier fades into invisibility
 * - Dark mode: Brightens all tiers, maintains energy throughout
 */

// ============ Color Tiers ============

export type ColorTier = "elite" | "excellent" | "great" | "good" | "solid";

export interface ColorScheme {
    tier: ColorTier;
    label: string;
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
 * Unified color palette derived from pitch gradients
 * Creates a smooth monochromatic progression from blue to green
 * Uses CSS custom properties for theme-aware colors
 */
const COLOR_SCHEMES: Record<ColorTier, ColorScheme> = {
    elite: {
        tier: "elite",
        label: "Elite",
        solid: "bg-[var(--quality-elite)]",
        solidBg: "bg-[var(--quality-elite)]",
        text: "text-[var(--quality-elite)]",
        gradient: "bg-gradient-to-r from-[var(--quality-elite)] to-[var(--quality-elite)]",
        subtle: "bg-[var(--quality-elite-soft)]",
    },
    excellent: {
        tier: "excellent",
        label: "Excellent",
        solid: "bg-[var(--quality-excellent)]",
        solidBg: "bg-[var(--quality-excellent)]",
        text: "text-[var(--quality-excellent)]",
        gradient: "bg-gradient-to-r from-[var(--quality-excellent)] to-[var(--quality-excellent)]",
        subtle: "bg-[var(--quality-excellent-soft)]",
    },
    great: {
        tier: "great",
        label: "Great",
        solid: "bg-[var(--quality-great)]",
        solidBg: "bg-[var(--quality-great)]",
        text: "text-[var(--quality-great)]",
        gradient: "bg-gradient-to-r from-[var(--quality-great)] to-[var(--quality-great)]",
        subtle: "bg-[var(--quality-great-soft)]",
    },
    good: {
        tier: "good",
        label: "Good",
        solid: "bg-[var(--quality-good)]",
        solidBg: "bg-[var(--quality-good)]",
        text: "text-[var(--quality-good)]",
        gradient: "bg-gradient-to-r from-[var(--quality-good)] to-[var(--quality-good)]",
        subtle: "bg-[var(--quality-good-soft)]",
    },
    solid: {
        tier: "solid",
        label: "Solid",
        solid: "bg-[var(--quality-solid)]",
        solidBg: "bg-[var(--quality-solid)]",
        text: "text-[var(--quality-solid)]",
        gradient: "bg-gradient-to-r from-[var(--quality-solid)] to-[var(--quality-solid)]",
        subtle: "bg-[var(--quality-solid-soft)]",
    },
};

// ============ Card Underlines (Rating-based) ============
/**
 * Determine color tier from overall rating
 */
export function getRatingTier(rating: number): ColorTier {
    if (rating >= 90) return "elite";
    if (rating >= 80) return "excellent";
    if (rating >= 70) return "great";
    if (rating >= 60) return "good";
    return "solid";
}

/**
 * Determine color tier from overall rating
 */
export function getRatingTierScheme(rating: number): ColorScheme {
    const tier = getRatingTier(rating);
    return COLOR_SCHEMES[tier];
}

/**
 * Get color for card underlines based on overall rating
 * Thresholds: 90, 80, 70, 60, <60
 */
export function getCardUnderlineColor(rating: number): string {
    return getRatingTierScheme(rating).subtle;
}

// ============ Archetype Bars (Relative to Best) ============

/**
 * Get gradient color for archetype bars based on difference from global best
 * Thresholds: ≤3, ≤7, ≤12, ≤20, >20
 */
export function getArchetypeBarColor(score: number): string {
    const tier = getRelativeTier(score);
    return COLOR_SCHEMES[tier].gradient;
}

/**
 * Get text color for archetype scores
 */
export function getArchetypeTextColor(score: number): string {
    const tier = getRelativeTier(score);
    return COLOR_SCHEMES[tier].text;
}

/**
 * Determine color tier from score relative to global best
 */
function getRelativeTier(score: number): ColorTier {
    if (score >= 97) return "elite";
    if (score >= 93) return "excellent";
    if (score >= 88) return "great";
    if (score >= 60) return "good";
    return "solid";
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
function getStatTier(score: number): ColorTier {
    if (score >= 90) return "elite";
    if (score >= 80) return "excellent";
    if (score >= 70) return "great";
    if (score >= 60) return "good";
    return "solid";
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
