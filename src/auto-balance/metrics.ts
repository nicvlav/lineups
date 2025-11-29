/**
 * Auto-Balance Metrics Calculation
 *
 * Professional metrics using calibrated transformations instead of arbitrary power scaling.
 * All thresholds and formulas are centralized in DEFAULT_BALANCE_CONFIG.
 *
 * @module auto-balance/metrics
 */

import type { FastTeam, BalanceMetrics, FastPlayer, TeamStarDistribution } from "./types";
import type { BalanceConfiguration } from "./metrics-config"
import type { Position, Formation, StarZoneClassification } from "@/types/positions";
import { getFormationsForCount } from "@/types/formations";
import { classifyPlayerByZone } from '@/lib/player-quality';
import { ZONE_POSITIONS, INDEX_TO_POSITION, getMidfieldPenaltyPower, getInternalZoneSkillPower, POSITION_INDICES } from "./constants";
import { calibratedScore, Steepness } from "./metric-transformations";
import { DEFAULT_BALANCE_CONFIG } from "./metrics-config";

/**
 * Helper function to format a simple comparison for debug output
 */
function formatComparison(label: string, valueA: number, valueB: number, ratio: number): string {
    const diff = Math.abs(valueA - valueB);
    return `  ${label}: ${valueA.toFixed(1)} | ${valueB.toFixed(1)} | Diff: ${diff.toFixed(1)} | Ratio: ${ratio.toFixed(3)}`;
}

/**
 * Helper function to format zone scores in a compact table
 */
function formatZoneScores(teamA: FastTeam, teamB: FastTeam): string {
    // const zones = ['GK', 'DEF', 'MID', 'ATT'];
    let output = '  Zone Scores:\n';
    output += '         GK      DEF     MID     ATT\n';
    output += `  A:  ${Array.from(teamA.zoneScores).map(s => s.toFixed(1).padStart(6)).join(' ')}\n`;
    output += `  B:  ${Array.from(teamB.zoneScores).map(s => s.toFixed(1).padStart(6)).join(' ')}\n`;
    return output;
}

/**
 * Helper function to format zone peak scores in a compact table
 */
function formatZonePeakScores(teamA: FastTeam, teamB: FastTeam): string {
    let output = '  Zone Peak Scores:\n';
    output += '         GK      DEF     MID     ATT\n';
    output += `  A:  ${Array.from(teamA.zonePeakScores).map(s => s.toFixed(1).padStart(6)).join(' ')}\n`;
    output += `  B:  ${Array.from(teamB.zonePeakScores).map(s => s.toFixed(1).padStart(6)).join(' ')}\n`;
    return output;
}

/**
 * Helper function to format zone average ratings in a compact table
 */
function formatZoneAverageRatings(teamA: FastTeam, teamB: FastTeam): string {
    const teamAZoneAverages = calculateZoneAverageRatings(teamA);
    const teamBZoneAverages = calculateZoneAverageRatings(teamB);

    let output = '  Zone Average Ratings:\n';
    output += '         GK      DEF     MID     ATT\n';
    output += `  A:  ${Array.from(teamAZoneAverages).map(s => s.toFixed(1).padStart(6)).join(' ')}\n`;
    output += `  B:  ${Array.from(teamBZoneAverages).map(s => s.toFixed(1).padStart(6)).join(' ')}\n`;
    return output;
}

/**
 * Calculate difference ratio
 *
 * Any time we have two values to compare for a balance ratio
 * We can use this - where 1.0 means perfectly even and 0.0 means the opposite
 */
function calculateBasicDifferenceRatio(a: number, b: number): number {
    const minValue = Math.min(a, b);
    const maxValue = Math.max(a, b);

    // If both are zero, they're perfectly balanced
    if (maxValue === 0) return 1.0;

    // If one is zero and the other isn't, that's maximum imbalance
    if (minValue === 0) return 0.0;

    const differenceRatio = Math.abs(a - b) / maxValue;
    return 1 - differenceRatio;
}

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
    const zoneNames = ['DEF', 'MID', 'ATT'];
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
        penalty = Math.pow(sum, Steepness.Gentle);
    } else if (maxWins === 2 && neutrals === 1) {
        // 2-0-1 split: two zones favor one team, one neutral
        penalty = twoZonePenalty;
    } else if (maxWins > 0) {
        // 1-1-1 split: cancel out two zones
        penalty = Math.pow(sum, Steepness.VeryGentle);
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
    const attWRRatio = calculateBasicDifferenceRatio(aAttWR, aAttWR);
    const defWRRatio = calculateBasicDifferenceRatio(aDefWR, bDefWR);
    const totalWRRatio = calculateBasicDifferenceRatio(aTotalWR, bTotalWR);

    // Check for cancellation: do the differences point in opposite directions?
    const aAttAdvantage = Math.min(1, Math.max(-1, aAttWR - bAttWR)); // positive if A has more att WR
    const aDefAdvantage = Math.min(1, Math.max(-1, aDefWR - bDefWR)); // positive if A has more def WR
    const aWrAdvantage = Math.min(1, Math.max(-1, aTotalWR - bTotalWR)); // positive if A has more def WR
    const aStaminaAdvantage = Math.min(1, Math.max(-1, teamA.staminaScore - teamB.staminaScore)); // positive if A has more def WR
    let cancellationFactor = 1.0 - (Math.abs(aWrAdvantage + aStaminaAdvantage)) / 4.0; // 1 if opposite signs (cancellation)

    if (aAttAdvantage !== 0 && aDefAdvantage !== 0) {
        cancellationFactor *= 1.0 - (Math.abs(aAttAdvantage + aDefAdvantage)) / 4.0;
    }

    // IMPORTANT: Add a floor to cancellationFactor to allow differentiation in all-bad scenarios
    // Without this, perfect balance in one metric (ratio=1.0) zeros out the entire score
    // Floor of 0.1 means even worst-case imbalances can still be compared (10% weight on raw ratios)
    cancellationFactor = Math.max(0.1, cancellationFactor);

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
    const blendWeight = Math.min(0.8, Math.max(0.2, 1.0 - rawQuality));

    // Blend: bad scenarios lean on cancellation, good scenarios lean on raw quality
    const workrateRatio = rawQuality * (1 - blendWeight) + cancellationAdjusted * blendWeight;

    // 3. Combine stamina and workrate
    const rawCombined = staminaRatio * workrateRatio;

    // Use calibrated scoring
    const energyBalanceRatio = calibratedScore(
        rawCombined,
        DEFAULT_BALANCE_CONFIG.thresholds.energy,
        Steepness.Gentle
    );

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.energy;
        console.log('Energy Balance:');
        console.log(formatComparison('Stamina', teamA.staminaScore, teamB.staminaScore, staminaRatio));
        console.log(formatComparison('Att Workrate', aAttWR, bAttWR, calculateBasicDifferenceRatio(aAttWR, bAttWR)));
        console.log(formatComparison('Def Workrate', aDefWR, bDefWR, calculateBasicDifferenceRatio(aDefWR, bDefWR)));
        console.log(formatComparison('Total Workrate', aTotalWR, bTotalWR, totalWRRatio));
        console.log(`  Cancellation Factor: ${cancellationFactor.toFixed(3)} (att: ${aAttAdvantage.toFixed(1)}, def: ${aDefAdvantage.toFixed(1)})`);
        console.log(`  Raw Quality (no cancel): ${rawQuality.toFixed(3)}`);
        console.log(`  Cancellation-Adjusted: ${cancellationAdjusted.toFixed(3)}`);
        console.log(`  Blend Weight: ${blendWeight.toFixed(3)} (higher = more cancellation influence)`);
        console.log(`  Final Workrate Ratio: ${workrateRatio.toFixed(3)}`);
        console.log(`  Raw Combined: ${rawCombined.toFixed(3)}`);
        console.log(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        console.log(`  Calibrated Score: ${energyBalanceRatio.toFixed(3)}`);
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
        console.log('Overall Strength Balance (Peak Potential):');
        console.log(formatComparison('Peak', teamA.peakPotential, teamB.peakPotential, rawRatio));
        console.log(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        console.log(`  Calibrated Score: ${strengthBalanceRatio.toFixed(3)}`);
    }

    return strengthBalanceRatio;
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
    // Single-pass analysis: calculate peak vs placed scores AND variance penalty
    const analyzeTeam = (team: FastTeam) => {
        let peakTotal = 0;
        let placedTotal = 0;
        const gaps: number[] = [];
        let worstGap = 0;
        let worstPlayerName = '';

        for (let posIdx = 0; posIdx < team.positions.length; posIdx++) {
            const positionGroup = team.positions[posIdx];
            for (const player of positionGroup) {
                // Use the position index from the team structure, not player.assignedPosition
                // which may have been mutated by subsequent Monte Carlo iterations
                const assignedScore = player.scores[posIdx];
                const bestScore = player.bestScore;
                const gap = bestScore - assignedScore;

                // Accumulate scores (skip GK from peak since nobody is good at it)
                if (posIdx !== 0) {
                    peakTotal += bestScore;
                    placedTotal += assignedScore;

                    // Track gap for variance calculation (also skip GKs)
                    gaps.push(gap);

                    if (gap > worstGap) {
                        worstGap = gap;
                        worstPlayerName = player.original.name;
                    }
                }
            }
        }

        // Calculate variance of gaps - punishes general spread
        const meanGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
        const variance = gaps.reduce((sum, g) => sum + Math.pow(g - meanGap, 2), 0) / gaps.length;
        const stdDev = Math.sqrt(variance);

        // Calculate mean absolute deviation (MAD) - more robust to outliers
        const mad = gaps.reduce((sum, g) => sum + Math.abs(g - meanGap), 0) / gaps.length;

        return {
            peakTotal,
            placedTotal,
            gaps,
            meanGap,
            stdDev,
            mad,
            worstGap,
            worstPlayerName
        };
    };

    const teamAStats = analyzeTeam(teamA);
    const teamBStats = analyzeTeam(teamB);

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
    const combinedVariance = combinedGaps.reduce((sum, g) => sum + Math.pow(g - combinedMean, 2), 0) / combinedGaps.length;
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

    // Convert variance to penalty
    // StdDev of 0 = perfect (all same gap), StdDev of 3+ = very bad
    // Use exponential curve: low variance is fine, high variance gets punished hard
    const variancePenalty = Math.min(1.0, Math.pow(combinedStdDev / 4.0, 2.2));
    const varianceScore = 1.0 - variancePenalty;

    // Weighted gap penalty (uses the progressive multipliers)
    const weightedGapPenalty = Math.min(1.0, avgWeightedGap / 30.0);
    const weightedGapScore = 1.0 - weightedGapPenalty;

    // Mean gap penalty: punish having a high average gap
    // Mean gap of 0 = perfect, 5+ = terrible
    const meanGapPenalty = Math.min(1.0, Math.pow(combinedMean / 6.0, 2.0));
    const meanGapScore = 1.0 - meanGapPenalty;

    // Worst outlier penalty: still keep some punishment for catastrophic placements
    const worstOverallGap = Math.max(teamAStats.worstGap, teamBStats.worstGap);
    const worstGapPenalty = Math.min(1.0, Math.pow(worstOverallGap / 12.0, 2.5));
    const worstGapScore = 1.0 - worstGapPenalty;

    // Combine scores:
    // - 35% efficiency (global peak vs placed)
    // - 30% variance (punish uneven gaps - INCREASED)
    // - 20% weighted gap (progressive penalty by gap size - REPLACES mean gap)
    // - 15% worst outlier (catastrophic placements still matter)
    const finalScore =
        efficiencyScore * 0.35 +
        varianceScore * 0.30 +
        weightedGapScore * 0.20 +
        worstGapScore * 0.15;

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.scoreBalance;
        console.log('Positional Score Balance:');
        console.log(formatComparison('A     | Peak vs Placed | ', teamAStats.peakTotal, teamAStats.placedTotal, aRatio));
        console.log(formatComparison('B     | Peak vs Placed | ', teamBStats.peakTotal, teamBStats.placedTotal, bRatio));
        console.log(formatComparison('Diff  | Peak vs Placed | ', aRatio, bRatio, diff));
        console.log(formatComparison('Total | Peak vs Placed | ', teamAStats.placedTotal + teamBStats.placedTotal, teamAStats.peakTotal + teamBStats.peakTotal, efficiency));
        console.log(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        console.log(`  Efficiency Score: ${efficiencyScore.toFixed(3)}`);
        console.log(`  Gap Statistics:`);
        console.log(`    Team A: mean=${teamAStats.meanGap.toFixed(2)}, stdDev=${teamAStats.stdDev.toFixed(2)}, worst=${teamAStats.worstPlayerName} (${teamAStats.worstGap.toFixed(1)})`);
        console.log(`    Team B: mean=${teamBStats.meanGap.toFixed(2)}, stdDev=${teamBStats.stdDev.toFixed(2)}, worst=${teamBStats.worstPlayerName} (${teamBStats.worstGap.toFixed(1)})`);
        console.log(`    Combined: mean=${combinedMean.toFixed(2)}, stdDev=${combinedStdDev.toFixed(2)}, worst=${worstOverallGap.toFixed(1)}`);
        console.log(`  Component Scores:`);
        console.log(`    Variance Score: ${varianceScore.toFixed(3)} (stdDev=${combinedStdDev.toFixed(2)}, penalty=${variancePenalty.toFixed(3)})`);
        console.log(`    Weighted Gap Score: ${weightedGapScore.toFixed(3)} (avgWeighted=${avgWeightedGap.toFixed(2)}, penalty=${weightedGapPenalty.toFixed(3)})`);
        console.log(`    Mean Gap Score: ${meanGapScore.toFixed(3)} (mean=${combinedMean.toFixed(2)}, penalty=${meanGapPenalty.toFixed(3)}) [not used]`);
        console.log(`    Worst Gap Score: ${worstGapScore.toFixed(3)} (worst=${worstOverallGap.toFixed(1)}, penalty=${worstGapPenalty.toFixed(3)})`);
        console.log(`  Final: ${efficiencyScore.toFixed(3)}×0.35 + ${varianceScore.toFixed(3)}×0.30 + ${weightedGapScore.toFixed(3)}×0.20 + ${worstGapScore.toFixed(3)}×0.15 = ${finalScore.toFixed(3)}`);
    }

    return finalScore;
}

/**
 * Calculates the inner variance of a team's zones
 *
 * @param team team
 * @returns Balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
const calculateSingleTeamZonalBalance = (zoneScores: Float32Array): number => {
    // Extract non-goalkeeper zones: Defense (1), Midfield (2), Attack (3)
    const defenseZoneScore = zoneScores[1];
    const midfieldZoneScore = zoneScores[2];
    const attackZoneScore = zoneScores[3];

    const nonGoalkeeperZones = [defenseZoneScore, midfieldZoneScore, attackZoneScore];
    const zoneTotal = nonGoalkeeperZones.reduce((sum, score) => sum + score, 0);
    const zoneAverage = zoneTotal / 3;

    // Perfect balance when all zones are empty or equal
    if (zoneAverage === 0) return 1;

    // Calculate variance to measure how spread out the zone scores are
    // Lower variance = more balanced distribution
    const zoneVariance = nonGoalkeeperZones.reduce(
        (sum, zoneScore) => sum + Math.pow(zoneScore - zoneAverage, 2),
        0
    ) / 3;

    const zoneStandardDeviation = Math.sqrt(zoneVariance);

    // Coefficient of variation: standard deviation relative to mean
    // Measures relative variability (0 = perfectly even, higher = more uneven)
    const coefficientOfVariation = zoneStandardDeviation / zoneAverage;

    // Convert to balance score using inverse relationship
    // Lower CV = higher balance score
    const zonalBalanceScore = 1 / (1 + coefficientOfVariation);

    return zonalBalanceScore;
};

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
        directionality.penalty * (totalImbalance + internalSkillRatio) / 2,
        DEFAULT_BALANCE_CONFIG.thresholds.zoneBalance,
        Steepness.VerySteep
    );

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.zoneBalance;
        console.log('Zonal Distribution Balance:');
        console.log(formatZoneScores(teamA, teamB));
        console.log(formatZonePeakScores(teamA, teamB));
        console.log(formatZoneAverageRatings(teamA, teamB));
        console.log('  Per-Zone Raw Ratios (DEF, MID, ATT): ' + rawZoneRatios.map(r => r.toFixed(3)).join(', '));
        console.log(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        console.log(`  Zone Winners: ${directionality.winners.join(', ')}`);
        console.log(`  Directional Split: A=${directionality.teamAWins}, B=${directionality.teamBWins}, Neutral=${directionality.neutrals}`);
        console.log(`  Zone Directional Penalty: ${directionality.penalty.toFixed(3)}`);
        console.log(`  Team A Internal Balance: ${teamAZonalBalance.toFixed(3)}`);
        console.log(`  Team B Internal Balance: ${teamBZonalBalance.toFixed(3)}`);
        console.log(`  internalSkillRatio: ${internalSkillRatio.toFixed(3)}`);
        console.log(`  totalImbalance: ${totalImbalance.toFixed(3)}`);
        console.log(`  Final Zonal Balance: ${zonalBalanceRatio.toFixed(3)}`);
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
        console.log('All-Stat Balance (Sum of Every Player Stat):');
        console.log(formatComparison('Total All Stats', teamATotal, teamBTotal, rawRatio));
        console.log(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        console.log(`  Calibrated Score: ${allStatBalanceRatio.toFixed(3)}`);
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
        console.log('Creativity Balance:');
        console.log(formatComparison('Creativity', teamA.creativityScore, teamB.creativityScore, rawRatio));
        console.log(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        console.log(`  Calibrated Score: ${creativityBalanceRatio.toFixed(3)}`);
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
    const EPSILON = 0.00001; // Score must be within 3 points of best score to count as viable striker
    const VIABLE_DIFFERENCE = 3.0;
    const HIGH_SCORE_THRESHOLD = 90;
    const MEDIUM_SCORE_THRESHOLD = 80;
    const MIN_THRESHOLD = 65;
    // Weighted striker scoring system:
    // +3 points: ST is their BEST position (specialist striker)
    // +2 points: ST is really high >= 90
    // +1 point:  ST is viable (within EPSILON of best score) but not their best
    let teamAStrikerPoints = 0;
    let teamBStrikerPoints = 0;

    // Track counts for debug output
    let teamASpecialists = 0;
    let teamAViable = 0;
    let teamBSpecialists = 0;
    let teamBViable = 0;

    for (const positionPlayers of teamA.positions) {
        for (const player of positionPlayers) {
            const stScore = player.scores[ST_INDEX];
            const bestScore = player.bestScore;

            if (stScore < MIN_THRESHOLD || Math.abs(stScore - bestScore) > VIABLE_DIFFERENCE) continue;

            if (player.isSpecialist && Math.abs(stScore - bestScore) < EPSILON) {
                // ST is their best position (specialist)
                teamAStrikerPoints += 6;
                teamASpecialists++;
            } else if (stScore >= HIGH_SCORE_THRESHOLD) {
                // ST is viable but not their best
                teamAStrikerPoints += 4;
                teamAViable++;
            } else if (stScore >= MEDIUM_SCORE_THRESHOLD) {
                // ST is viable but not their best
                teamAStrikerPoints += 2;
                teamAViable++;
            } else {
                // ST is viable but not their best
                teamAStrikerPoints += 1;
                teamAViable++;
            }
        }
    }

    for (const positionPlayers of teamB.positions) {
        for (const player of positionPlayers) {
            const stScore = player.scores[ST_INDEX];
            const bestScore = player.bestScore;

            if (stScore < MIN_THRESHOLD || Math.abs(stScore - bestScore) > VIABLE_DIFFERENCE) continue;

            if (player.isSpecialist && Math.abs(stScore - bestScore) < EPSILON) {
                // ST is their best position (specialist)
                teamBStrikerPoints += 6;
                teamBSpecialists++;
            } else if (stScore >= HIGH_SCORE_THRESHOLD) {
                // ST is viable but not their best
                teamBStrikerPoints += 4;
                teamBViable++;
            } else if (stScore >= MEDIUM_SCORE_THRESHOLD) {
                // ST is viable but not their best
                teamBStrikerPoints += 2;
                teamBViable++;
            } else {
                // ST is viable but not their best
                teamBStrikerPoints += 1;
                teamBViable++;
            }
        }
    }
    // 1. Specialist striker balance (most important - need true strikers!)
    let specialistBalance = 0;

    const totalSpecialists = teamASpecialists + teamBSpecialists;

    if (totalSpecialists == 0) {
        specialistBalance = 1.0;
    } else if (totalSpecialists % 2 === 1) {
        specialistBalance = (teamASpecialists > teamBSpecialists) == (teamAStrikerPoints > teamBStrikerPoints) ? 0.0 : 1.0;
    } else {
        specialistBalance = calculateBasicDifferenceRatio(teamASpecialists, teamBSpecialists);
    }

    // 2. Viable striker balance (secondary - can fill in at striker)
    const viableBalance = calculateBasicDifferenceRatio(teamAStrikerPoints, teamBStrikerPoints);

    // 3. Overall striker quality balance (legacy metric)
    const qualityRatio = calculateBasicDifferenceRatio(teamA.strikerScore, teamB.strikerScore);
    const qualityScore = calibratedScore(
        qualityRatio,
        DEFAULT_BALANCE_CONFIG.thresholds.striker,
        Steepness.Moderate
    );

    // Combine: specialist count matters most (50%), viable count secondary (30%), quality tertiary (20%)
    const strikerBalanceRatio = specialistBalance * 0.4 + viableBalance * 0.5 + qualityScore * 0.1;

    // if one team has more specialists than the other
    // we want the team with less specialists
    // to compensate with a higher overall score
    // if (teamASpecialists != teamBSpecialists && ((teamASpecialists > teamBSpecialists) == (teamA.strikerScore > teamB.strikerScore))) {
    //     strikerBalanceRatio *= 0.25;
    // }

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.striker;
        console.log('Striker Balance (3-Factor System):');
        console.log(`  Team A: ${teamAStrikerPoints} points (${teamASpecialists} specialists, ${teamAViable} viable)`);
        console.log(`  Team B: ${teamBStrikerPoints} points (${teamBSpecialists} specialists, ${teamBViable} viable)`);
        console.log('');
        console.log(formatComparison('  Specialist Strikers', teamASpecialists, teamBSpecialists, specialistBalance));
        console.log(`    Specialist Balance: ${specialistBalance.toFixed(3)} (weight: 50%)`);
        console.log(formatComparison('  Viable Strikers', teamAStrikerPoints, teamBStrikerPoints, viableBalance));
        console.log(`    Viable Balance: ${viableBalance.toFixed(3)} (weight: 30%)`);
        console.log(formatComparison('  Striker Quality', teamA.strikerScore, teamB.strikerScore, qualityRatio));
        console.log(`    Quality Balance: ${qualityScore.toFixed(3)} (weight: 20%)`);
        console.log('');
        console.log(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        console.log(`  Final Striker Balance: ${strikerBalanceRatio.toFixed(3)}`);
    }

    return strikerBalanceRatio;
}

/**
 * Helper to determine which zone a position index belongs to
 * Uses ZONE_POSITIONS constant for zone boundaries
 */
function getNumPlayersForZone(zoneIdx: number, formation: Formation | null): number {
    if (!formation) return 1;

    let count = 0;

    const zone = ZONE_POSITIONS[zoneIdx];

    zone.forEach((val) => {
        count += formation.positions[INDEX_TO_POSITION[val]];
    });


    // Fallback (should never reach here if ZONE_POSITIONS is complete)
    return count;
}

/**
 * Calculates the average player rating per zone for a team
 *
 * @param team Team to analyze
 * @returns Array of average ratings per zone [GK, DEF, MID, ATT]
 */
function calculateZoneAverageRatings(team: FastTeam): Float32Array {
    const sums = team.zoneScores.map((val, i) => {
        return val / getNumPlayersForZone(i, team.formation);
    });

    return sums;
}

/**
 * Calculates midfield preference penalty for a single team
 *
 * Penalizes scenarios where the midfield (zone 2) isn't the strongest zone
 * (excluding GK). The penalty is based on how far the midfield average is
 * from the maximum zone average.
 *
 * Power scaling adjusts based on player count:
 * - Small teams (18 players): gentler penalty (power ~1.5, more linear)
 * - Large teams (22+ players): harsher penalty (power ~4.0, exponential)
 *
 * @param zoneAverages Array of zone average ratings [GK, DEF, MID, ATT]
 * @param penaltyStrength How harsh the penalty should be (0-1, where 1 is max penalty) - comes from config
 * @param numPlayers Total number of players (used for dynamic power scaling)
 * @returns Penalty multiplier from 0 (harsh penalty) to 1 (no penalty)
 */
function calculateMidfieldPreferencePenalty(zoneAverages: Float32Array): number {
    // Extract non-GK zones
    const defAvg = zoneAverages[1];  // DEF
    const midAvg = zoneAverages[2];  // MID
    const attAvg = zoneAverages[3];  // ATT

    // Find the maximum average among DEF, MID, ATT
    const maxZoneAvg = Math.max(defAvg, midAvg, attAvg);

    // If midfield is already the strongest (or tied), no penalty
    if (midAvg >= maxZoneAvg) {
        return 1.0;
    }

    return calibratedScore(
        calculateBasicDifferenceRatio(maxZoneAvg, midAvg),
        DEFAULT_BALANCE_CONFIG.thresholds.starDistribution,
        Steepness.Steep
    );
}

/**
 * Calculates the standard deviation of individual player scores within a team
 *
 * This measures talent distribution consistency - whether a team has
 * spiky talent (few superstars + many weak players) or flat talent
 * (consistently solid players throughout).
 *
 * @param team Team to analyze
 * @returns Standard deviation of player scores
 */
function calculatePlayerScoreStdDev(team: FastTeam): number {
    const playerScores: number[] = [];

    // Collect all player scores from all positions
    for (let posIdx = 0; posIdx < team.positions.length; posIdx++) {
        const positionPlayers = team.positions[posIdx];
        for (const player of positionPlayers) {
            // Use the position index from the team structure, not player.assignedPosition
            // which may have been mutated by subsequent Monte Carlo iterations
            playerScores.push(player.scores[posIdx]);
        }
    }

    // Handle empty team case
    if (playerScores.length === 0) return 0;

    // Calculate mean
    const mean = playerScores.reduce((sum, score) => sum + score, 0) / playerScores.length;

    // Calculate variance
    const variance = playerScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / playerScores.length;

    // Return standard deviation
    return Math.sqrt(variance);
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
    calibratedScore(
        teamAMidfieldPenalty * teamBMidfieldPenalty,
        DEFAULT_BALANCE_CONFIG.thresholds.starDistribution,
        Steepness.VeryGentle
    );
    const midDiffRatio = calculateBasicDifferenceRatio(teamAZoneAverages[2], teamBZoneAverages[2]);

    const midRatio = midDiffRatio * combinedMidfieldPenalty;

    // Get dynamic power scaling for internal variance based on player count
    // More players = harsher penalty for zone imbalance
    const skillZonePower = getInternalZoneSkillPower(numPlayers);

    // Get dynamic power scaling for internal variance based on player count
    // More players = harsher penalty for zone imbalance
    // const internalVariancePower = getInternalVariancePower(numPlayers);


    // Apply dynamic power scaling to heavily penalize distribution mismatches
    // Power scales with player count: 18 players → power 1.0, 22+ players → power 2.0
    // const talentDistributionRatio = (Math.pow(rawRatio, internalVariancePower) * 0.25 + Math.pow(internalSkillRatio, skillZonePower) * 0.75) * combinedMidfieldPenalty;

    if (debug) {
        console.log('Talent Distribution Balance (Player Score Std Dev):');
        console.log('  Average Player Ratings Per Zone:');
        console.log('         GK      DEF     MID     ATT');
        console.log(`  A:  ${Array.from(teamAZoneAverages).map(s => s.toFixed(1).padStart(6)).join(' ')}`);
        console.log(`  B:  ${Array.from(teamBZoneAverages).map(s => s.toFixed(1).padStart(6)).join(' ')}`);
        console.log('');

        // Midfield preference penalty debug output
        const teamAMaxNonGK = Math.max(teamAZoneAverages[1], teamAZoneAverages[2], teamAZoneAverages[3]);
        const teamBMaxNonGK = Math.max(teamBZoneAverages[1], teamBZoneAverages[2], teamBZoneAverages[3]);
        const teamAMidGap = teamAMaxNonGK - teamAZoneAverages[2];
        const teamBMidGap = teamBMaxNonGK - teamBZoneAverages[2];
        const penaltyPower = getMidfieldPenaltyPower(numPlayers);

        console.log(`  Midfield Preference Penalty (strength: ${midfieldPenaltyStrength.toFixed(2)}, power: ${penaltyPower.toFixed(1)}, players: ${numPlayers}):`);
        console.log(`    Team A: MID=${teamAZoneAverages[2].toFixed(1)}, Max=${teamAMaxNonGK.toFixed(1)}, Gap=${teamAMidGap.toFixed(1)}, Penalty=${teamAMidfieldPenalty.toFixed(3)} ${teamAMidfieldPenalty === 1.0 ? '(MID is strongest!)' : '(MID not strongest)'}`);
        console.log(`    Team B: MID=${teamBZoneAverages[2].toFixed(1)}, Max=${teamBMaxNonGK.toFixed(1)}, Gap=${teamBMidGap.toFixed(1)}, Penalty=${teamBMidfieldPenalty.toFixed(3)} ${teamBMidfieldPenalty === 1.0 ? '(MID is strongest!)' : '(MID not strongest)'}`);
        console.log(`    Combined Midfield Penalty: ${combinedMidfieldPenalty.toFixed(3)}`);
        console.log('');

        console.log(`  Zone Average Internal Balance (Deviation across zones):`);
        console.log(`    Team A Zone Avg Balance: ${teamAZonalBalance.toFixed(3)} ${teamAZonalBalance > teamBZonalBalance ? '(more balanced zones)' : '(less balanced zones)'}`);
        console.log(`    Team B Zone Avg Balance: ${teamBZonalBalance.toFixed(3)} ${teamBZonalBalance > teamAZonalBalance ? '(more balanced zones)' : '(less balanced zones)'}`);
        console.log(`    Internal Variance Ratio: ${internalSkillRatio.toFixed(3)} (power: ${skillZonePower.toFixed(1)})`);
        console.log(`    Scaled Internal Variance: ${Math.pow(internalSkillRatio, skillZonePower).toFixed(3)}`);
        console.log('');
        console.log(formatComparison('Std Dev', teamAStdDev, teamBStdDev, rawRatio));
        console.log(`  Team A: ${teamAStdDev > teamBStdDev ? 'More spiky' : 'More flat'} talent distribution`);
        console.log(`  Team B: ${teamBStdDev > teamAStdDev ? 'More spiky' : 'More flat'} talent distribution`);
        console.log(`  midDiffRatio (^3): ${midDiffRatio.toFixed(3)}`);
        console.log(`  Scaled (^3): ${midRatio.toFixed(3)}`);
    }

    return midRatio;
}

/**
 * Configuration for star distribution penalty calculation
 *
 * These weights control how harshly different types of imbalances are penalized.
 * Higher values = stronger penalty for that factor.
 */
/**
 * Comprehensive penalty weight configuration for star distribution
 * ALL weights centralized for easy tuning and experimentation
 *
 * Key Changes from Previous System:
 * - Stronger quality balance emphasis (individual + grand total)
 * - Grand total quality tracking (sum of best scores, not averages)
 * - Improved odd star handling (higher base scale, stronger quality weights)
 * - Organized by even/odd for clarity
 */
const PENALTY_WEIGHTS = {
    /**
     * EVEN STAR CONFIGURATION
     * Perfect balance is achievable and required
     */
    even: {
        // ========== QUALITY-BASED PENALTIES ==========
        /** Average best score difference - prevents one team getting "better" individual players */
        individualQuality: 0.70,      // Increased from 0.60

        /** Grand total quality skew - sum of all zone best scores must balance */
        totalQualitySkew: 0.40,       // Increased from 0.25 - CRITICAL for quality balance!

        /** Per-zone quality penalties (best scores summed per zone) */
        zoneQualityDef: 0.20,
        zoneQualityMid: 0.15,
        zoneQualityAtt: 0.20,

        /** Variance penalties - prevent "spiky" vs "flat" team compositions */
        varianceImbalance: 0.15,      // Std dev difference between teams
        highVariance: 0.10,           // Penalty for overall high variance (spiky teams)

        // ========== SPECIALIST DISTRIBUTION PENALTIES ==========
        /** Uneven specialist splits (CATASTROPHIC - can be disqualifying) */
        specialistUneven: 0.80,       // Even split is MANDATORY for even totals

        /** Specialist pairing penalty (def/att should be on same team) */
        specialistPairing: 0.50,

        /** Specialist directional clustering (one team gets all types) */
        specialistDirectional: 0.50,

        // ========== DIRECTIONAL CLUSTERING PENALTIES ==========
        /** Zone clustering penalties (prevent 3-0, 2-1 zone sweeps) */
        zoneClusteringTotal: 0.50,    // 3-0 sweep
        zoneClusteringMajor: 0.30,    // 2-1 split
        zoneClusteringMinor: 0.20,    // 2-0-1 split

        // ========== NORMALIZATION & SCALING ==========
        /** Normalization factor for quality differences */
        qualityNormalization: 100,

        /** Normalization factor for variance differences */
        varianceNormalization: 5,

        /** Power scaling for quality penalties */
        qualityPower: 1.3,            // Increased from 1.2 for stronger scaling

        /** Power scaling for specialist imbalances */
        specialistPower: 1.5,
    },

    /**
     * ODD STAR CONFIGURATION
     * Some imbalance is unavoidable (e.g., 3v2), focus on quality equivalency
     */
    odd: {
        /** Base scale multiplier - all penalties scaled down for odd scenarios */
        scale: 0.50,                  // Increased from 0.40 to strengthen penalties

        // ========== QUALITY-BASED PENALTIES ==========
        /** Individual quality balance - MORE IMPORTANT for odd since structural balance is impossible */
        individualQuality: 0.60,      // Increased from 0.45

        /** Grand total quality skew - MOST IMPORTANT for odd stars! */
        totalQualitySkew: 0.50,       // DOUBLED from 0.25 - ensures total quality equivalency

        /** Per-zone quality penalties (less strict than even) */
        zoneQualityDef: 0.15,
        zoneQualityMid: 0.10,
        zoneQualityAtt: 0.15,

        /** Variance penalties */
        varianceImbalance: 0.12,
        highVariance: 0.08,

        // ========== SPECIALIST DISTRIBUTION PENALTIES ==========
        /** Uneven specialist splits (acceptable for odd, penalize 2+ diff) */
        specialistUneven: 0.80,       // Same as even, but 1-diff is allowed

        /** Specialist pairing (less strict) */
        specialistPairing: 0.40,

        /** Specialist directional clustering */
        specialistDirectional: 0.30,

        /** Quality compensation for 1-diff specialists */
        specialistQualityComp: 0.15,  // Penalize when smaller team gets worse quality

        // ========== DIRECTIONAL CLUSTERING PENALTIES ==========
        zoneClusteringTotal: 0.40,
        zoneClusteringMajor: 0.20,

        // ========== NORMALIZATION & SCALING ==========
        qualityNormalization: 100,
        varianceNormalization: 5,

        /** Stronger quality power for odd (quality matters MORE) */
        qualityPower: 1.4,            // Increased from 1.2

        specialistPower: 1.5,
    },
} as const;


function calculateTeamStarMetrics(classifications: StarZoneClassification[]): {
    defSpecialistCount: number;
    attSpecialistCount: number;
    midfielderCount: number;
    allRounderCount: number;
    totalDefQuality: number;
    totalMidQuality: number;
    totalAttQuality: number;
    bestDefScore: number;
    bestMidScore: number;
    bestAttScore: number;
    bestScore: number;
} {
    if (classifications.length === 0) {
        return {
            defSpecialistCount: 0,
            attSpecialistCount: 0,
            midfielderCount: 0,
            allRounderCount: 0,
            totalDefQuality: 0,
            totalMidQuality: 0,
            totalAttQuality: 0,
            bestDefScore: 0,
            bestMidScore: 0,
            bestAttScore: 0,
            bestScore: 0
        };
    }

    let defSpecialistCount = 0;
    let attSpecialistCount = 0;
    let midfielderCount = 0;
    let allRounderCount = 0;
    let totalDefQuality = 0;
    let totalMidQuality = 0;
    let totalAttQuality = 0;

    let bestDefScore = 0;
    let bestMidScore = 0;
    let bestAttScore = 0;

    // Count specialists and accumulate quality
    for (const c of classifications) {
        // Count specialist types
        if (c.specialistType === 'Defender') {
            defSpecialistCount++;
        } else if (c.specialistType === 'Attacker') {
            attSpecialistCount++;
        } else if (c.specialistType === 'Midfielder') {
            midfielderCount++;
        } else {
            allRounderCount++;
        }

        if (c.bestDefensiveScore > bestDefScore) {
            bestDefScore = c.bestDefensiveScore;
        }

        if (c.bestMidfieldScore > bestMidScore) {
            bestMidScore = c.bestMidfieldScore;
        }

        if (c.bestAttackingScore > bestAttScore) {
            bestAttScore = c.bestAttackingScore;
        }

        // Accumulate total quality (simple sum - no weighting tricks)
        totalDefQuality += c.bestDefensiveScore;
        totalMidQuality += c.bestMidfieldScore;
        totalAttQuality += c.bestAttackingScore;


    }

    return {
        defSpecialistCount,
        attSpecialistCount,
        midfielderCount,
        allRounderCount,
        totalDefQuality,
        totalMidQuality,
        totalAttQuality,
        bestDefScore,
        bestMidScore,
        bestAttScore,
        bestScore: Math.max(bestDefScore, bestMidScore, bestAttScore)
    };
}

/**
 * Core calculation for star distribution analysis
 *
 * This is the shared logic used by both calculateOptimalStarDistribution (for finding
 * the theoretical best) and calculateStarZonePenalty (for evaluating actual teams).
 *
 * Analyzes a split of star players into two teams and calculates:
 * 1. Specialist count imbalances (defensive/attacking/midfielder counts)
 * 2. Per-zone quality imbalances (defensive/midfield/attacking quality points)
 * 3. Overall quality skew (total quality across all zones)
 * 4. Per-zone directional winners (which team wins each zone)
 * 5. Directional clustering (one team winning multiple zones)
 * 6. Specialist count directional bias (one team having more specialists across categories)
 *
 * @param teamAClassifications Star classifications for team A
 * @param teamBClassifications Star classifications for team B
 * @returns Penalty score from 0 (terrible split) to 1 (perfect split) with detailed metrics
 */

function calculateStarDistributionPenalty(
    teamAClassifications: StarZoneClassification[],
    teamBClassifications: StarZoneClassification[]
): {
    penalty: number;
    teamADefSpecialists: number;
    teamBDefSpecialists: number;
    teamAAttSpecialists: number;
    teamBAttSpecialists: number;
    teamAMidfielders: number;
    teamBMidfielders: number;
    teamAAllRounders: number;
    teamBAllRounders: number;
    // Component penalties for smart multiplier (optional - vary by odd/even)
    specialistDistributionPenalty?: number;
    specialistPairingPenalty?: number;
} {
    const oddTotal = (teamAClassifications.length + teamBClassifications.length) % 2;
    // EVEN STARS: Perfect balance is achievable and required
    const weights = PENALTY_WEIGHTS.even;

    // Calculate metrics for both teams
    const teamAMetrics = calculateTeamStarMetrics(teamAClassifications);
    const teamBMetrics = calculateTeamStarMetrics(teamBClassifications);

    // 3. PER-ZONE QUALITY BALANCE
    // Check individual zone quality using grand totals
    const defDiff = calculateBasicDifferenceRatio(teamAMetrics.totalDefQuality, teamBMetrics.totalDefQuality);
    const midDiff = calculateBasicDifferenceRatio(teamAMetrics.totalMidQuality, teamBMetrics.totalMidQuality);
    const attDiff = calculateBasicDifferenceRatio(teamAMetrics.totalAttQuality, teamBMetrics.totalAttQuality);

    const diffPenalty = oddTotal
        ? (defDiff * midDiff * attDiff)
        : (Math.pow(defDiff, 4) * Math.pow(midDiff, 4) * Math.pow(attDiff, 4));


    // 7. SPECIALIST DISTRIBUTION PENALTY (CRITICAL!)
    // Even splits are MANDATORY for even total stars
    const defSpecDiff = Math.abs(teamAMetrics.defSpecialistCount - teamBMetrics.defSpecialistCount);
    const attSpecDiff = Math.abs(teamAMetrics.attSpecialistCount - teamBMetrics.attSpecialistCount);
    const midSpecDiff = Math.abs(teamAMetrics.midfielderCount - teamBMetrics.midfielderCount);

    const totalDefSpecialists = teamAMetrics.defSpecialistCount + teamBMetrics.defSpecialistCount;
    const totalAttSpecialists = teamAMetrics.attSpecialistCount + teamBMetrics.attSpecialistCount;
    const totalMidfielders = teamAMetrics.midfielderCount + teamBMetrics.midfielderCount;

    let specialistDistributionPenalty = 0;

    // Uneven specialist splits (CATASTROPHIC for even totals!)
    if (totalDefSpecialists % 2 === 0 && defSpecDiff > 0) {
        specialistDistributionPenalty += 0.35;
    } else if (totalDefSpecialists % 2 === 1 && defSpecDiff > 1) {
        specialistDistributionPenalty += 0.25; // Odd but 2+ diff is very bad
    }

    if (totalAttSpecialists % 2 === 0 && attSpecDiff > 0) {
        specialistDistributionPenalty += 0.35;
    } else if (totalAttSpecialists % 2 === 1 && attSpecDiff > 1) {
        specialistDistributionPenalty += 0.25;
    }

    if (totalMidfielders % 2 === 0 && midSpecDiff > 0) {
        specialistDistributionPenalty += 0.35; // Slightly less critical than def/att
    } else if (totalMidfielders % 2 === 1 && midSpecDiff > 1) {
        specialistDistributionPenalty += 0.25;
    }

    // SPECIALIST PAIRING PENALTY
    // Def + Att specialists should be on SAME team (they balance each other)
    let specialistPairingPenalty = 1;

    if (totalDefSpecialists > 0 && totalAttSpecialists > 0) {
        const teamAHasMoreDef = teamAMetrics.defSpecialistCount > teamBMetrics.defSpecialistCount;
        const teamAHasMoreAtt = teamAMetrics.attSpecialistCount > teamBMetrics.attSpecialistCount;

        // If opposite specialists lean to opposite teams, heavily penalize
        if (teamAHasMoreDef !== teamAHasMoreAtt && defSpecDiff > 0 && attSpecDiff > 0) {
            const avgImbalance = (defSpecDiff + attSpecDiff) / 2;
            specialistPairingPenalty = 1.0 - Math.min(weights.specialistPairing, avgImbalance * 0.25);
        }
    }

    let oddBestZonePenalty = 0.0;
    if (oddTotal) {
        specialistDistributionPenalty *= 0.5;
        const aIsSmaller = teamAClassifications.length < teamBClassifications.length;
        teamAClassifications.length + teamBClassifications.length
        const smaller = aIsSmaller ? teamAMetrics : teamBMetrics;
        const larger = aIsSmaller ? teamBMetrics : teamAMetrics;
        
        if (smaller.bestDefScore < larger.bestDefScore) {
            oddBestZonePenalty += 0.2;
        }

        if (smaller.bestMidScore < larger.bestMidScore) {
            oddBestZonePenalty += 0.2;
        }

        if (smaller.bestAttScore < larger.bestAttScore) {
            oddBestZonePenalty += 0.2;
        }        
        
        if (smaller.bestScore < larger.bestScore) {
            oddBestZonePenalty += 0.2;
        }
    }

    // 10. TOTAL PENALTY CALCULATION
    const totalPenalty = diffPenalty * specialistPairingPenalty * (1.0 - specialistDistributionPenalty) * (1.0 - oddBestZonePenalty);
    const penalty = Math.max(totalPenalty, 0.0);

    return {
        penalty,
        teamADefSpecialists: teamAMetrics.defSpecialistCount,
        teamBDefSpecialists: teamBMetrics.defSpecialistCount,
        teamAAttSpecialists: teamAMetrics.attSpecialistCount,
        teamBAttSpecialists: teamBMetrics.attSpecialistCount,
        teamAMidfielders: teamAMetrics.midfielderCount,
        teamBMidfielders: teamBMetrics.midfielderCount,
        teamAAllRounders: teamAMetrics.allRounderCount,
        teamBAllRounders: teamBMetrics.allRounderCount,
        // Component penalties for smart multiplier
        specialistDistributionPenalty,
        specialistPairingPenalty,
    };
}

/**
 * Analyzes star player distribution by zone for a team
 *
 * NOW FORMATION-AWARE: Recalculates best scores based on positions available in the formation.
 * This prevents issues like FB specialists being compared to CBs when the formation has no FBs.
 *
 * @param team Team to analyze
 * @param starThreshold Minimum score to be considered a star player
 * @returns Distribution breakdown by specialist type
 */
function analyzeTeamStarDistribution(
    team: FastTeam,
    _starThreshold: number // Unused - kept for API compatibility, uses pre-calculated player.isStarPlayer instead
): TeamStarDistribution {
    const classifications: StarZoneClassification[] = [];
    let defensiveSpecialists = 0;
    let attackingSpecialists = 0;
    let midfielders = 0;
    let allRounders = 0;

    // Build set of available positions from formation
    const availablePositions = new Set<Position>();
    if (team.formation) {
        for (const [pos, count] of Object.entries(team.formation.positions)) {
            if (count > 0) {
                availablePositions.add(pos as Position);
            }
        }
    }

    // Iterate through all positions and find star players
    // Recalculate classifications with FORMATION-AWARE best scores!
    for (const positionPlayers of team.positions) {
        for (const player of positionPlayers) {
            if (player.isStarPlayer && player.original.zoneFit) {
                // Recalculate classification with formation-aware best scores
                const classification = classifyPlayerByZone(player.original.zoneFit, availablePositions); // Fallback to pre-calculated if no formation

                classifications.push(classification);

                if (classification.specialistType === 'Defender') {
                    defensiveSpecialists++;
                } else if (classification.specialistType === 'Attacker') {
                    attackingSpecialists++;
                } else if (classification.specialistType === 'Midfielder') {
                    midfielders++;
                } else {
                    allRounders++;
                }
            }
        }
    }

    return {
        totalStars: classifications.length,
        defensiveSpecialists,
        attackingSpecialists,
        allRounders,
        midfielders,
        classifications,
    };
}

/**
 * Generates all combinations of size k from array of size n
 * Uses iterative approach to avoid stack overflow for large n
 *
 * @param n Total number of items
 * @param k Size of each combination
 * @returns Array of combinations (each combination is array of indices)
 */
function generateCombinations(n: number, k: number): number[][] {
    const results: number[][] = [];

    // Handle edge cases
    if (k > n || k <= 0) return [];
    if (k === n) return [Array.from({ length: n }, (_, i) => i)];

    // Start with first combination [0, 1, 2, ..., k-1]
    const current = Array.from({ length: k }, (_, i) => i);
    results.push([...current]);

    // Generate remaining combinations
    while (true) {
        // Find rightmost element that can be incremented
        let i = k - 1;
        while (i >= 0 && current[i] === n - k + i) {
            i--;
        }

        // If no element can be incremented, we're done
        if (i < 0) break;

        // Increment this element
        current[i]++;

        // Set all elements to the right
        for (let j = i + 1; j < k; j++) {
            current[j] = current[i] + (j - i);
        }

        results.push([...current]);
    }

    return results;
}

/**
 * Statistics about optimal star distribution for a player pool
 */
export interface OptimalDistributionStats {
    /** Best (highest) penalty achievable - the theoretical optimum */
    best: number;
    /** Worst (lowest) penalty from all possible splits */
    worst: number;
    /** Mean (average) penalty across all possible splits */
    mean: number;
    /** Number of star players in the pool */
    numStars: number;
    /** Total number of combinations tested */
    combinations: number;
}

/**
 * Calculates a shaped score that exponentially penalizes deviation from the optimal penalty.
 *
 * Maps actual penalty to a shaped score using the distribution statistics:
 * - Scores at or above the mean get HEAVILY penalized (exponential curve)
 * - The closer to the best (optimal) score, the higher the final multiplier
 * - Any deviation from best is aggressively penalized
 *
 * The shaping uses:
 * 1. Normalize actual penalty relative to [worst, mean, best] range
 * 2. Apply exponential scaling to heavily penalize non-optimal scores
 * 3. Additional exponential layer for extra harshness
 *
 * Example with stats {best: 0.95, mean: 0.65, worst: 0.20}:
 * - penalty = 0.95 (best)  → score ≈ 1.0 (perfect)
 * - penalty = 0.90         → score ≈ 0.6 (heavily penalized for small drop)
 * - penalty = 0.80         → score ≈ 0.2 (very heavily penalized)
 * - penalty = 0.65 (mean)  → score ≈ 0.05 (almost eliminated)
 * - penalty < mean         → score ≈ 0.0 (essentially eliminated)
 *
 * @param actualPenalty The actual star distribution penalty achieved (0-1, higher is better)
 * @param stats Optimal distribution statistics from calculateOptimalStarDistribution
 * @param exponent Exponential scaling factor (default 6.0 for very aggressive penalization)
 * @returns Shaped score multiplier (0-1, higher is better)
 */
export function calculateShapedPenaltyScore(
    actualPenalty: number,
    stats: OptimalDistributionStats,
    exponent: number = 6.0
): number {
    const { best, mean, worst } = stats;

    // Edge case: if best === worst, all scores are the same
    if (best === worst) {
        return 1.0;
    }

    // Edge case: if actual is at or above best, perfect score
    if (actualPenalty >= best) {
        return 1.0;
    }
    // Determine which range we're in and normalize accordingly
    let normalized: number;

    if (actualPenalty >= mean) {
        // ABOVE MEAN: Map from [mean, best] to [0.25, 1.0]
        // This is the "good" range where we're close to optimal
        const range = best - mean;
        const position = actualPenalty - mean;
        normalized = 0.25 + 0.75 * (position / range);
    } else {
        // BELOW MEAN: Map from [0, mean] to [0.0, 0.25]
        // This is the "bad" range where we're far from optimal
        const range = mean;
        const position = actualPenalty;
        normalized = 0.25 * (position / range);
    }

    const shaped = Math.pow(normalized, exponent);

    return shaped;
}

/**
 * Calculates optimal star distribution penalty for a given player pool
 *
 * This analyzes ALL star players to determine the theoretical best possible
 * distribution achievable with this specific set of players. This becomes the
 * baseline for comparing actual team distributions in the Monte Carlo loop.
 *
 * Returns statistics including best, worst, and mean penalties which can be used
 * to create shaped scoring curves that heavily penalize deviation from optimal.
 *
 * Approach:
 * 1. Identify all star players from the pool
 * 2. Classify each by their defensive/attacking lean
 * 3. Test ALL possible team splits combinatorially
 * 4. Return statistics including BEST, WORST, and MEAN penalties
 *
 * @param players All available players
 * @param config Balance configuration with star threshold
 * @returns Optimal distribution statistics
 */
export function calculateOptimalStarDistribution(
    players: FastPlayer[],
    config: BalanceConfiguration
): OptimalDistributionStats {
    const starThreshold = config.starPlayers.absoluteMinimum;

    // Identify all star players
    const starPlayers: FastPlayer[] = [];
    for (const player of players) {
        if (player.bestScore >= starThreshold) {
            starPlayers.push(player);
        }
    }

    // Build set of available positions from formation
    const formations = getFormationsForCount(Math.floor(players.length / 2))
    const availablePositions = new Set<Position>();

    formations.forEach((formation) => {
        for (const [pos, count] of Object.entries(formation.positions)) {
            const position = pos as Position;
            if (!availablePositions.has(position) && count > 0) {
                availablePositions.add(position);
            }
        }
    });

    // If no stars or only 1 star, optimal is perfect (1.0)
    if (starPlayers.length <= 1) {
        return {
            best: 1.0,
            worst: 1.0,
            mean: 1.0,
            numStars: starPlayers.length,
            combinations: 1,
        };
    }

    // Classify all stars
    const classifications = starPlayers.map(p => classifyPlayerByZone(p.original.zoneFit, availablePositions));

    // Find the ACTUAL optimal split by testing all possible combinations
    // For N stars, we need to split them into two teams as evenly as possible
    const numStars = classifications.length;
    const teamASize = Math.floor(numStars / 2);

    // Generate all possible combinations of teamASize stars
    const combinations = generateCombinations(numStars, teamASize);

    if (combinations.length === 0) {
        return {
            best: 1.0,
            worst: 1.0,
            mean: 1.0,
            numStars,
            combinations: 0,
        };
    }

    let bestPenalty = -Infinity;
    let worstPenalty = Infinity;
    let totalPenalties = 0;
    let zeroCount = 0;
    let indices = combinations.at(0);

    // Test each possible split
    for (const teamAIndices of combinations) {
        // Create team B with remaining indices
        const teamBIndices: number[] = [];
        for (let i = 0; i < numStars; i++) {
            if (!teamAIndices.includes(i)) {
                teamBIndices.push(i);
            }
        }

        // Calculate metrics for this split using shared logic
        const teamAClassifications = teamAIndices.map(i => classifications[i]);
        const teamBClassifications = teamBIndices.map(i => classifications[i]);

        const result = calculateStarDistributionPenalty(teamAClassifications, teamBClassifications);

        if (result.penalty > 0.3) {
            console.log("==============Start Optimal Run==================", result.penalty);
            let aAttSum = 0;
            let aMidSum = 0;
            let aDefSum = 0;
            let aBestScore = 0;

            let bAttSum = 0;
            let bMidSum = 0;
            let bDefSum = 0;
            let bBestScore = 0;

            teamAIndices.forEach((i => {
                console.log(`A => type: ${classifications[i].specialistType} | best: ${classifications[i].bestScore}`);

                aAttSum += classifications[i].bestAttackingScore;
                aMidSum += classifications[i].bestMidfieldScore;
                aDefSum += classifications[i].bestDefensiveScore;
                aBestScore += classifications[i].bestScore;
            }));

            teamBIndices.forEach((i => {
                console.log(`B => type: ${classifications[i].specialistType} | best: ${classifications[i].bestScore}`);

                bAttSum += classifications[i].bestAttackingScore;
                bMidSum += classifications[i].bestMidfieldScore;
                bDefSum += classifications[i].bestDefensiveScore;
                bBestScore += classifications[i].bestScore;
            }));

            console.log(`def  => A: ${aDefSum.toFixed(1)} | B: ${bDefSum.toFixed(1)} | Ratio: ${calculateBasicDifferenceRatio(aDefSum, bDefSum).toFixed(4)}`);
            console.log(`mid  => A: ${aMidSum.toFixed(1)} | B: ${bMidSum.toFixed(1)} | Ratio: ${calculateBasicDifferenceRatio(aMidSum, bMidSum).toFixed(4)}`);
            console.log(`att  => A: ${aAttSum.toFixed(1)} | B: ${bAttSum.toFixed(1)} | Ratio: ${calculateBasicDifferenceRatio(aAttSum, bAttSum).toFixed(4)}`);
            console.log(`best => A: ${aBestScore.toFixed(1)} | B: ${bBestScore.toFixed(1)} | Ratio: ${calculateBasicDifferenceRatio(aBestScore, bBestScore).toFixed(4)}`);

            console.log("==============End Optimal Run==================", result.penalty);
        }
        if (result.penalty > bestPenalty) {
            bestPenalty = result.penalty;
            indices = teamAIndices;
        }
        if (result.penalty < worstPenalty) {
            worstPenalty = result.penalty;
        }
        if (result.penalty === 0) {
            zeroCount++;
        }
        totalPenalties += result.penalty;
    }

    if (indices) {
        // Create team B with remaining indices
        const bIndices: number[] = [];
        for (let i = 0; i < numStars; i++) {
            if (!indices.includes(i)) {
                bIndices.push(i);
            }
        }

        indices.forEach((i => {
            console.log("A: ", classifications[i]);
        }));

        bIndices.forEach((i => {
            console.log("B: ", classifications[i]);
        }));
    }





    const avgPenalty = totalPenalties / combinations.length;

    console.log(`[calculateOptimalStarDistribution] ${numStars} stars, ${combinations.length} combinations`);
    console.log(`  Best: ${bestPenalty.toFixed(4)}, Worst: ${worstPenalty.toFixed(4)}, Avg: ${avgPenalty.toFixed(4)}`);
    console.log(`  Zero penalties: ${zeroCount}/${combinations.length} (${(100 * zeroCount / combinations.length).toFixed(1)}%)`);

    return {
        best: bestPenalty,
        worst: worstPenalty,
        mean: avgPenalty,
        numStars,
        combinations: combinations.length,
    };
}

/**
 * Calculates star zone specialization penalty using gradient-based directional clustering
 *
 * Uses a sophisticated multi-factor approach:
 * 1. Each star player has a "lean" value from -1 (defensive) to +1 (attacking)
 * 2. Weight each lean by player quality (higher rated stars matter more)
 * 3. Calculate team's overall quality-weighted directional bias
 * 4. Compare absolute defensive/attacking quality between teams
 * 5. Penalize when teams have opposing directional biases or quality imbalances
 *
 * This catches subtle imbalances like:
 * - Team A: 3 stars all slightly defensive-leaning (avg lean: -0.15)
 * - Team B: 3 stars that are perfectly balanced (avg lean: 0.0)
 * And also catches quality imbalances:
 * - Team A: 95-rated CB + 88-rated DM (high defensive quality)
 * - Team B: 87-rated balanced players (lower defensive quality)
 *
 * @param teamA First team
 * @param teamB Second team
 * @param config Balance configuration
 * @param debug Enable debug output
 * @returns Penalty multiplier from 0 (harsh penalty) to 1 (no penalty)
 */
export function calculateStarZonePenalty(
    teamA: FastTeam,
    teamB: FastTeam,
    config: BalanceConfiguration,
    debug: boolean
): number {
    const starThreshold = config.starPlayers.absoluteMinimum;

    const distA = analyzeTeamStarDistribution(teamA, starThreshold);
    const distB = analyzeTeamStarDistribution(teamB, starThreshold);

    // Use shared calculation logic
    const result = calculateStarDistributionPenalty(distA.classifications, distB.classifications);

    if (debug) {
        console.log('Star Zone Specialization Analysis (NEW 4-Category Position-Based System):');
        console.log('');
        console.log(`  Team A Stars: ${distA.totalStars} total`);
        console.log(`    Defensive specialists: ${result.teamADefSpecialists}`);
        console.log(`    Attacking specialists: ${result.teamAAttSpecialists}`);
        console.log(`    Midfielders: ${result.teamAMidfielders}`);
        console.log(`    All-rounders: ${result.teamAAllRounders}`);
        console.log('');

        console.log(`  Team B Stars: ${distB.totalStars} total`);
        console.log(`    Defensive specialists: ${result.teamBDefSpecialists}`);
        console.log(`    Attacking specialists: ${result.teamBAttSpecialists}`);
        console.log(`    Midfielders: ${result.teamBMidfielders}`);
        console.log(`    All-rounders: ${result.teamBAllRounders}`);
        console.log('');

        console.log(`  SPECIALIST COUNT IMBALANCES:`);
        console.log(`    Def specialist count diff: ${Math.abs(result.teamADefSpecialists - result.teamBDefSpecialists)}`);
        console.log(`    Att specialist count diff: ${Math.abs(result.teamAAttSpecialists - result.teamBAttSpecialists)}`);
        console.log(`    Midfielder count diff: ${Math.abs(result.teamAMidfielders - result.teamBMidfielders)}`);
        console.log('');

        console.log(`  FINAL PENALTY: ${result.penalty.toFixed(3)}`);
        console.log('');

        if (distA.classifications.length > 0) {
            console.log('  Team A Star Classifications:');
            for (const c of distA.classifications) {
                console.log(`    STAR: ${c.specialistType} (DEF:${c.bestDefensiveScore.toFixed(1)}, MID:${c.bestMidfieldScore.toFixed(1)}, ATT:${c.bestAttackingScore.toFixed(1)})`);
            }
        }

        if (distB.classifications.length > 0) {
            console.log('  Team B Star Classifications:');
            for (const c of distB.classifications) {
                console.log(`    STAR: ${c.specialistType} (DEF:${c.bestDefensiveScore.toFixed(1)}, MID:${c.bestMidfieldScore.toFixed(1)}, ATT:${c.bestAttackingScore.toFixed(1)})`);
            }
        }
    }

    return result.penalty;
}

/**
 * Calculate the full star distribution penalty breakdown for Monte Carlo optimization.
 * Returns the complete penalty breakdown object instead of just the penalty value.
 *
 * This is used by the Monte Carlo algorithm to apply smart penalty multipliers
 * that scale different penalty components differently.
 *
 * @param teamA Team A to analyze
 * @param teamB Team B to analyze
 * @param config Balance configuration
 * @returns Full penalty breakdown with all component penalties
 */
export function calculateStarDistributionBreakdown(
    teamA: FastTeam,
    teamB: FastTeam,
    config: BalanceConfiguration
): ReturnType<typeof calculateStarDistributionPenalty> {
    const starThreshold = config.starPlayers.absoluteMinimum;

    const distA = analyzeTeamStarDistribution(teamA, starThreshold);
    const distB = analyzeTeamStarDistribution(teamB, starThreshold);

    // Use shared calculation logic
    return calculateStarDistributionPenalty(distA.classifications, distB.classifications);
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
        talentDistributionBalance
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
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════════╗');
        console.log('║         PROFESSIONAL BALANCE METRICS (Calibrated System)         ║');
        console.log('╚═══════════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('PRIMARY METRICS (What users care about most):');
        console.log(`  Star Distribution:     ${metrics.talentDistributionBalance.toFixed(3)} × ${config.weights.primary.starDistribution.toFixed(2)} = ${(config.weights.primary.starDistribution * metrics.talentDistributionBalance).toFixed(3)}`);
        console.log(`  Score Balance:         ${metrics.positionalScoreBalance.toFixed(3)} × ${config.weights.primary.scoreBalance.toFixed(2)} = ${(config.weights.primary.scoreBalance * metrics.positionalScoreBalance).toFixed(3)}`);
        console.log(`  Peak Potential:          ${metrics.overallStrengthBalance.toFixed(3)} × ${config.weights.primary.peakPotential.toFixed(2)} = ${(config.weights.primary.peakPotential * metrics.overallStrengthBalance).toFixed(3)}`);
        console.log('');
        console.log('SECONDARY METRICS (Fine-tuning):');
        console.log(`  Zone Balance:        ${metrics.zonalDistributionBalance.toFixed(3)} × ${config.weights.secondary.zoneBalance.toFixed(2)} = ${(config.weights.secondary.zoneBalance * metrics.zonalDistributionBalance).toFixed(3)}`);
        console.log(`  All-Stat Balance:      ${metrics.allStatBalance.toFixed(3)} × ${config.weights.secondary.allStatBalance.toFixed(2)} = ${(config.weights.secondary.allStatBalance * metrics.allStatBalance).toFixed(3)}`);
        console.log(`  Energy:                ${metrics.energyBalance.toFixed(3)} × ${config.weights.secondary.energy.toFixed(2)} = ${(config.weights.secondary.energy * metrics.energyBalance).toFixed(3)}`);
        console.log(`  Creativity:            ${metrics.creativityBalance.toFixed(3)} × ${config.weights.secondary.creativity.toFixed(2)} = ${(config.weights.secondary.creativity * metrics.creativityBalance).toFixed(3)}`);
        console.log(`  Striker Quality:       ${metrics.strikerBalance.toFixed(3)} × ${config.weights.secondary.striker.toFixed(2)} = ${(config.weights.secondary.striker * metrics.strikerBalance).toFixed(3)}`);
        console.log('');
        console.log('─────────────────────────────────────────────────────────────────────');
        console.log(`  FINAL WEIGHTED SCORE:  ${finalScore.toFixed(3)}`);
        console.log('╚═══════════════════════════════════════════════════════════════════╝');
        console.log('');
    }

    return { score: finalScore, details: metrics };
}
