/**
 * Auto-Balance Metrics Calculation
 * 
 * Functions for calculating team balance metrics and scores.
 * 
 * @module auto-balance/metrics
 */

import type { FastTeam, BalanceConfig, BalanceMetrics } from "./types";

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
 * Calculates penalty for when all components favor the same team
 * The more components that favor one team, the harsher the penalty
 */
function calculateDirectionalImbalancePenalty(staminaDiff: number, workRateDiff: number): number {
    let staminaDirection = 0;
    let workRateDirection = 0;

    if (staminaDiff != 0) staminaDirection = staminaDiff > 0 ? 1 : -1;
    if (staminaDiff != 0) workRateDirection = workRateDiff > 0 ? 1 : -1;

    // this can range from 0 - 2
    const maxFavors = Math.abs(staminaDirection + workRateDirection);

    return 1.0 - (maxFavors * 0.25);
}

/**
 * Calculate difference ratio
 * 
 * Any time we have two values to compare for a balance ratio
 * We can use this - where 1.0 means perfectly even and 0.0 means the opposite
 */
function calculateBasicDifferenceRatio(a: number, b: number): number {
    const maxValue = Math.max(a, b);

    if (maxValue === 0) return 1;

    const differenceRatio = Math.abs(a - b) / maxValue;
    return 1 - differenceRatio;
}

/**
 * Calculates energy balance between teams
 * Uses smart system that heavily penalizes directional imbalances
 */
function calculateEnergyBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const staminaDiff = teamA.staminaScore - teamB.staminaScore;
    const workrateDiff = teamA.workrateScore - teamB.workrateScore;
    const inbalanceCompensation = calculateDirectionalImbalancePenalty(staminaDiff, workrateDiff);

    const staminaRatio = calculateBasicDifferenceRatio(teamA.staminaScore, teamB.staminaScore);
    const workrateRatio = calculateBasicDifferenceRatio(teamA.workrateScore, teamB.workrateScore);

    const rawCombined = staminaRatio * workrateRatio * inbalanceCompensation;

    // Apply harsh power scaling to penalize imbalances
    // pow(0.95, 4) = 0.815, pow(0.90, 4) = 0.656, pow(0.80, 4) = 0.410
    const energyBalanceRatio = Math.pow(rawCombined, 4);

    if (debug) {
        console.log('Energy Balance:');
        console.log(formatComparison('Stamina', teamA.staminaScore, teamB.staminaScore, staminaRatio));
        console.log(formatComparison('Workrate', teamA.workrateScore, teamB.workrateScore, workrateRatio));
        console.log(`  Directional Penalty: ${inbalanceCompensation.toFixed(3)}`);
        console.log(`  Raw Combined: ${rawCombined.toFixed(3)}`);
        console.log(`  Scaled (^4): ${energyBalanceRatio.toFixed(3)}`);
    }

    // Apply directional penalty to the combined score
    return energyBalanceRatio;
}

/**
 * Calculates overall team strength balance by comparing peak potential
 *
 * Peak potential represents the theoretical maximum strength each team could achieve.
 * A value of 1.0 means both teams have equal peak potential (perfectly balanced).
 * A value closer to 0 means one team has significantly higher peak potential.
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculateOverallStrengthBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const rawRatio = calculateBasicDifferenceRatio(teamA.peakPotential, teamB.peakPotential);

    // Apply harsh power scaling to penalize imbalances
    // pow(0.95, 4) = 0.815, pow(0.90, 4) = 0.656, pow(0.80, 4) = 0.410
    const strengthBalanceRatio = Math.pow(rawRatio, 4);

    if (debug) {
        console.log('Overall Strength Balance (Peak Potential):');
        console.log(formatComparison('Peak', teamA.peakPotential, teamB.peakPotential, rawRatio));
        console.log(`  Scaled (^4): ${strengthBalanceRatio.toFixed(3)}`);
    }

    return strengthBalanceRatio;
}

/**
 * Calculates positional score balance by comparing actual team scores
 *
 * This measures how balanced the teams are based on players' actual scores
 * in their assigned positions (not theoretical peak).
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculatePositionalScoreBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const rawRatio = calculateBasicDifferenceRatio(teamA.totalScore, teamB.totalScore);

    // Apply harsh power scaling to penalize imbalances
    // pow(0.95, 4) = 0.815, pow(0.90, 4) = 0.656, pow(0.80, 4) = 0.410
    const positionalBalanceRatio = Math.pow(rawRatio, 4);

    if (debug) {
        console.log('Positional Score Balance:');
        console.log(formatComparison('Total Score', teamA.totalScore, teamB.totalScore, rawRatio));
        console.log(`  Scaled (^4): ${positionalBalanceRatio.toFixed(3)}`);
    }

    return positionalBalanceRatio;
}

/**
 * Calculates the inner variance of a team's zones
 *
 * @param team team
 * @returns Balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
const calculateSingleTeamZonalBalance = (team: FastTeam): number => {
    // Extract non-goalkeeper zones: Defense (1), Midfield (2), Attack (3)
    const defenseZoneScore = team.zonePeakScores[1];
    const midfieldZoneScore = team.zonePeakScores[2];
    const attackZoneScore = team.zonePeakScores[3];

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
 * @param teamA First team
 * @param teamB Second team
 * @returns Average balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculateZonalDistributionBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const N = Math.min(teamA.zoneScores.length);

    let totalImbalance = 1.0;
    const zoneRatios: number[] = [];

    for (let zoneIdx = 1; zoneIdx < N; zoneIdx++) {
        const a = teamA.zoneScores[zoneIdx];
        const b = teamB.zoneScores[zoneIdx];
        const ratio = calculateBasicDifferenceRatio(a, b);
        zoneRatios.push(ratio);
        totalImbalance *= ratio;
    }

    const teamAZonalBalance = calculateSingleTeamZonalBalance(teamA);
    const teamBZonalBalance = calculateSingleTeamZonalBalance(teamB);
    const internalVarianceRatio = calculateBasicDifferenceRatio(teamAZonalBalance, teamBZonalBalance);

    const rawCombined = totalImbalance * internalVarianceRatio;

    // Apply harsh power scaling to penalize imbalances
    // pow(0.95, 4) = 0.815, pow(0.90, 4) = 0.656, pow(0.80, 4) = 0.410
    const zonalBalanceRatio = Math.pow(rawCombined, 4);

    if (debug) {
        console.log('Zonal Distribution Balance:');
        console.log(formatZoneScores(teamA, teamB));
        console.log(formatZonePeakScores(teamA, teamB));
        console.log('  Per-Zone Balance (DEF, MID, ATT): ' + zoneRatios.map(r => r.toFixed(3)).join(', '));
        console.log(`  Team A Internal Balance: ${teamAZonalBalance.toFixed(3)}`);
        console.log(`  Team B Internal Balance: ${teamBZonalBalance.toFixed(3)}`);
        console.log(`  Raw Combined: ${rawCombined.toFixed(3)}`);
        console.log(`  Scaled (^4): ${zonalBalanceRatio.toFixed(3)}`);
    }

    return zonalBalanceRatio;
}

/**
 * Calculates zonal distribution balance within each team
 *
 * This measures how evenly distributed the strength is across zones
 * (Defense, Midfield, Attack) within each team. A well-balanced team
 * has similar strength across all zones rather than being heavily
 * concentrated in one area.
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Average balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculateCreativityBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const rawRatio = calculateBasicDifferenceRatio(teamA.creativityScore, teamB.creativityScore);

    // Apply harsh power scaling to penalize imbalances
    // pow(0.95, 4) = 0.815, pow(0.90, 4) = 0.656, pow(0.80, 4) = 0.410
    const creativityBalanceRatio = Math.pow(rawRatio, 4);

    if (debug) {
        console.log('Creativity Balance:');
        console.log(formatComparison('Creativity', teamA.creativityScore, teamB.creativityScore, rawRatio));
        console.log(`  Scaled (^4): ${creativityBalanceRatio.toFixed(3)}`);
    }

    return creativityBalanceRatio;
}

/**
 * Calculates comprehensive balance metrics
 *
 * A well-balanced team assignment needs to satisfy multiple criteria:
 * - Similar overall strength (peak potential)
 * - Similar positional scores
 * - Balanced internal zone distribution
 * - Similar attack/defense distribution
 * - Similar energy levels (stamina and work rates)
 *
 * @param teamA First team
 * @param teamB Second team
 * @param config Balance configuration with weights for each metric
 * @returns Combined score and detailed metrics
 */
export function calculateMetrics(
    teamA: FastTeam,
    teamB: FastTeam,
    config: BalanceConfig,
    debug: boolean
): { score: number; details: BalanceMetrics } {
    // Calculate each metric independently
    const overallStrengthBalance = calculateOverallStrengthBalance(teamA, teamB, debug);
    const positionalScoreBalance = calculatePositionalScoreBalance(teamA, teamB, debug);
    const zonalDistributionBalance = calculateZonalDistributionBalance(teamA, teamB, debug);
    const energyBalance = calculateEnergyBalance(teamA, teamB, debug);
    const creativityBalance = calculateCreativityBalance(teamA, teamB, debug);

    // Assemble detailed metrics
    const metrics: BalanceMetrics = {
        overallStrengthBalance,
        positionalScoreBalance,
        zonalDistributionBalance,
        energyBalance,
        creativityBalance
    };

    // Calculate weighted score based on config
    const weightedScore =
        config.weights.overallStrengthBalance * metrics.overallStrengthBalance +
        config.weights.positionalScoreBalance * metrics.positionalScoreBalance +
        config.weights.zonalDistributionBalance * metrics.zonalDistributionBalance +
        config.weights.energyBalance * metrics.energyBalance +
        config.weights.creativityBalance * metrics.creativityBalance;

    if (debug) {
        console.log('');
        console.log('================================================================');
        console.log('FINAL BALANCE METRICS SUMMARY');
        console.log('================================================================');
        console.log(`  Overall Strength:         ${metrics.overallStrengthBalance.toFixed(3)} (weight: ${config.weights.overallStrengthBalance.toFixed(2)}) = ${(config.weights.overallStrengthBalance * metrics.overallStrengthBalance).toFixed(3)}`);
        console.log(`  Positional Score:         ${metrics.positionalScoreBalance.toFixed(3)} (weight: ${config.weights.positionalScoreBalance.toFixed(2)}) = ${(config.weights.positionalScoreBalance * metrics.positionalScoreBalance).toFixed(3)}`);
        console.log(`  Zonal Distribution:       ${metrics.zonalDistributionBalance.toFixed(3)} (weight: ${config.weights.zonalDistributionBalance.toFixed(2)}) = ${(config.weights.zonalDistributionBalance * metrics.zonalDistributionBalance).toFixed(3)}`);
        console.log(`  Energy Balance:           ${metrics.energyBalance.toFixed(3)} (weight: ${config.weights.energyBalance.toFixed(2)}) = ${(config.weights.energyBalance * metrics.energyBalance).toFixed(3)}`);
        console.log(`  Creativity Balance:       ${metrics.creativityBalance.toFixed(3)} (weight: ${config.weights.creativityBalance.toFixed(2)}) = ${(config.weights.creativityBalance * metrics.creativityBalance).toFixed(3)}`);
        console.log('----------------------------------------------------------------');
        console.log(`  FINAL WEIGHTED SCORE:     ${weightedScore.toFixed(3)}`);
        console.log('================================================================');
        console.log('');
    }

    return { score: weightedScore, details: metrics };
}