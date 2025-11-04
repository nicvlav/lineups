/**
 * Auto-Balance Metrics Calculation
 *
 * Professional metrics using calibrated transformations instead of arbitrary power scaling.
 * All thresholds and formulas are centralized in DEFAULT_BALANCE_CONFIG.
 *
 * @module auto-balance/metrics
 */

import type { FastTeam, BalanceConfig, BalanceMetrics } from "./types";
import type { BalanceConfiguration } from "./metrics-config"
import type { Formation } from "@/data/position-types";
import { ZONE_POSITIONS, INDEX_TO_POSITION, getMidfieldPenaltyPower, getInternalVariancePower, getInternalZoneSkillPower } from "./constants";
import { calibratedScore, Steepness } from "./metric-transformations";
import { DEFAULT_BALANCE_CONFIG } from "./metrics-config";
import { getStarCount } from "./debug-tools";

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
 * Calculates penalty for when all components favor the same team
 * The more components that favor one team, the harsher the penalty
 *
 * Uses configured penalty per component instead of magic number (0.3)
 */
function calculateDirectionalImbalancePenalty(a1: number, a2: number, b1: number, b2: number): number {
    const aDiff = a1 - a2;
    const bDiff = b1 - b2;

    let aDir = 0;
    let bDir = 0;

    if (aDiff != 0) aDir = aDiff > 0 ? 1 : -1;
    if (bDiff != 0) bDir = bDir > 0 ? 1 : -1;

    // this can range from 0 - 2
    const maxFavors = Math.abs(aDir + bDir);

    if (maxFavors == 0) return 1.0;

    const ratio = Math.min(Math.abs(aDiff + bDiff) / Math.max(a1, a2, b1, b2), 1.0);
    const scaled = Math.pow(1 - ratio, Steepness.Moderate);

    if (maxFavors == 1) return 0.8 + 0.2 * scaled;

    return 0.4 + 0.6 * scaled;
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
 * Calculates energy balance between teams
 * Uses calibrated scoring system with configured thresholds
 */
function calculateEnergyBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const inbalanceCompensation = calculateDirectionalImbalancePenalty(teamA.staminaScore, teamB.staminaScore, teamA.workrateScore, teamB.workrateScore);

    const staminaRatio = calculateBasicDifferenceRatio(teamA.staminaScore, teamB.staminaScore);
    const workrateRatio = calculateBasicDifferenceRatio(teamA.workrateScore, teamB.workrateScore);

    const rawCombined = inbalanceCompensation * 0.5 + ((staminaRatio + workrateRatio) / 2) * 0.5;

    // Use calibrated scoring instead of arbitrary Math.pow(rawCombined, 2)
    const energyBalanceRatio = calibratedScore(
        rawCombined,
        DEFAULT_BALANCE_CONFIG.thresholds.energy,
        Steepness.Gentle
    );

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.energy;
        console.log('Energy Balance:');
        console.log(formatComparison('Stamina', teamA.staminaScore, teamB.staminaScore, staminaRatio));
        console.log(formatComparison('Workrate', teamA.workrateScore, teamB.workrateScore, workrateRatio));
        console.log(`  Directional Penalty: ${inbalanceCompensation.toFixed(3)}`);
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
    const aPeakScores = teamA.peakPotential;
    const bPeakScores = teamB.peakPotential;

    const aSumScores = teamA.totalScore - teamA.zoneScores[0] - teamA.zoneScores[0];
    const bSumScores = teamB.totalScore - teamB.zoneScores[0] - teamB.zoneScores[0];

    const aRatio = calculateBasicDifferenceRatio(aSumScores, aPeakScores);
    const bRatio = calculateBasicDifferenceRatio(bSumScores, bPeakScores);
    const diff = calculateBasicDifferenceRatio(aRatio, bRatio);

    const efficiency = calculateBasicDifferenceRatio(aSumScores + bSumScores, aPeakScores + bPeakScores);

    // Use calibrated scoring instead of arbitrary Math.pow(diff, 16) and Math.pow(efficiency, 0.5)
    const diffScore = calibratedScore(
        diff,
        DEFAULT_BALANCE_CONFIG.thresholds.scoreBalance,
        Steepness.VerySteep
    );
    const efficiencyScore = calibratedScore(
        efficiency,
        DEFAULT_BALANCE_CONFIG.thresholds.scoreBalance,
        Steepness.Gentle
    );

    // Use configured weights instead of magic numbers (0.8, 0.2)
    const formula = DEFAULT_BALANCE_CONFIG.formulas.positionalBalance;
    const positionalBalanceRatio = diffScore * formula.diffWeight + efficiencyScore * formula.efficiencyWeight;

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.scoreBalance;
        console.log('Positional Score Balance:');
        console.log(formatComparison('A     | Peak vs Placed | ', aPeakScores, aSumScores, aRatio));
        console.log(formatComparison('B     | Peak vs Placed | ', bPeakScores, bSumScores, bRatio));
        console.log(formatComparison('Diff  | Peak vs Placed | ', aRatio, bRatio, diff));
        console.log(formatComparison('Total | Peak vs Placed | ', aSumScores + bSumScores, bPeakScores + bPeakScores, efficiency));
        console.log(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        console.log(`  Diff Score: ${diffScore.toFixed(3)} (weight: ${formula.diffWeight})`);
        console.log(`  Efficiency Score: ${efficiencyScore.toFixed(3)} (weight: ${formula.efficiencyWeight})`);
        console.log(`  Final: ${positionalBalanceRatio.toFixed(3)}`);
    }

    return positionalBalanceRatio;
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
    const scaledZoneRatios: number[] = [];

    // Apply calibrated scoring to EACH zone individually
    for (let zoneIdx = 1; zoneIdx < N; zoneIdx++) {
        const a = teamA.zoneScores[zoneIdx];
        const b = teamB.zoneScores[zoneIdx];
        const rawRatio = calculateBasicDifferenceRatio(a, b);

        // Use calibrated scoring instead of no-op Math.pow(rawRatio, 1)
        const scaledRatio = calibratedScore(
            rawRatio,
            DEFAULT_BALANCE_CONFIG.thresholds.zoneBalance,
            Steepness.Gentle
        );

        rawZoneRatios.push(rawRatio);
        scaledZoneRatios.push(scaledRatio);
        totalImbalance *= scaledRatio;
    }

    const teamAZonalBalance = calculateSingleTeamZonalBalance(teamA.zonePeakScores);
    const teamBZonalBalance = calculateSingleTeamZonalBalance(teamA.zonePeakScores);
    const internalSkillRatio = calculateBasicDifferenceRatio(teamAZonalBalance, teamBZonalBalance);

    // Calculate zone directional penalty (detects 2-1 or 3-0 zone clustering)
    const directionality = calculateZoneDirectionalPenalty(teamA, teamB);

    // Combine all factors
    const zonalBalanceRatio = directionality.penalty * (totalImbalance + internalSkillRatio) / 2;

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.zoneBalance;
        console.log('Zonal Distribution Balance:');
        console.log(formatZoneScores(teamA, teamB));
        console.log(formatZonePeakScores(teamA, teamB));
        console.log(formatZoneAverageRatings(teamA, teamB));
        console.log('  Per-Zone Raw Ratios (DEF, MID, ATT): ' + rawZoneRatios.map(r => r.toFixed(3)).join(', '));
        console.log('  Per-Zone Calibrated Scores (DEF, MID, ATT): ' + scaledZoneRatios.map(r => r.toFixed(3)).join(', '));
        console.log(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
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
        console.log(`  Team A: ${teamAPlayerCount} players, avg ${(teamATotal / teamAPlayerCount).toFixed(1)} total stats/player`);
        console.log(`  Team B: ${teamBPlayerCount} players, avg ${(teamBTotal / teamBPlayerCount).toFixed(1)} total stats/player`);
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
 * This measures how evenly distributed the striker stats are
 * between teams.
 *
 * Uses calibrated scoring instead of arbitrary Math.pow(ratio, 9).
 *
 * @param teamA First team
 * @param teamB Second team
 * @returns Average balance score from 0 (imbalanced) to 1 (perfectly balanced)
 */
function calculateStrikerBalance(teamA: FastTeam, teamB: FastTeam, debug: boolean): number {
    const rawRatio = calculateBasicDifferenceRatio(teamA.strikerScore, teamB.strikerScore);

    // Use calibrated scoring instead of arbitrary Math.pow(rawRatio, 9)
    const strikerBalanceRatio = calibratedScore(
        rawRatio,
        DEFAULT_BALANCE_CONFIG.thresholds.striker,
        Steepness.VerySteep
    );

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.striker;
        console.log('Striker Balance:');
        console.log(formatComparison('Striker', teamA.strikerScore, teamB.strikerScore, rawRatio));
        console.log(`  Thresholds: Perfect≥${t.perfect}, Acceptable≥${t.acceptable}, Poor≤${t.poor}`);
        console.log(`  Calibrated Score: ${strikerBalanceRatio.toFixed(3)}`);
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
    const sums = team.zonePeakScores.map((val, i) => {
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
function calculateMidfieldPreferencePenalty(zoneAverages: Float32Array, penaltyStrength: number, numPlayers: number = 22): number {
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

    // Calculate how far midfield is from the max
    const gap = maxZoneAvg - midAvg;

    // Calculate the relative gap (as a percentage of the max)
    const relativeGap = gap / maxZoneAvg;

    // Apply penalty based on the gap and the strength parameter
    // penaltyStrength controls how harsh the penalty is
    // relativeGap determines the magnitude based on the actual difference
    const penalty = 1.0 - (relativeGap * penaltyStrength);

    // Get dynamic power based on number of players
    // More players = harsher penalty (higher power)
    const power = getMidfieldPenaltyPower(numPlayers);

    // Ensure penalty stays in valid range [0, 1] and apply power scaling
    return Math.pow(Math.max(0, Math.min(1, penalty)), power);
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
    const teamAMidfieldPenalty = calculateMidfieldPreferencePenalty(teamAZoneAverages, midfieldPenaltyStrength, numPlayers);
    const teamBMidfieldPenalty = calculateMidfieldPreferencePenalty(teamBZoneAverages, midfieldPenaltyStrength, numPlayers);

    // Combined midfield penalty (average of both teams)
    const combinedMidfieldPenalty = (teamAMidfieldPenalty + teamBMidfieldPenalty) / 2;

    // Get dynamic power scaling for internal variance based on player count
    // More players = harsher penalty for zone imbalance
    const skillZonePower = getInternalZoneSkillPower(numPlayers);

    // Get dynamic power scaling for internal variance based on player count
    // More players = harsher penalty for zone imbalance
    const internalVariancePower = getInternalVariancePower(numPlayers);

    const starCountA = getStarCount(teamA, DEFAULT_BALANCE_CONFIG.starPlayers.absoluteMinimum);
    const starCountB = getStarCount(teamB, DEFAULT_BALANCE_CONFIG.starPlayers.absoluteMinimum);
    const starPenalty = Math.abs(starCountA - starCountB) >= 2 ? 0.5 : 1.0;

    // Apply dynamic power scaling to heavily penalize distribution mismatches
    // Power scales with player count: 18 players → power 1.0, 22+ players → power 2.0
    const talentDistributionRatio = (Math.pow(rawRatio, internalVariancePower) * 0.25 + Math.pow(internalSkillRatio, skillZonePower) * 0.75) * combinedMidfieldPenalty * starPenalty;

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
        console.log(`  Scaled (^3): ${talentDistributionRatio.toFixed(3)}`);
    }

    return talentDistributionRatio;
}

/**
 * Calculates comprehensive balance metrics using NEW configuration system
 *
 * Uses calibrated transformations and professional configuration.
 * This is the modern API - use this instead of calculateMetrics().
 *
 * @param teamA First team
 * @param teamB Second team
 * @param config NEW BalanceConfiguration with calibrated thresholds
 * @param debug Enable detailed debug output with threshold context
 * @returns Combined score and detailed metrics
 */
export function calculateMetricsV3(
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

/**
 * Calculates comprehensive balance metrics (LEGACY API)
 *
 * @deprecated Use calculateMetricsV3() with BalanceConfiguration instead
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

    // Calculate weighted score based on config
    const weightedScore =
        config.weights.overallStrengthBalance * metrics.overallStrengthBalance +
        config.weights.positionalScoreBalance * metrics.positionalScoreBalance +
        config.weights.zonalDistributionBalance * metrics.zonalDistributionBalance +
        config.weights.energyBalance * metrics.energyBalance +
        config.weights.creativityBalance * metrics.creativityBalance +
        config.weights.strikerBalance * metrics.strikerBalance +
        config.weights.allStatBalance * metrics.allStatBalance +
        config.weights.talentDistributionBalance * metrics.talentDistributionBalance;

    // Calculate consistency penalty to favor results where all metrics are close to 1.0
    const metricValues = [
        metrics.overallStrengthBalance,
        metrics.positionalScoreBalance,
        metrics.zonalDistributionBalance,
        metrics.energyBalance,
        metrics.creativityBalance,
        metrics.strikerBalance,
        metrics.allStatBalance,
        metrics.talentDistributionBalance
    ];

    // Calculate standard deviation of the metrics
    const mean = metricValues.reduce((a, b) => a + b, 0) / metricValues.length;
    const variance = metricValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / metricValues.length;
    const stdDev = Math.sqrt(variance);
    const finalScore = weightedScore;// * Math.pow(1-stdDev, 1.5);

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
        console.log(`  Striker Balance:          ${metrics.strikerBalance.toFixed(3)} (weight: ${config.weights.strikerBalance.toFixed(2)}) = ${(config.weights.strikerBalance * metrics.strikerBalance).toFixed(3)}`);
        console.log(`  All-Stat Balance:         ${metrics.allStatBalance.toFixed(3)} (weight: ${config.weights.allStatBalance.toFixed(2)}) = ${(config.weights.allStatBalance * metrics.allStatBalance).toFixed(3)}`);
        console.log(`  Talent Distribution:      ${metrics.talentDistributionBalance.toFixed(3)} (weight: ${config.weights.talentDistributionBalance.toFixed(2)}) = ${(config.weights.talentDistributionBalance * metrics.talentDistributionBalance).toFixed(3)}`);
        console.log('----------------------------------------------------------------');
        console.log(`  WEIGHTED SCORE:           ${weightedScore.toFixed(3)}`);
        console.log('');
        console.log(`  Consistency Analysis:`);
        console.log(`    Metric Mean:            ${mean.toFixed(3)}`);
        console.log(`    Metric Std Dev:         ${stdDev.toFixed(3)}`);
        console.log('----------------------------------------------------------------');
        console.log(`  FINAL SCORE:              ${finalScore.toFixed(3)}`);
        console.log('================================================================');
        console.log('');
    }

    return { score: finalScore, details: metrics };
}