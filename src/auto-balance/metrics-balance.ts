/**
 * Auto-Balance Metrics — Balance Metrics
 *
 * Eight post-assignment balance metrics that evaluate team fairness after
 * player assignment. Entry point: calculateMetrics().
 *
 * @module auto-balance/metrics-balance
 */

import { logger } from "@/lib/logger";
import { getInternalZoneSkillPower, getMidfieldPenaltyPower, POSITION_INDICES } from "./constants";
import { calibratedScore, Steepness } from "./metric-transformations";
import type { BalanceConfiguration } from "./metrics-config";
import { DEFAULT_BALANCE_CONFIG } from "./metrics-config";
import {
    calculateBasicDifferenceRatio,
    calculateMidfieldPreferencePenalty,
    calculatePlayerScoreStdDev,
    calculateSingleTeamZonalBalance,
    calculateZoneAverageRatings,
    formatComparison,
    formatZoneAverageRatings,
    formatZonePeakScores,
    formatZoneScores,
} from "./metrics-helpers";
import type { BalanceMetrics, FastTeam } from "./types";

// ─── Positional Score Balance ──────────────────────────────────────────────────

/**
 * Component weights for positional score balance — sum to 1.0
 *
 * Efficiency measures global quality (placed vs peak), variance catches uneven
 * treatment across players, weighted gap applies progressive penalties for the
 * worst placements, and worst outlier prevents catastrophic single-player misfit.
 */
const POSITIONAL_BALANCE_WEIGHTS = {
    efficiency: 0.35,
    variance: 0.3,
    weightedGap: 0.2,
    worstOutlier: 0.15,
} as const;

/**
 * Normalizers define "maximum bad" for each gap penalty component.
 * Values are derived from the stat scale (scores range ~60-95).
 */
const GAP_PENALTY = {
    /** StdDev above 4 points ≈ 1 star rating spread across gaps */
    varianceDivisor: 4.0,
    varianceExponent: 2.2,
    /** 30 weighted-gap-points is the practical ceiling */
    weightedGapDivisor: 30.0,
    /** Average gap above 6 points ≈ half a star rating misplacement */
    meanGapDivisor: 6.0,
    meanGapExponent: 2.0,
    /** Single gap above 12 points ≈ full star rating out of position */
    worstGapDivisor: 12.0,
    worstGapExponent: 2.5,
} as const;

// ─── Energy Balance ────────────────────────────────────────────────────────────

/**
 * Floor prevents perfect balance in one dimension from zeroing out the score.
 * 10% weight ensures even worst-case imbalances remain differentiable.
 */
const ENERGY_CANCELLATION_FLOOR = 0.1;

/**
 * Blend weight range for raw-quality vs cancellation-adjusted scoring.
 * Good raw quality (>0.9) leans on raw; poor (<0.5) leans on cancellation.
 */
const ENERGY_BLEND = { min: 0.2, max: 0.8 } as const;

// ─── Striker Balance ───────────────────────────────────────────────────────────

/** Points awarded per striker viability tier (based on ST score) */
const STRIKER_TIER_POINTS = {
    /** score >= 90: elite striker, dominant impact */
    high: 20,
    /** score >= 75: competent, can fill the role */
    medium: 12,
    /** score >= 65: emergency option, minimal contribution */
    low: 3,
} as const;

/** Component weights for the three-factor striker balance — sum to 1.0 */
const STRIKER_BALANCE_WEIGHTS = {
    specialist: 0.3,
    viable: 0.4,
    quality: 0.3,
} as const;

/**
 * Calculates penalty when one team dominates multiple zones
 *
 * Uses configured epsilon threshold to ignore very small differences (neutral zones).
 * Penalizes when zones cluster directionally (e.g., team A wins DEF+ATT, team B only wins MID).
 *
 * All thresholds come from DEFAULT_BALANCE_CONFIG.formulas.zoneDirectionality
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Penalty multiplier from 0 (harsh penalty) to 1 (no penalty)
 */
function calculateZoneDirectionalPenalty(
    teamA: FastTeam,
    teamB: FastTeam
): { penalty: number; teamAWins: number; teamBWins: number; neutrals: number; winners: string[] } {
    const epsilon = DEFAULT_BALANCE_CONFIG.formulas.zoneDirectionality.neutralEpsilon;
    const zoneNames = ["DEF", "MID", "ATT"];
    const zoneIndices = [1, 2, 3]; // Exclude GK (index 0)

    let teamAWins = 0;
    let teamBWins = 0;
    let neutrals = 0;
    let sum = 0.0;
    const winners: string[] = [];

    for (let i = 0; i < zoneIndices.length; i++) {
        const zoneIdx = zoneIndices[i];
        const zoneName = zoneNames[i];
        const scoreA = teamA.zonePeakScores[zoneIdx];
        const scoreB = teamB.zonePeakScores[zoneIdx];

        const ratio = calculateBasicDifferenceRatio(scoreA, scoreB);

        if (ratio >= epsilon) {
            // Zone is balanced, count as neutral
            neutrals++;
            winners.push(`${zoneName}:N`);
        } else if (scoreA > scoreB) {
            teamAWins++;
            winners.push(`${zoneName}:A`);
        } else {
            teamBWins++;
            winners.push(`${zoneName}:B`);
        }

        sum += ratio;
    }

    sum /= zoneIndices.length;

    // Calculate penalty based on directional clustering
    const maxWins = Math.max(teamAWins, teamBWins);

    const dominationPenalty = DEFAULT_BALANCE_CONFIG.formulas.zoneDirectionality.dominationPenalty;
    const twoZonePenalty = DEFAULT_BALANCE_CONFIG.formulas.zoneDirectionality.twoZonePenalty;

    let penalty = 1.0;
    if (maxWins === 3) {
        // 3-0 split: one team dominates all zones (harsh)
        penalty = dominationPenalty;
    } else if ((maxWins === 2 && neutrals === 0) || (maxWins === 1 && neutrals === 2)) {
        // 2-1 split: moderate directional imbalance
        penalty = sum ** Steepness.Gentle;
    } else if (maxWins === 2 && neutrals === 1) {
        // 2-0-1 split: two zones favor one team, one neutral
        penalty = twoZonePenalty;
    } else if (maxWins > 0) {
        // 1-1-1 split: cancel out two zones
        penalty = sum ** Steepness.VeryGentle;
    }
    // else: balanced distributions ( 0-0-3, etc.) get no penalty (1.0)

    return { penalty, teamAWins, teamBWins, neutrals, winners };
}

/**
 * Calculates energy balance between teams with intelligent workrate handling
 *
 * This handles three components:
 * 1. Stamina - balanced independently
 * 2. Attacking/Defensive workrate compensation - allows cancellation but penalizes large raw differences
 * 3. Combined energy metric
 *
 * Key insight: If team A has high att WR + low def WR and team B is the inverse,
 * that's perfect cancellation BUT also means 500 point raw differences - that's terrible!
 *
 * Uses calibrated scoring system with configured thresholds
 */
function calculateEnergyBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    // 1. Stamina balance (independent metric)
    const staminaRatio = calculateBasicDifferenceRatio(teamA.staminaScore, teamB.staminaScore);

    // 2. Workrate analysis - need to handle att/def compensation intelligently
    const aAttWR = teamA.attWorkrateScore;
    const aDefWR = teamA.defWorkrateScore;
    const bAttWR = teamB.attWorkrateScore;
    const bDefWR = teamB.defWorkrateScore;

    // Calculate team totals
    const aTotalWR = aAttWR + aDefWR;
    const bTotalWR = bAttWR + bDefWR;

    // Raw balance of total workrate
    const attWRRatio = calculateBasicDifferenceRatio(aAttWR, bAttWR);
    const defWRRatio = calculateBasicDifferenceRatio(aDefWR, bDefWR);
    const totalWRRatio = calculateBasicDifferenceRatio(aTotalWR, bTotalWR);

    // Check for cancellation: do the differences point in opposite directions?
    const aAttAdvantage = Math.min(1, Math.max(-1, aAttWR - bAttWR)); // positive if A has more att WR
    const aDefAdvantage = Math.min(1, Math.max(-1, aDefWR - bDefWR)); // positive if A has more def WR
    const aWrAdvantage = Math.min(1, Math.max(-1, aTotalWR - bTotalWR)); // positive if A has more def WR
    const aStaminaAdvantage = Math.min(1, Math.max(-1, teamA.staminaScore - teamB.staminaScore)); // positive if A has more def WR
    let cancellationFactor = 1.0 - Math.abs(aWrAdvantage + aStaminaAdvantage) / 4.0; // 1 if opposite signs (cancellation)

    if (aAttAdvantage !== 0 && aDefAdvantage !== 0) {
        cancellationFactor *= 1.0 - Math.abs(aAttAdvantage + aDefAdvantage) / 4.0;
    }

    cancellationFactor = Math.max(ENERGY_CANCELLATION_FLOOR, cancellationFactor);

    // SMART BLENDING: Combine raw quality with cancellation bonus
    //
    // Strategy: When overall balance is bad, give cancellation more weight as a tiebreaker
    // When overall balance is good, rely more on raw quality
    //
    // Two components:
    // 1. Raw quality score: How good are the individual metrics? (ignores cancellation)
    // 2. Cancellation-adjusted score: Rewards compensation between att/def
    //
    // Blend based on how bad the raw quality is:
    // - Good raw quality (>0.9): Mostly use raw (cancellation is just a small bonus)
    // - Poor raw quality (<0.7): Give cancellation more weight as a tiebreaker

    const rawQuality = attWRRatio * defWRRatio; // Pure quality, no cancellation bonus
    const cancellationAdjusted = cancellationFactor * rawQuality; // Quality with cancellation multiplier

    // Adaptive blend weight: worse raw quality = more weight on cancellation
    // If rawQuality is 0.95: blendWeight = 0.2 (mostly raw)
    // If rawQuality is 0.70: blendWeight = 0.5 (50/50 blend)
    // If rawQuality is 0.50: blendWeight = 0.7 (mostly cancellation)
    const blendWeight = Math.min(ENERGY_BLEND.max, Math.max(ENERGY_BLEND.min, 1.0 - rawQuality));

    // Blend: bad scenarios lean on cancellation, good scenarios lean on raw quality
    const workrateRatio = rawQuality * (1 - blendWeight) + cancellationAdjusted * blendWeight;

    // 3. Combine stamina and workrate
    const rawCombined = staminaRatio * workrateRatio;

    // Use calibrated scoring
    const energyBalanceRatio = calibratedScore(rawCombined, DEFAULT_BALANCE_CONFIG.thresholds.energy, Steepness.Gentle);

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.energy;
        logger.debug("Energy Balance:");
        logger.debug(formatComparison("Stamina", teamA.staminaScore, teamB.staminaScore, staminaRatio));
        logger.debug(formatComparison("Att Workrate", aAttWR, bAttWR, calculateBasicDifferenceRatio(aAttWR, bAttWR)));
        logger.debug(formatComparison("Def Workrate", aDefWR, bDefWR, calculateBasicDifferenceRatio(aDefWR, bDefWR)));
        logger.debug(formatComparison("Total Workrate", aTotalWR, bTotalWR, totalWRRatio));
        logger.debug(
            `  Cancellation Factor: ${cancellationFactor.toFixed(3)} (att: ${aAttAdvantage.toFixed(1)}, def: ${aDefAdvantage.toFixed(1)})`
        );
        logger.debug(`  Raw Quality (no cancel): ${rawQuality.toFixed(3)}`);
        logger.debug(`  Cancellation-Adjusted: ${cancellationAdjusted.toFixed(3)}`);
        logger.debug(`  Blend Weight: ${blendWeight.toFixed(3)} (higher = more cancellation influence)`);
        logger.debug(`  Final Workrate Ratio: ${workrateRatio.toFixed(3)}`);
        logger.debug(`  Raw Combined: ${rawCombined.toFixed(3)}`);
        logger.debug(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        logger.debug(`  Calibrated Score: ${energyBalanceRatio.toFixed(3)}`);
    }

    return energyBalanceRatio;
}

/**
 * Calculates overall team strength balance by comparing peak potential
 *
 * Peak potential represents the theoretical maximum strength each team could achieve.
 * Uses calibrated scoring with configured thresholds instead of arbitrary Math.pow(ratio, 16).
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculateOverallStrengthBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const rawRatio = calculateBasicDifferenceRatio(teamA.peakPotential, teamB.peakPotential);

    // Use calibrated scoring instead of arbitrary Math.pow(rawRatio, 16)
    const strengthBalanceRatio = calibratedScore(
        rawRatio,
        DEFAULT_BALANCE_CONFIG.thresholds.peakPotential,
        Steepness.VerySteep
    );

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.peakPotential;
        logger.debug("Overall Strength Balance (Peak Potential):");
        logger.debug(formatComparison("Peak", teamA.peakPotential, teamB.peakPotential, rawRatio));
        logger.debug(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        logger.debug(`  Calibrated Score: ${strengthBalanceRatio.toFixed(3)}`);
    }

    return strengthBalanceRatio;
}

/**
 * Single-pass team analysis: peak vs placed scores, gap statistics
 *
 * Skips goalkeepers (position 0) because GK scores are universally low
 * and would distort the gap distribution.
 */
function analyzeTeamGaps(team: FastTeam) {
    let peakTotal = 0;
    let placedTotal = 0;
    const gaps: number[] = [];
    let worstGap = 0;
    let worstPlayerName = "";

    for (let posIdx = 0; posIdx < team.positions.length; posIdx++) {
        const positionGroup = team.positions[posIdx];
        for (const player of positionGroup) {
            // Use the position index from the team structure, not player.assignedPosition
            // which may have been mutated by subsequent Monte Carlo iterations
            const assignedScore = player.scores[posIdx];
            const bestScore = player.bestScore;
            const gap = bestScore - assignedScore;

            if (posIdx !== 0) {
                peakTotal += bestScore;
                placedTotal += assignedScore;
                gaps.push(gap);

                if (gap > worstGap) {
                    worstGap = gap;
                    worstPlayerName = player.original.name;
                }
            }
        }
    }

    const meanGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
    const variance = gaps.reduce((sum, g) => sum + (g - meanGap) ** 2, 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    const mad = gaps.reduce((sum, g) => sum + Math.abs(g - meanGap), 0) / gaps.length;

    return { peakTotal, placedTotal, gaps, meanGap, stdDev, mad, worstGap, worstPlayerName };
}

/**
 * Calculates positional score balance by comparing actual team scores
 *
 * This measures how balanced the teams are based on players' actual scores
 * in their assigned positions (not theoretical peak).
 *
 * Uses calibrated scoring and configured formula weights instead of magic numbers.
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculatePositionalScoreBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const teamAStats = analyzeTeamGaps(teamA);
    const teamBStats = analyzeTeamGaps(teamB);

    // Calculate efficiency scores
    const aRatio = calculateBasicDifferenceRatio(teamAStats.placedTotal, teamAStats.peakTotal);
    const bRatio = calculateBasicDifferenceRatio(teamBStats.placedTotal, teamBStats.peakTotal);
    const diff = calculateBasicDifferenceRatio(aRatio, bRatio);
    const efficiency = calculateBasicDifferenceRatio(
        teamAStats.placedTotal + teamBStats.placedTotal,
        teamAStats.peakTotal + teamBStats.peakTotal
    );

    const efficiencyScore = calibratedScore(
        efficiency,
        DEFAULT_BALANCE_CONFIG.thresholds.scoreBalance,
        Steepness.Gentle
    );

    // Variance penalty: punish high spread in positional gaps
    // Combined variance across both teams
    const combinedGaps = [...teamAStats.gaps, ...teamBStats.gaps];
    const combinedMean = combinedGaps.reduce((sum, g) => sum + g, 0) / combinedGaps.length;
    const combinedVariance = combinedGaps.reduce((sum, g) => sum + (g - combinedMean) ** 2, 0) / combinedGaps.length;
    const combinedStdDev = Math.sqrt(combinedVariance);

    // Progressive gap penalty: penalize gaps more as they get larger in groups of 3
    // Gap 0-2: baseline penalty (1x)
    // Gap 3-5: moderate penalty (1.5x)
    // Gap 6-8: severe penalty (2.5x)
    // Gap 9-11: very severe penalty (4x)
    // Gap 12+: catastrophic penalty (6x)
    const calculateGapPenalty = (gap: number): number => {
        if (gap < 3) return gap * 1.0;
        if (gap < 6) return gap * 1.5;
        if (gap < 9) return gap * 2.5;
        if (gap < 12) return gap * 4.0;
        return gap * 6.0;
    };

    // Apply progressive penalty to each gap
    const weightedGapSum = combinedGaps.reduce((sum, gap) => sum + calculateGapPenalty(gap), 0);
    const avgWeightedGap = weightedGapSum / combinedGaps.length;

    // Variance penalty: high spread in positional gaps = inconsistent treatment
    const variancePenalty = Math.min(
        1.0,
        (combinedStdDev / GAP_PENALTY.varianceDivisor) ** GAP_PENALTY.varianceExponent
    );
    const varianceScore = 1.0 - variancePenalty;

    // Weighted gap penalty (uses the progressive multipliers from calculateGapPenalty)
    const weightedGapPenalty = Math.min(1.0, avgWeightedGap / GAP_PENALTY.weightedGapDivisor);
    const weightedGapScore = 1.0 - weightedGapPenalty;

    // Mean gap penalty: high average gap = everyone is slightly misplaced
    const meanGapPenalty = Math.min(1.0, (combinedMean / GAP_PENALTY.meanGapDivisor) ** GAP_PENALTY.meanGapExponent);
    const meanGapScore = 1.0 - meanGapPenalty;

    // Worst outlier penalty: catastrophic single-player misplacement
    const worstOverallGap = Math.max(teamAStats.worstGap, teamBStats.worstGap);
    const worstGapPenalty = Math.min(
        1.0,
        (worstOverallGap / GAP_PENALTY.worstGapDivisor) ** GAP_PENALTY.worstGapExponent
    );
    const worstGapScore = 1.0 - worstGapPenalty;

    const finalScore =
        efficiencyScore * POSITIONAL_BALANCE_WEIGHTS.efficiency +
        varianceScore * POSITIONAL_BALANCE_WEIGHTS.variance +
        weightedGapScore * POSITIONAL_BALANCE_WEIGHTS.weightedGap +
        worstGapScore * POSITIONAL_BALANCE_WEIGHTS.worstOutlier;

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.scoreBalance;
        logger.debug("Positional Score Balance:");
        logger.debug(
            formatComparison("A     | Peak vs Placed | ", teamAStats.peakTotal, teamAStats.placedTotal, aRatio)
        );
        logger.debug(
            formatComparison("B     | Peak vs Placed | ", teamBStats.peakTotal, teamBStats.placedTotal, bRatio)
        );
        logger.debug(formatComparison("Diff  | Peak vs Placed | ", aRatio, bRatio, diff));
        logger.debug(
            formatComparison(
                "Total | Peak vs Placed | ",
                teamAStats.placedTotal + teamBStats.placedTotal,
                teamAStats.peakTotal + teamBStats.peakTotal,
                efficiency
            )
        );
        logger.debug(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        logger.debug(`  Efficiency Score: ${efficiencyScore.toFixed(3)}`);
        logger.debug(`  Gap Statistics:`);
        logger.debug(
            `    Team A: mean=${teamAStats.meanGap.toFixed(2)}, stdDev=${teamAStats.stdDev.toFixed(2)}, worst=${teamAStats.worstPlayerName} (${teamAStats.worstGap.toFixed(1)})`
        );
        logger.debug(
            `    Team B: mean=${teamBStats.meanGap.toFixed(2)}, stdDev=${teamBStats.stdDev.toFixed(2)}, worst=${teamBStats.worstPlayerName} (${teamBStats.worstGap.toFixed(1)})`
        );
        logger.debug(
            `    Combined: mean=${combinedMean.toFixed(2)}, stdDev=${combinedStdDev.toFixed(2)}, worst=${worstOverallGap.toFixed(1)}`
        );
        logger.debug(`  Component Scores:`);
        logger.debug(
            `    Variance Score: ${varianceScore.toFixed(3)} (stdDev=${combinedStdDev.toFixed(2)}, penalty=${variancePenalty.toFixed(3)})`
        );
        logger.debug(
            `    Weighted Gap Score: ${weightedGapScore.toFixed(3)} (avgWeighted=${avgWeightedGap.toFixed(2)}, penalty=${weightedGapPenalty.toFixed(3)})`
        );
        logger.debug(
            `    Mean Gap Score: ${meanGapScore.toFixed(3)} (mean=${combinedMean.toFixed(2)}, penalty=${meanGapPenalty.toFixed(3)}) [not used]`
        );
        logger.debug(
            `    Worst Gap Score: ${worstGapScore.toFixed(3)} (worst=${worstOverallGap.toFixed(1)}, penalty=${worstGapPenalty.toFixed(3)})`
        );
        const w = POSITIONAL_BALANCE_WEIGHTS;
        logger.debug(
            `  Final: ${efficiencyScore.toFixed(3)}×${w.efficiency} + ${varianceScore.toFixed(3)}×${w.variance} + ${weightedGapScore.toFixed(3)}×${w.weightedGap} + ${worstGapScore.toFixed(3)}×${w.worstOutlier} = ${finalScore.toFixed(3)}`
        );
    }

    return finalScore;
}

/**
 * Calculates zonal distribution balance within each team
 *
 * This measures how evenly distributed the strength is across zones
 * (Defense, Midfield, Attack) within each team. A well-balanced team
 * has similar strength across all zones rather than being heavily
 * concentrated in one area.
 *
 * Uses calibrated scoring instead of no-op Math.pow(ratio, 1).
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Average balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculateZonalDistributionBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const N = Math.min(teamA.zoneScores.length);

    let totalImbalance = 1.0;
    const rawZoneRatios: number[] = [];

    // Apply calibrated scoring to EACH zone individually
    for (let zoneIdx = 0; zoneIdx < N; zoneIdx++) {
        const a = teamA.zoneScores[zoneIdx];
        const b = teamB.zoneScores[zoneIdx];
        const rawRatio = calculateBasicDifferenceRatio(a, b);
        rawZoneRatios.push(rawRatio);
        totalImbalance *= rawRatio;
    }

    const teamAZonalBalance = calculateSingleTeamZonalBalance(teamA.zonePeakScores);
    const teamBZonalBalance = calculateSingleTeamZonalBalance(teamA.zonePeakScores);
    const internalSkillRatio = calculateBasicDifferenceRatio(teamAZonalBalance, teamBZonalBalance);

    // Calculate zone directional penalty (detects 2-1 or 3-0 zone clustering)
    const directionality = calculateZoneDirectionalPenalty(teamA, teamB);

    // Combine all factors
    const zonalBalanceRatio = calibratedScore(
        (directionality.penalty * (totalImbalance + internalSkillRatio)) / 2,
        DEFAULT_BALANCE_CONFIG.thresholds.zoneBalance,
        Steepness.VerySteep
    );

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.zoneBalance;
        logger.debug("Zonal Distribution Balance:");
        logger.debug(formatZoneScores(teamA, teamB));
        logger.debug(formatZonePeakScores(teamA, teamB));
        logger.debug(formatZoneAverageRatings(teamA, teamB));
        logger.debug(`  Per-Zone Raw Ratios (DEF, MID, ATT): ${rawZoneRatios.map((r) => r.toFixed(3)).join(", ")}`);
        logger.debug(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        logger.debug(`  Zone Winners: ${directionality.winners.join(", ")}`);
        logger.debug(
            `  Directional Split: A=${directionality.teamAWins}, B=${directionality.teamBWins}, Neutral=${directionality.neutrals}`
        );
        logger.debug(`  Zone Directional Penalty: ${directionality.penalty.toFixed(3)}`);
        logger.debug(`  Team A Internal Balance: ${teamAZonalBalance.toFixed(3)}`);
        logger.debug(`  Team B Internal Balance: ${teamBZonalBalance.toFixed(3)}`);
        logger.debug(`  internalSkillRatio: ${internalSkillRatio.toFixed(3)}`);
        logger.debug(`  totalImbalance: ${totalImbalance.toFixed(3)}`);
        logger.debug(`  Final Zonal Balance: ${zonalBalanceRatio.toFixed(3)}`);
    }

    return zonalBalanceRatio;
}

/**
 * Calculates all-stat balance by summing every individual player stat
 *
 * This is a simple "sanity check" metric that loops through all players
 * on each team and sums up ALL their individual stats (anticipation,
 * composure, speed, strength, stamina, attWorkrate, etc.). Ensures overall
 * raw player value is balanced regardless of positioning or role.
 *
 * Uses calibrated scoring instead of arbitrary Math.pow(ratio, 9).
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculateAllStatBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    // Use pre-calculated allStatsScore from teams (much faster than recalculating!)
    const teamATotal = teamA.allStatsScore;
    const teamBTotal = teamB.allStatsScore;

    const rawRatio = calculateBasicDifferenceRatio(teamATotal, teamBTotal);

    // Use calibrated scoring instead of arbitrary Math.pow(rawRatio, 9)
    const allStatBalanceRatio = calibratedScore(
        rawRatio,
        DEFAULT_BALANCE_CONFIG.thresholds.allStatBalance,
        Steepness.Steep
    );

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.allStatBalance;
        logger.debug("All-Stat Balance (Sum of Every Player Stat):");
        logger.debug(formatComparison("Total All Stats", teamATotal, teamBTotal, rawRatio));
        logger.debug(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        logger.debug(`  Calibrated Score: ${allStatBalanceRatio.toFixed(3)}`);
    }

    return allStatBalanceRatio;
}

/**
 * Calculates creativity balance between teams
 *
 * This measures how evenly distributed the creativity stats are
 * between teams.
 *
 * Uses calibrated scoring instead of arbitrary Math.pow(ratio, 9).
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Average balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculateCreativityBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const rawRatio = calculateBasicDifferenceRatio(teamA.creativityScore, teamB.creativityScore);

    // Use calibrated scoring instead of arbitrary Math.pow(rawRatio, 9)
    const creativityBalanceRatio = calibratedScore(
        rawRatio,
        DEFAULT_BALANCE_CONFIG.thresholds.creativity,
        Steepness.Steep
    );

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.creativity;
        logger.debug("Creativity Balance:");
        logger.debug(formatComparison("Creativity", teamA.creativityScore, teamB.creativityScore, rawRatio));
        logger.debug(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        logger.debug(`  Calibrated Score: ${creativityBalanceRatio.toFixed(3)}`);
    }

    return creativityBalanceRatio;
}
/**
 * Calculates striker balance between teams
 *
 * Two-factor approach:
 * 1. Count viable strikers (players whose ST score is close to their best score)
 * 2. Compare overall striker quality (raw striker stats)
 *
 * This ensures both teams have similar number of players who can play striker
 * and similar quality when they do.
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Average balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculateStrikerBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const ST_INDEX = POSITION_INDICES.ST;
    const EPSILON = 0.00001;

    // Score must be within 3 points of best score to count as viable striker
    const VIABLE_DIFFERENCE = 5.0;
    const HIGH_SCORE_THRESHOLD = 90;
    const MEDIUM_SCORE_THRESHOLD = 75;
    const MIN_THRESHOLD = 65;

    const calculateTeamStrikerMetrics = (team: FastTeam) => {
        let points = 0;
        let specialists = 0;
        let viable = 0;

        for (const positionPlayers of team.positions) {
            for (const player of positionPlayers) {
                const stScore = player.scores[ST_INDEX];
                const bestScore = player.bestScore;

                if (stScore < MIN_THRESHOLD || Math.abs(stScore - bestScore) > VIABLE_DIFFERENCE) continue;

                if (player.isSpecialist && Math.abs(stScore - bestScore) < EPSILON) {
                    specialists++;
                    // points += 3;
                }

                if (stScore >= HIGH_SCORE_THRESHOLD) {
                    points += STRIKER_TIER_POINTS.high;
                    viable++;
                } else if (stScore >= MEDIUM_SCORE_THRESHOLD) {
                    points += STRIKER_TIER_POINTS.medium;
                    viable++;
                } else {
                    points += STRIKER_TIER_POINTS.low;
                    viable++;
                }
            }
        }

        return { points, specialists, viable };
    };

    const teamAMetrics = calculateTeamStrikerMetrics(teamA);
    const teamBMetrics = calculateTeamStrikerMetrics(teamB);

    // 1. Specialist striker balance (most important - need true strikers!)
    let specialistBalance = 0;

    const totalSpecialists = teamAMetrics.specialists + teamBMetrics.specialists;

    if (totalSpecialists === 0) {
        specialistBalance = 1.0;
    } else if (totalSpecialists % 2 === 1) {
        specialistBalance =
            (teamAMetrics.specialists - teamBMetrics.specialists) * (teamAMetrics.viable - teamBMetrics.viable) <= 0
                ? 1.0
                : 0.75 * calculateBasicDifferenceRatio(teamAMetrics.points, teamBMetrics.points);
    } else {
        specialistBalance = calculateBasicDifferenceRatio(teamAMetrics.specialists, teamBMetrics.specialists);
    }

    // 2. Viable striker balance (secondary - can fill in at striker)
    const viableBalance = calculateBasicDifferenceRatio(teamAMetrics.points, teamBMetrics.points);

    // 3. Overall striker quality balance (legacy metric)
    const qualityRatio = calculateBasicDifferenceRatio(teamA.strikerScore, teamB.strikerScore);
    const qualityScore = calibratedScore(qualityRatio, DEFAULT_BALANCE_CONFIG.thresholds.striker, Steepness.Moderate);

    const strikerBalanceRatio =
        specialistBalance * STRIKER_BALANCE_WEIGHTS.specialist +
        viableBalance * STRIKER_BALANCE_WEIGHTS.viable +
        qualityScore * STRIKER_BALANCE_WEIGHTS.quality;

    // if one team has more specialists than the other
    // we want the team with less specialists
    // to compensate with a higher overall score
    // if (teamASpecialists != teamBSpecialists && ((teamASpecialists > teamBSpecialists) == (teamA.strikerScore > teamB.strikerScore))) {
    //     strikerBalanceRatio *= 0.25;
    // }

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.striker;
        logger.debug("Striker Balance (3-Factor System):");
        logger.debug(
            `  Team A: ${teamAMetrics.points} points (${teamAMetrics.specialists} specialists, ${teamAMetrics.viable} viable)`
        );
        logger.debug(
            `  Team B: ${teamBMetrics.points} points (${teamBMetrics.specialists} specialists, ${teamBMetrics.viable} viable)`
        );
        logger.debug("");
        logger.debug(
            formatComparison(
                "  Specialist Strikers",
                teamAMetrics.specialists,
                teamBMetrics.specialists,
                specialistBalance
            )
        );
        logger.debug(`    Specialist Balance: ${specialistBalance.toFixed(3)} (weight: 50%)`);
        logger.debug(formatComparison("  Viable Strikers", teamAMetrics.points, teamBMetrics.points, viableBalance));
        logger.debug(`    Viable Balance: ${viableBalance.toFixed(3)} (weight: 30%)`);
        logger.debug(formatComparison("  Striker Quality", teamA.strikerScore, teamB.strikerScore, qualityRatio));
        logger.debug(`    Quality Balance: ${qualityScore.toFixed(3)} (weight: 20%)`);
        logger.debug("");
        logger.debug(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        logger.debug(`  Final Striker Balance: ${strikerBalanceRatio.toFixed(3)}`);
    }

    return strikerBalanceRatio;
}

/**
 * Calculates talent distribution balance between teams
 *
 * This measures whether both teams have similar talent distribution patterns.
 * A team with "spiky" talent (few superstars + weak players) will have high
 * standard deviation, while a team with "flat" talent (consistent quality)
 * will have low standard deviation.
 *
 * Balancing standard deviations prevents scenarios like:
 * - Team A: 4 elite players + 4 worst players (high std dev)
 * - Team B: 8 solid players (low std dev)
 * Even if peak scores are equal, the distributions feel very different.
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculateTalentDistributionBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const teamAStdDev = calculatePlayerScoreStdDev(teamA);
    const teamBStdDev = calculatePlayerScoreStdDev(teamB);

    const rawRatio = calculateBasicDifferenceRatio(teamAStdDev, teamBStdDev);

    const teamAZoneAverages = calculateZoneAverageRatings(teamA);
    const teamBZoneAverages = calculateZoneAverageRatings(teamB);

    const teamAZonalBalance = calculateSingleTeamZonalBalance(teamAZoneAverages);
    const teamBZonalBalance = calculateSingleTeamZonalBalance(teamBZoneAverages);
    const internalSkillRatio = teamAZonalBalance * teamBZonalBalance;

    // Calculate midfield preference penalty for each team
    // penaltyStrength comes from config instead of magic number (0.5)
    // Power scaling is dynamic based on player count (more players = harsher penalty)
    const midfieldPenaltyStrength = DEFAULT_BALANCE_CONFIG.formulas.midfieldPreference.penaltyStrength;
    const numPlayers = teamA.playerCount + teamB.playerCount;
    const teamAMidfieldPenalty = calculateMidfieldPreferencePenalty(teamAZoneAverages);
    const teamBMidfieldPenalty = calculateMidfieldPreferencePenalty(teamBZoneAverages);

    // Combined midfield penalty (average of both teams)
    const combinedMidfieldPenalty = teamAMidfieldPenalty * teamBMidfieldPenalty;
    const midDiffRatio = calculateBasicDifferenceRatio(teamAZoneAverages[2], teamBZoneAverages[2]);

    const midRatio = midDiffRatio * combinedMidfieldPenalty;

    const skillZonePower = getInternalZoneSkillPower(numPlayers);

    if (debug) {
        logger.debug("Talent Distribution Balance (Player Score Std Dev):");
        logger.debug("  Average Player Ratings Per Zone:");
        logger.debug("         GK      DEF     MID     ATT");
        logger.debug(
            `  A:  ${Array.from(teamAZoneAverages)
                .map((s) => s.toFixed(1).padStart(6))
                .join(" ")}`
        );
        logger.debug(
            `  B:  ${Array.from(teamBZoneAverages)
                .map((s) => s.toFixed(1).padStart(6))
                .join(" ")}`
        );
        logger.debug("");

        // Midfield preference penalty debug output
        const teamAMaxNonGK = Math.max(teamAZoneAverages[1], teamAZoneAverages[2], teamAZoneAverages[3]);
        const teamBMaxNonGK = Math.max(teamBZoneAverages[1], teamBZoneAverages[2], teamBZoneAverages[3]);
        const teamAMidGap = teamAMaxNonGK - teamAZoneAverages[2];
        const teamBMidGap = teamBMaxNonGK - teamBZoneAverages[2];
        const penaltyPower = getMidfieldPenaltyPower(numPlayers);

        logger.debug(
            `  Midfield Preference Penalty (strength: ${midfieldPenaltyStrength.toFixed(2)}, power: ${penaltyPower.toFixed(1)}, players: ${numPlayers}):`
        );
        logger.debug(
            `    Team A: MID=${teamAZoneAverages[2].toFixed(1)}, Max=${teamAMaxNonGK.toFixed(1)}, Gap=${teamAMidGap.toFixed(1)}, Penalty=${teamAMidfieldPenalty.toFixed(3)} ${teamAMidfieldPenalty === 1.0 ? "(MID is strongest!)" : "(MID not strongest)"}`
        );
        logger.debug(
            `    Team B: MID=${teamBZoneAverages[2].toFixed(1)}, Max=${teamBMaxNonGK.toFixed(1)}, Gap=${teamBMidGap.toFixed(1)}, Penalty=${teamBMidfieldPenalty.toFixed(3)} ${teamBMidfieldPenalty === 1.0 ? "(MID is strongest!)" : "(MID not strongest)"}`
        );
        logger.debug(`    Combined Midfield Penalty: ${combinedMidfieldPenalty.toFixed(3)}`);
        logger.debug("");

        logger.debug(`  Zone Average Internal Balance (Deviation across zones):`);
        logger.debug(
            `    Team A Zone Avg Balance: ${teamAZonalBalance.toFixed(3)} ${teamAZonalBalance > teamBZonalBalance ? "(more balanced zones)" : "(less balanced zones)"}`
        );
        logger.debug(
            `    Team B Zone Avg Balance: ${teamBZonalBalance.toFixed(3)} ${teamBZonalBalance > teamAZonalBalance ? "(more balanced zones)" : "(less balanced zones)"}`
        );
        logger.debug(
            `    Internal Variance Ratio: ${internalSkillRatio.toFixed(3)} (power: ${skillZonePower.toFixed(1)})`
        );
        logger.debug(`    Scaled Internal Variance: ${(internalSkillRatio ** skillZonePower).toFixed(3)}`);
        logger.debug("");
        logger.debug(formatComparison("Std Dev", teamAStdDev, teamBStdDev, rawRatio));
        logger.debug(`  Team A: ${teamAStdDev > teamBStdDev ? "More spiky" : "More flat"} talent distribution`);
        logger.debug(`  Team B: ${teamBStdDev > teamAStdDev ? "More spiky" : "More flat"} talent distribution`);
        logger.debug(`  midDiffRatio (^3): ${midDiffRatio.toFixed(3)}`);
        logger.debug(`  Scaled (^3): ${midRatio.toFixed(3)}`);
    }

    return midRatio;
}

/**
 * Calculates comprehensive balance metrics using NEW configuration system
 *
 * Uses calibrated transformations and professional configuration.
 *
 * @param teamA First team
 * @param teamB Second team
 * @param config NEW BalanceConfiguration with calibrated thresholds
 * @param debug Enable detailed debug output with threshold context
 * @returns Combined score and detailed metrics
 */
export function calculateMetrics(
    teamA: FastTeam,
    teamB: FastTeam,
    config: BalanceConfiguration,
    debug: boolean
): { score: number; details: BalanceMetrics } {
    // Calculate each metric independently (always calculate all metrics)
    const overallStrengthBalance = calculateOverallStrengthBalance(teamA, teamB, debug);
    const positionalScoreBalance = calculatePositionalScoreBalance(teamA, teamB, debug);
    const zonalDistributionBalance = calculateZonalDistributionBalance(teamA, teamB, debug);
    const energyBalance = calculateEnergyBalance(teamA, teamB, debug);
    const creativityBalance = calculateCreativityBalance(teamA, teamB, debug);
    const strikerBalance = calculateStrikerBalance(teamA, teamB, debug);
    const allStatBalance = calculateAllStatBalance(teamA, teamB, debug);
    const talentDistributionBalance = calculateTalentDistributionBalance(teamA, teamB, debug);

    // Assemble detailed metrics
    const metrics: BalanceMetrics = {
        overallStrengthBalance,
        positionalScoreBalance,
        zonalDistributionBalance,
        energyBalance,
        creativityBalance,
        strikerBalance,
        allStatBalance,
        talentDistributionBalance,
    };

    // Calculate weighted score using NEW config structure
    // Star distribution penalty moved to Monte Carlo loop for optimal comparison
    const weightedScore =
        config.weights.primary.peakPotential * metrics.overallStrengthBalance +
        config.weights.primary.scoreBalance * metrics.positionalScoreBalance +
        config.weights.secondary.zoneBalance * metrics.zonalDistributionBalance +
        config.weights.secondary.energy * metrics.energyBalance +
        config.weights.secondary.creativity * metrics.creativityBalance +
        config.weights.secondary.striker * metrics.strikerBalance +
        config.weights.secondary.allStatBalance * metrics.allStatBalance +
        config.weights.primary.starDistribution * metrics.talentDistributionBalance;

    const finalScore = weightedScore;

    if (debug) {
        logger.debug("");
        logger.debug("╔═══════════════════════════════════════════════════════════════════╗");
        logger.debug("║         PROFESSIONAL BALANCE METRICS (Calibrated System)         ║");
        logger.debug("╚═══════════════════════════════════════════════════════════════════╝");
        logger.debug("");
        logger.debug("PRIMARY METRICS (What users care about most):");
        logger.debug(
            `  Star Distribution:     ${metrics.talentDistributionBalance.toFixed(3)} × ${config.weights.primary.starDistribution.toFixed(2)} = ${(config.weights.primary.starDistribution * metrics.talentDistributionBalance).toFixed(3)}`
        );
        logger.debug(
            `  Score Balance:         ${metrics.positionalScoreBalance.toFixed(3)} × ${config.weights.primary.scoreBalance.toFixed(2)} = ${(config.weights.primary.scoreBalance * metrics.positionalScoreBalance).toFixed(3)}`
        );
        logger.debug(
            `  Peak Potential:          ${metrics.overallStrengthBalance.toFixed(3)} × ${config.weights.primary.peakPotential.toFixed(2)} = ${(config.weights.primary.peakPotential * metrics.overallStrengthBalance).toFixed(3)}`
        );
        logger.debug("");
        logger.debug("SECONDARY METRICS (Fine-tuning):");
        logger.debug(
            `  Zone Balance:        ${metrics.zonalDistributionBalance.toFixed(3)} × ${config.weights.secondary.zoneBalance.toFixed(2)} = ${(config.weights.secondary.zoneBalance * metrics.zonalDistributionBalance).toFixed(3)}`
        );
        logger.debug(
            `  All-Stat Balance:      ${metrics.allStatBalance.toFixed(3)} × ${config.weights.secondary.allStatBalance.toFixed(2)} = ${(config.weights.secondary.allStatBalance * metrics.allStatBalance).toFixed(3)}`
        );
        logger.debug(
            `  Energy:                ${metrics.energyBalance.toFixed(3)} × ${config.weights.secondary.energy.toFixed(2)} = ${(config.weights.secondary.energy * metrics.energyBalance).toFixed(3)}`
        );
        logger.debug(
            `  Creativity:            ${metrics.creativityBalance.toFixed(3)} × ${config.weights.secondary.creativity.toFixed(2)} = ${(config.weights.secondary.creativity * metrics.creativityBalance).toFixed(3)}`
        );
        logger.debug(
            `  Striker Quality:       ${metrics.strikerBalance.toFixed(3)} × ${config.weights.secondary.striker.toFixed(2)} = ${(config.weights.secondary.striker * metrics.strikerBalance).toFixed(3)}`
        );
        logger.debug("");
        logger.debug("─────────────────────────────────────────────────────────────────────");
        logger.debug(`  FINAL WEIGHTED SCORE:  ${finalScore.toFixed(3)}`);
        logger.debug("╚═══════════════════════════════════════════════════════════════════╝");
        logger.debug("");
    }

    return { score: finalScore, details: metrics };
}
