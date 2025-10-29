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
    if (workRateDiff != 0) workRateDirection = workRateDiff > 0 ? 1 : -1;

    // this can range from 0 - 2
    const maxFavors = Math.abs(staminaDirection + workRateDirection);

    return 1.0 - (maxFavors * 0.3);
}

/**
 * Calculate difference ratio
 * 
 * Any time we have two values to compare for a balance ratio
 * We can use this - where 1.0 means perfectly even and 0.0 means the opposite
 */
function calculateBasicDifferenceRatio(a: number, b: number): number {
    const minValue = Math.min(a, b);

    if (minValue === 0) return 1;

    const differenceRatio = Math.abs(a - b) / minValue;
    return 1 - differenceRatio;
}

/**
 * Calculates penalty when one team dominates multiple zones
 *
 * Uses epsilon threshold to ignore very small differences (neutral zones).
 * Penalizes when zones cluster directionally (e.g., team A wins DEF+ATT, team B only wins MID).
 *
 * @param teamA First team
 * @param teamB Second team
 * @param epsilon Ratio threshold above which zones are considered neutral (default 0.985)
 * @returns Penalty multiplier from 0 (harsh penalty) to 1 (no penalty)
 */
function calculateZoneDirectionalPenalty(
    teamA: FastTeam,
    teamB: FastTeam,
    epsilon: number = 0.99
): { penalty: number; teamAWins: number; teamBWins: number; neutrals: number; winners: string[] } {
    const zoneNames = ['DEF', 'MID', 'ATT'];
    const zoneIndices = [1, 2, 3]; // Exclude GK (index 0)

    let teamAWins = 0;
    let teamBWins = 0;
    let neutrals = 0;
    let sumA = 0;
    let sumB = 0;
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

        sumA += scoreA;
        sumB += scoreB;
    }

    // Calculate penalty based on directional clustering
    const maxWins = Math.max(teamAWins, teamBWins);

    let penalty = 1.0;
    if (maxWins === 3) {
        // 3-0 split: one team dominates all zones (harsh)
        penalty = 0.1; // 40% penalty
    } else if ((maxWins === 2 && neutrals === 0) || (maxWins === 1 && neutrals === 2)) {
        // 2-1 split: moderate directional imbalance
        penalty = Math.pow(calculateBasicDifferenceRatio(sumA, sumB), 4);
    } else if (maxWins === 2 && neutrals === 1) {
        // 2-0-1 split: two zones favor one team, one neutral
        penalty = 0.4; // 10% penalty
    } else if (maxWins > 0) {
        // 1-1-1 split: cancel out two zones
        penalty = Math.pow(calculateBasicDifferenceRatio(sumA, sumB), 2);
    }
    // else: balanced distributions ( 0-0-3, etc.) get no penalty (1.0)

    return { penalty, teamAWins, teamBWins, neutrals, winners };
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

    const rawCombined = inbalanceCompensation * (staminaRatio + workrateRatio) / 2;

    // Apply harsh power scaling to penalize imbalances
    // pow(0.95, 4) = 0.815, pow(0.90, 4) = 0.656, pow(0.80, 4) = 0.410
    const energyBalanceRatio = Math.pow(rawCombined, 2);

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
    const strengthBalanceRatio = Math.pow(rawRatio, 3);

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
    const difference = calculateBasicDifferenceRatio(teamA.totalScore, teamB.totalScore);
    const efficiency = calculateBasicDifferenceRatio(teamA.totalScore + teamB.totalScore, teamA.peakPotential + teamB.peakPotential);

    // Apply harsh power scaling to penalize imbalances
    // pow(0.95, 4) = 0.815, pow(0.90, 4) = 0.656, pow(0.80, 4) = 0.410
    const positionalBalanceRatio = Math.pow(difference * efficiency, 2);

    if (debug) {
        console.log('Positional Score Balance:');
        console.log(formatComparison('Total Score', teamA.totalScore, teamB.totalScore, difference));
        console.log(formatComparison('Efficiency Score', teamA.totalScore + teamB.totalScore, teamA.peakPotential + teamB.peakPotential, efficiency));
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
    const defenseZoneScore = team.zoneScores[1];
    const midfieldZoneScore = team.zoneScores[2];
    const attackZoneScore = team.zoneScores[3];

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
    const rawZoneRatios: number[] = [];
    const scaledZoneRatios: number[] = [];

    // Apply power scaling to EACH zone individually
    for (let zoneIdx = 1; zoneIdx < N; zoneIdx++) {
        const a = teamA.zonePeakScores[zoneIdx];
        const b = teamB.zonePeakScores[zoneIdx];
        const rawRatio = calculateBasicDifferenceRatio(a, b);

        // Apply harsh power scaling to each zone ratio individually
        // pow(0.95, 4) = 0.815, pow(0.90, 4) = 0.656, pow(0.80, 4) = 0.410
        const scaledRatio = Math.pow(rawRatio, 2);

        rawZoneRatios.push(rawRatio);
        scaledZoneRatios.push(scaledRatio);
        totalImbalance *= scaledRatio;
    }

    const teamAZonalBalance = calculateSingleTeamZonalBalance(teamA);
    const teamBZonalBalance = calculateSingleTeamZonalBalance(teamB);
    const internalVarianceRatio = calculateBasicDifferenceRatio(teamAZonalBalance, teamBZonalBalance);

    // Calculate zone directional penalty (detects 2-1 or 3-0 zone clustering)
    const directionality = calculateZoneDirectionalPenalty(teamA, teamB);

    // Combine all factors (no additional power scaling - already scaled per zone)
    const zonalBalanceRatio = totalImbalance * internalVarianceRatio * directionality.penalty;

    if (debug) {
        console.log('Zonal Distribution Balance:');
        console.log(formatZoneScores(teamA, teamB));
        console.log(formatZonePeakScores(teamA, teamB));
        console.log('  Per-Zone Raw Ratios (DEF, MID, ATT): ' + rawZoneRatios.map(r => r.toFixed(3)).join(', '));
        console.log('  Per-Zone Scaled (^4) (DEF, MID, ATT): ' + scaledZoneRatios.map(r => r.toFixed(3)).join(', '));
        console.log(`  Zone Winners: ${directionality.winners.join(', ')}`);
        console.log(`  Directional Split: A=${directionality.teamAWins}, B=${directionality.teamBWins}, Neutral=${directionality.neutrals}`);
        console.log(`  Zone Directional Penalty: ${directionality.penalty.toFixed(3)}`);
        console.log(`  Team A Internal Balance: ${teamAZonalBalance.toFixed(3)}`);
        console.log(`  Team B Internal Balance: ${teamBZonalBalance.toFixed(3)}`);
        console.log(`  Final Zonal Balance: ${zonalBalanceRatio.toFixed(3)}`);
    }

    return zonalBalanceRatio;
}

/**
 * Calculates all-stat balance by summing every individual player stat
 *
 * This is a simple "sanity check" metric that loops through all players
 * on each team and sums up ALL their individual stats (anticipation,
 * composure, speed, strength, stamina, workrate, etc.). Ensures overall
 * raw player value is balanced regardless of positioning or role.
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculateAllStatBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    // Sum all individual player stats for team A
    let teamATotal = 0;
    let teamAPlayerCount = 0;
    for (const positionPlayers of teamA.positions) {
        for (const player of positionPlayers) {
            if (player.original.stats) {
                // Sum all stat values from the player's stats object
                teamATotal += Object.values(player.original.stats).reduce((sum, val) => sum + val, 0);
                teamAPlayerCount++;
            }
        }
    }

    // Sum all individual player stats for team B
    let teamBTotal = 0;
    let teamBPlayerCount = 0;
    for (const positionPlayers of teamB.positions) {
        for (const player of positionPlayers) {
            if (player.original.stats) {
                // Sum all stat values from the player's stats object
                teamBTotal += Object.values(player.original.stats).reduce((sum, val) => sum + val, 0);
                teamBPlayerCount++;
            }
        }
    }

    const rawRatio = calculateBasicDifferenceRatio(teamATotal, teamBTotal);

    // Apply harsh power scaling to penalize imbalances
    // pow(0.95, 4) = 0.815, pow(0.90, 4) = 0.656, pow(0.80, 4) = 0.410
    const allStatBalanceRatio = Math.pow(rawRatio, 7);

    if (debug) {
        console.log('All-Stat Balance (Sum of Every Player Stat):');
        console.log(formatComparison('Total All Stats', teamATotal, teamBTotal, rawRatio));
        console.log(`  Team A: ${teamAPlayerCount} players, avg ${(teamATotal / teamAPlayerCount).toFixed(1)} total stats/player`);
        console.log(`  Team B: ${teamBPlayerCount} players, avg ${(teamBTotal / teamBPlayerCount).toFixed(1)} total stats/player`);
        console.log(`  Scaled (^4): ${allStatBalanceRatio.toFixed(3)}`);
    }

    return allStatBalanceRatio;
}

/**
 * Calculates creativity balance between teams
 *
 * This measures how evenly distributed the creativity stats are
 * between teams.
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Average balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculateCreativityBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const rawRatio = calculateBasicDifferenceRatio(teamA.creativityScore, teamB.creativityScore);

    // Apply harsh power scaling to penalize imbalances
    // pow(0.95, 4) = 0.815, pow(0.90, 4) = 0.656, pow(0.80, 4) = 0.410
    const creativityBalanceRatio = Math.pow(rawRatio, 1);

    if (debug) {
        console.log('Creativity Balance:');
        console.log(formatComparison('Creativity', teamA.creativityScore, teamB.creativityScore, rawRatio));
        console.log(`  Scaled (^4): ${creativityBalanceRatio.toFixed(3)}`);
    }

    return creativityBalanceRatio;
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
    for (const positionPlayers of team.positions) {
        for (const player of positionPlayers) {
            // Use the player's assigned position score
            if (player.assignedPosition >= 0) {
                playerScores.push(player.scores[player.assignedPosition]);
            }
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

    // Apply harsh power scaling to heavily penalize distribution mismatches
    // pow(0.95, 3) = 0.857, pow(0.90, 3) = 0.729, pow(0.80, 3) = 0.512
    const talentDistributionRatio = Math.pow(rawRatio, 1);

    if (debug) {
        console.log('Talent Distribution Balance (Player Score Std Dev):');
        console.log(formatComparison('Std Dev', teamAStdDev, teamBStdDev, rawRatio));
        console.log(`  Team A: ${teamAStdDev > teamBStdDev ? 'More spiky' : 'More flat'} talent distribution`);
        console.log(`  Team B: ${teamBStdDev > teamAStdDev ? 'More spiky' : 'More flat'} talent distribution`);
        console.log(`  Scaled (^3): ${talentDistributionRatio.toFixed(3)}`);
    }

    return talentDistributionRatio;
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
    // Calculate each metric independently (always calculate all metrics)
    const overallStrengthBalance = calculateOverallStrengthBalance(teamA, teamB, debug);
    const positionalScoreBalance = calculatePositionalScoreBalance(teamA, teamB, debug);
    const zonalDistributionBalance = calculateZonalDistributionBalance(teamA, teamB, debug);
    const energyBalance = calculateEnergyBalance(teamA, teamB, debug);
    const creativityBalance = calculateCreativityBalance(teamA, teamB, debug);
    const allStatBalance = calculateAllStatBalance(teamA, teamB, debug);
    const talentDistributionBalance = calculateTalentDistributionBalance(teamA, teamB, debug);

    // Assemble detailed metrics
    const metrics: BalanceMetrics = {
        overallStrengthBalance,
        positionalScoreBalance,
        zonalDistributionBalance,
        energyBalance,
        creativityBalance,
        allStatBalance,
        talentDistributionBalance
    };

    // Calculate weighted score based on config
    const weightedScore =
        config.weights.overallStrengthBalance * metrics.overallStrengthBalance +
        config.weights.positionalScoreBalance * metrics.positionalScoreBalance +
        config.weights.zonalDistributionBalance * metrics.zonalDistributionBalance +
        config.weights.energyBalance * metrics.energyBalance +
        config.weights.creativityBalance * metrics.creativityBalance +
        config.weights.allStatBalance * metrics.allStatBalance +
        config.weights.talentDistributionBalance * metrics.talentDistributionBalance;

    // Calculate consistency penalty to favor results where all metrics are close to 1.0
    const metricValues = [
        metrics.overallStrengthBalance,
        metrics.positionalScoreBalance,
        metrics.zonalDistributionBalance,
        metrics.energyBalance,
        metrics.creativityBalance,
        metrics.allStatBalance,
        metrics.talentDistributionBalance
    ];

    // Calculate standard deviation of the metrics
    const mean = metricValues.reduce((a, b) => a + b, 0) / metricValues.length;
    const variance = metricValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / metricValues.length;
    const stdDev = Math.sqrt(variance);

    // Apply consistency penalty - higher stdDev = worse score
    const consistencyPenalty = stdDev * config.consistencyPenaltyWeight;
    const finalScore = weightedScore - consistencyPenalty;

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
        console.log(`  All-Stat Balance:         ${metrics.allStatBalance.toFixed(3)} (weight: ${config.weights.allStatBalance.toFixed(2)}) = ${(config.weights.allStatBalance * metrics.allStatBalance).toFixed(3)}`);
        console.log(`  Talent Distribution:      ${metrics.talentDistributionBalance.toFixed(3)} (weight: ${config.weights.talentDistributionBalance.toFixed(2)}) = ${(config.weights.talentDistributionBalance * metrics.talentDistributionBalance).toFixed(3)}`);
        console.log('----------------------------------------------------------------');
        console.log(`  WEIGHTED SCORE:           ${weightedScore.toFixed(3)}`);
        console.log('');
        console.log(`  Consistency Analysis:`);
        console.log(`    Metric Mean:            ${mean.toFixed(3)}`);
        console.log(`    Metric Std Dev:         ${stdDev.toFixed(3)}`);
        console.log(`    Consistency Penalty:    ${consistencyPenalty.toFixed(3)} (weight: ${config.consistencyPenaltyWeight.toFixed(2)})`);
        console.log('----------------------------------------------------------------');
        console.log(`  FINAL SCORE:              ${finalScore.toFixed(3)}`);
        console.log('================================================================');
        console.log('');
    }

    return { score: finalScore, details: metrics };
}