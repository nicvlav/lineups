/**
 * Auto-Balance Metrics — Zone Affinity Profiles
 *
 * Gradient specialist profiles using softmax normalization and entropy-based
 * specialist strength measurement. Replaces binary specialist classification
 * with continuous affinity vectors.
 *
 * @module auto-balance/metrics-zone-affinity
 */

import { calculateBasicDifferenceRatio } from "./metrics-helpers";
import type { ZoneAffinityProfile } from "./types";

/**
 * Continuous zone affinity profile for a player (star-tuned)
 *
 * Key change vs your original:
 * - Softmax "sharpness" is driven by RELATIVE SPREAD (how decisive the best zone is),
 *   not by absolute quality/mean. This prevents elite all-rounders from being mis-labeled
 *   as extreme specialists due to tiny margins.
 *
 * Also:
 * - Dominant zone is guarded by a minimum spread (so tiny spreads don't force dominance).
 */
export function calculateZoneAffinity(
    defScore: number,
    midScore: number,
    attScore: number,
    opts?: {
        // Softmax base multiplier
        baseSharpness?: number;

        // Spread -> sharpness mapping (logistic)
        spreadPivot?: number; // relative spread at which sharpness ramps up (e.g. 0.05 = 5%)
        spreadSteepness?: number; // logistic steepness
        sharpnessMin?: number; // minimum spreadFactor
        sharpnessMax?: number; // maximum spreadFactor

        // Dominance rules
        dominanceThreshold?: number; // top affinity threshold
        dominanceMargin?: number; // top - second threshold
        spreadMinForDominance?: number; // absolute spread points required to declare dominance
        hardMarginOverride?: number; // if top-second >= this, dominance allowed even if spread small

        // Flexibility knobs (star-aware)
        scoreRangeMax?: number; // e.g. 100
        starFlexFactor?: number; // how strongly specialistStrength reduces flexibility
        meanFlexPenalty?: number; // additional reduction proportional to mean quality
        flexCurveExponent?: number; // <1 softens penalty, >1 harshens
        clampFlexTo?: { min?: number; max?: number };

        sanitizeInputs?: boolean;
    }
): ZoneAffinityProfile {
    const {
        // --- new defaults (recommended starting point)
        baseSharpness = 1.0,

        spreadPivot = 0.05, // 5% relative spread is "noticeable"
        spreadSteepness = 25, // how quickly sharpness ramps as spread grows
        sharpnessMin = 0.6, // keeps balanced stars soft
        sharpnessMax = 2.8, // allows decisive specialists

        dominanceThreshold = 0.45,
        dominanceMargin = 0.12,
        spreadMinForDominance = 3.0, // don't label dominance for tiny spreads
        hardMarginOverride = 0.25, // unless top-second is HUGE

        scoreRangeMax = 100,

        // Flexibility defaults (star-relative)
        starFlexFactor = 0.65,
        meanFlexPenalty = 0.12,
        flexCurveExponent = 0.7,
        clampFlexTo = { min: 0.05, max: 0.99 },

        sanitizeInputs = true,
    } = opts || {};

    if (sanitizeInputs) {
        defScore = Number.isFinite(defScore) ? defScore : 0;
        midScore = Number.isFinite(midScore) ? midScore : 0;
        attScore = Number.isFinite(attScore) ? attScore : 0;
    }

    const maxScore = Math.max(defScore, midScore, attScore);
    const minScore = Math.min(defScore, midScore, attScore);

    // Edge case: all zero
    if (maxScore === 0 && minScore === 0) {
        return {
            rawScores: { def: 0, mid: 0, att: 0 },
            affinity: { def: 1 / 3, mid: 1 / 3, att: 1 / 3 },
            specialistStrength: 0,
            flexibility: 1.0,
            dominantZone: "balanced",
        };
    }

    // Mean + centered deltas (preserves small but meaningful differences at high quality)
    const mean = (defScore + midScore + attScore) / 3;
    const dDef = defScore - mean;
    const dMid = midScore - mean;
    const dAtt = attScore - mean;

    // --- Spread-driven sharpness (fixes "elite all-rounder becomes extreme specialist")
    const spread = maxScore - minScore; // absolute points spread
    const relSpread = spread / (mean + 1e-9); // scale-free

    // Logistic mapping to [sharpnessMin, sharpnessMax]
    const sigmoid = 1 / (1 + Math.exp(-spreadSteepness * (relSpread - spreadPivot)));
    const spreadFactor = sharpnessMin + (sharpnessMax - sharpnessMin) * sigmoid;

    const sharpness = Math.max(0.01, baseSharpness * spreadFactor);

    // Softmax over scaled deltas (stable form: subtract max)
    const sDef = dDef * sharpness;
    const sMid = dMid * sharpness;
    const sAtt = dAtt * sharpness;

    const maxScaled = Math.max(sDef, sMid, sAtt);
    const eDef = Math.exp(sDef - maxScaled);
    const eMid = Math.exp(sMid - maxScaled);
    const eAtt = Math.exp(sAtt - maxScaled);
    const sumExp = eDef + eMid + eAtt + 1e-12;

    const affinity = {
        def: eDef / sumExp,
        mid: eMid / sumExp,
        att: eAtt / sumExp,
    };

    // Specialist strength from entropy (1 = concentrated, 0 = uniform)
    const eps = 1e-12;
    const maxEntropy = Math.log(3);
    const actualEntropy = -(
        affinity.def * Math.log(affinity.def + eps) +
        affinity.mid * Math.log(affinity.mid + eps) +
        affinity.att * Math.log(affinity.att + eps)
    );
    const specialistStrength = 1.0 - actualEntropy / maxEntropy;

    // Flexibility (star-relative): base flexibility from spread (std), then penalize by specialist + mean
    const variance = ((defScore - mean) ** 2 + (midScore - mean) ** 2 + (attScore - mean) ** 2) / 3;
    const std = Math.sqrt(variance);

    const maxStdApprox = (scoreRangeMax || 100) * 0.47;
    const baseFlex = 1 - Math.min(1, std / (maxStdApprox + 1e-9)); // [0,1]

    const quality01 = Math.max(0, Math.min(1, mean / (scoreRangeMax || 1)));
    const penalty = Math.max(0, Math.min(0.95, specialistStrength * starFlexFactor + quality01 * meanFlexPenalty));

    const flexScale = (1 - penalty) ** flexCurveExponent;
    let flexibility = baseFlex * flexScale;

    const minClamp = clampFlexTo.min ?? 0.05;
    const maxClamp = clampFlexTo.max ?? 0.99;
    flexibility = Math.max(minClamp, Math.min(maxClamp, flexibility));

    // Dominant zone selection with spread guard
    const items = [
        { key: "def" as const, val: affinity.def },
        { key: "mid" as const, val: affinity.mid },
        { key: "att" as const, val: affinity.att },
    ].sort((a, b) => b.val - a.val);

    const top = items[0];
    const second = items[1];

    let dominantZone: "def" | "mid" | "att" | "balanced" = "balanced";
    const passesAffinityRule = top.val >= dominanceThreshold || top.val - second.val >= dominanceMargin;

    if (passesAffinityRule) {
        const passesSpreadGuard = spread >= spreadMinForDominance || top.val - second.val >= hardMarginOverride;
        dominantZone = passesSpreadGuard ? top.key : "balanced";
    }

    return {
        rawScores: { def: defScore, mid: midScore, att: attScore },
        affinity,
        specialistStrength,
        flexibility,
        dominantZone,
    };
}

/**
 * Calculate peak talent balance - prevents concentration of top players in each zone on one team
 *
 * This catches the case where "best defender + best attacker end up on same team".
 * We compare the affinity-weighted "peaks" in each zone rather than just totals.
 *
 * Method:
 * 1. For each zone (def/mid/att), find the highest affinity on each team
 * 2. Compare these peak affinities between teams
 * 3. If one team has the peak talent in multiple zones, penalize
 *
 * @param teamAProfiles Zone affinity profiles for team A's stars
 * @param teamBProfiles Zone affinity profiles for team B's stars
 * @returns Balance score from 0 (terrible) to 1 (perfect)
 */
export function calculatePeakTalentBalance(
    teamAProfiles: ZoneAffinityProfile[],
    teamBProfiles: ZoneAffinityProfile[]
): number {
    if (teamAProfiles.length === 0 || teamBProfiles.length === 0) return 1.0;

    // ODD SPLITS: Peak talent comparison less meaningful (quality already handles this)
    // Return high baseline to neutralize this metric, fading with team size
    const smallerCount = Math.min(teamAProfiles.length, teamBProfiles.length);
    const isOdd = (teamAProfiles.length + teamBProfiles.length) % 2 === 1;

    if (isOdd) {
        // 1v2: 0.85, 2v3: 0.75, 3v4: 0.70, 4v5: 0.65, etc.
        const baselineScore = Math.max(0.6, 0.95 - smallerCount * 0.1);
        return baselineScore;
    }

    // Find peak affinity in each zone for each team
    const teamAPeaks = {
        def: Math.max(...teamAProfiles.map((p) => p.affinity.def)),
        mid: Math.max(...teamAProfiles.map((p) => p.affinity.mid)),
        att: Math.max(...teamAProfiles.map((p) => p.affinity.att)),
    };

    const teamBPeaks = {
        def: Math.max(...teamBProfiles.map((p) => p.affinity.def)),
        mid: Math.max(...teamBProfiles.map((p) => p.affinity.mid)),
        att: Math.max(...teamBProfiles.map((p) => p.affinity.att)),
    };

    // Calculate balance for each zone's peak
    const defPeakBalance = calculateBasicDifferenceRatio(teamAPeaks.def, teamBPeaks.def);
    const midPeakBalance = calculateBasicDifferenceRatio(teamAPeaks.mid, teamBPeaks.mid);
    const attPeakBalance = calculateBasicDifferenceRatio(teamAPeaks.att, teamBPeaks.att);

    // Geometric mean - all zones must have balanced peaks
    return (defPeakBalance * midPeakBalance * attPeakBalance) ** (1 / 3);
}

/**
 * Calculate count-based split penalty with derived values instead of magic numbers
 *
 * Penalty magnitude is derived from the actual pool size and achievable range,
 * not hardcoded constants like 0.35 or 0.25.
 *
 * @param countA Count on team A
 * @param countB Count on team B
 * @param shapingPower Exponential shaping (higher = harsher penalties)
 * @returns Penalty score from 0 (terrible) to 1 (perfect)
 */
export function calculateCountSplitPenalty(countA: number, countB: number, shapingPower: number): number {
    const total = countA + countB;
    if (total === 0) return 1.0; // No items = no penalty

    const isOdd = total % 2 === 1;
    const tolerance = isOdd ? 1 : 0; // Odd totals allow 1 diff
    const actualDiff = Math.abs(countA - countB);

    // Within tolerance = perfect
    if (actualDiff <= tolerance) return 1.0;

    // Deviation beyond tolerance, normalized by maximum possible deviation
    const excessDeviation = actualDiff - tolerance;
    const maxDeviation = Math.floor(total / 2); // Worst case: all on one team

    if (maxDeviation === 0) return 1.0; // Edge case

    const normalized = excessDeviation / maxDeviation;

    // Apply shaping power: higher power = harsher penalties for deviations
    return 1.0 - normalized ** shapingPower;
}

/**
 * Calculate affinity-weighted zone balance between two teams
 *
 * Instead of counting "3 defenders vs 2 defenders" (binary), we sum affinity:
 * - Team A: 0.7 + 0.8 + 0.3 = 1.8 defensive affinity
 * - Team B: 0.6 + 0.5 + 0.4 = 1.5 defensive affinity
 * - Imbalance ratio calculated from these continuous sums
 *
 * @param teamAProfiles Zone affinity profiles for team A's stars
 * @param teamBProfiles Zone affinity profiles for team B's stars
 * @returns Balance score from 0 (terrible) to 1 (perfect)
 */
export function calculateAffinityBalanceScore(
    teamAProfiles: ZoneAffinityProfile[],
    teamBProfiles: ZoneAffinityProfile[]
): number {
    // Handle edge cases
    if (teamAProfiles.length === 0 && teamBProfiles.length === 0) return 1.0;
    if (teamAProfiles.length === 0 || teamBProfiles.length === 0) return 0.5;

    // ODD SPLITS: Affinity comparison less meaningful when team sizes differ
    // The number disadvantage is the primary issue, quality must compensate
    const smallerCount = Math.min(teamAProfiles.length, teamBProfiles.length);
    const isOdd = (teamAProfiles.length + teamBProfiles.length) % 2 === 1;

    if (isOdd) {
        // Return near-neutral baseline that fades as teams get larger
        // 1v2: 0.85, 2v3: 0.75, 3v4: 0.70, 4v5: 0.65, etc.
        const baselineScore = Math.max(0.6, 0.95 - smallerCount * 0.1);
        return baselineScore;
    }

    // Sum affinities per zone for each team
    const teamASums = { def: 0, mid: 0, att: 0 };
    const teamBSums = { def: 0, mid: 0, att: 0 };

    for (const profile of teamAProfiles) {
        teamASums.def += profile.affinity.def;
        teamASums.mid += profile.affinity.mid;
        teamASums.att += profile.affinity.att;
    }

    for (const profile of teamBProfiles) {
        teamBSums.def += profile.affinity.def;
        teamBSums.mid += profile.affinity.mid;
        teamBSums.att += profile.affinity.att;
    }

    // Calculate balance ratio for each zone
    const defBalance = calculateBasicDifferenceRatio(teamASums.def, teamBSums.def);
    const midBalance = calculateBasicDifferenceRatio(teamASums.mid, teamBSums.mid);
    const attBalance = calculateBasicDifferenceRatio(teamASums.att, teamBSums.att);

    // Geometric mean ensures all zones must be balanced (one bad zone tanks score)
    return (defBalance * midBalance * attBalance) ** (1 / 3);
}

/**
 * Calculate flexibility balance between two teams
 *
 * Teams with higher average flexibility can adapt better during the game.
 * We want both teams to have similar flexibility levels.
 *
 * @param teamAProfiles Zone affinity profiles for team A's stars
 * @param teamBProfiles Zone affinity profiles for team B's stars
 * @returns Balance score from 0 (terrible) to 1 (perfect)
 */
export function calculateFlexibilityBalance(
    teamAProfiles: ZoneAffinityProfile[],
    teamBProfiles: ZoneAffinityProfile[]
): number {
    if (teamAProfiles.length === 0 || teamBProfiles.length === 0) return 1.0;

    const countA = teamAProfiles.length;
    const countB = teamBProfiles.length;
    const isOdd = (countA + countB) % 2 === 1;

    if (isOdd) {
        const smallerCount = Math.min(countA, countB);

        // ALL ODD SPLITS: Flexibility less important than quality
        // Use fading neutralization: 1v2: 0.85, 2v3: 0.75, 3v4: 0.70, etc.
        const avgFlexA = teamAProfiles.reduce((sum, p) => sum + p.flexibility, 0) / countA;
        const avgFlexB = teamBProfiles.reduce((sum, p) => sum + p.flexibility, 0) / countB;
        const smallerIsA = countA < countB;
        const smallerFlex = smallerIsA ? avgFlexA : avgFlexB;

        // Calculate baseline that fades with team size
        const baseline = Math.max(0.6, 0.95 - smallerCount * 0.1);

        // Add small bonus/penalty based on actual flexibility (max ±0.10)
        const flexScore = baseline + (smallerFlex - 0.5) * 0.2;
        return Math.max(0.5, Math.min(1.0, flexScore));
    } else {
        // EVEN SPLIT: Standard flexibility balance
        const avgFlexA = teamAProfiles.reduce((sum, p) => sum + p.flexibility, 0) / countA;
        const avgFlexB = teamBProfiles.reduce((sum, p) => sum + p.flexibility, 0) / countB;
        return calculateBasicDifferenceRatio(avgFlexA, avgFlexB);
    }
}
