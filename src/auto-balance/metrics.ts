/**
 * Auto-Balance Metrics Calculation
 *
 * Professional metrics using calibrated transformations instead of arbitrary power scaling.
 * All thresholds and formulas are centralized in DEFAULT_BALANCE_CONFIG.
 *
 * @module auto-balance/metrics
 */

import type { FastTeam, BalanceConfig, BalanceMetrics, FastPlayer, StarZoneClassification, TeamStarDistribution } from "./types";
import type { BalanceConfiguration } from "./metrics-config"
import type { Formation } from "@/types/positions";
import { ZONE_POSITIONS, INDEX_TO_POSITION, getMidfieldPenaltyPower, getInternalZoneSkillPower, POSITION_INDICES } from "./constants";
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
    let cancellationFactor = 1.0 - (Math.abs(aWrAdvantage + aStaminaAdvantage)) / 2.0; // 1 if opposite signs (cancellation)

    if (aAttAdvantage !== 0 && aDefAdvantage !== 0) {
        cancellationFactor *= 1.0 - (Math.abs(aAttAdvantage + aDefAdvantage)) / 2.0;
    }

    // Combine: if perfect cancellation (both teams balanced differently), still penalize raw differences
    // If no cancellation (same team ahead in both), use total ratio directly
    const workrateRatio = cancellationFactor * attWRRatio * defWRRatio;

    // 3. Combine stamina and workrate
    // Stamina is slightly more important (55/45 split)
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
        console.log(`  Cancellation: ${cancellationFactor} (att favor: ${aAttAdvantage.toFixed(1)}, def favor: ${aDefAdvantage.toFixed(1)})`);
        console.log(`  Combined Workrate Ratio: ${workrateRatio.toFixed(3)}`);
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

    return efficiencyScore;//positionalBalanceRatio;
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
    for (let zoneIdx = 0; zoneIdx < N; zoneIdx++) {
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
    const EPSILON = 3.0; // Score must be within 3 points of best score to count as viable striker

    // Weighted striker scoring system:
    // +2 points: ST is their BEST position (specialist striker)
    // +1 point:  ST is viable (within EPSILON of best score) but not their best
    let teamAStrikerScore = 0;
    let teamBStrikerScore = 0;

    // Track counts for debug output
    let teamASpecialists = 0;
    let teamAViable = 0;
    let teamBSpecialists = 0;
    let teamBViable = 0;

    for (const positionPlayers of teamA.positions) {
        for (const player of positionPlayers) {
            const stScore = player.scores[ST_INDEX];
            const bestScore = player.bestScore;
            const isViable = Math.abs(stScore - bestScore) <= EPSILON;

            if (Math.abs(stScore - bestScore) < 0.01) {
                // ST is their best position (specialist)
                teamAStrikerScore += 2;
                teamASpecialists++;
            } else if (isViable) {
                // ST is viable but not their best
                teamAStrikerScore += 1;
                teamAViable++;
            }
        }
    }

    for (const positionPlayers of teamB.positions) {
        for (const player of positionPlayers) {
            const stScore = player.scores[ST_INDEX];
            const bestScore = player.bestScore;
            const isViable = Math.abs(stScore - bestScore) <= EPSILON;

            if (Math.abs(stScore - bestScore) < 0.01) {
                // ST is their best position (specialist)
                teamBStrikerScore += 2;
                teamBSpecialists++;
            } else if (isViable) {
                // ST is viable but not their best
                teamBStrikerScore += 1;
                teamBViable++;
            }
        }
    }

    // 1. Specialist striker balance (most important - need true strikers!)
    const specialistBalance = calculateBasicDifferenceRatio(teamASpecialists, teamBSpecialists);
    // const specialistBalance = calibratedScore(
    //     specialistRatio,
    //     DEFAULT_BALANCE_CONFIG.thresholds.striker,
    //     Steepness.VerySteep
    // );

    // 2. Viable striker balance (secondary - can fill in at striker)
    const viableBalance = calculateBasicDifferenceRatio(teamAViable, teamBViable);

    // 3. Overall striker quality balance (legacy metric)
    const qualityRatio = calculateBasicDifferenceRatio(teamA.strikerScore, teamB.strikerScore);
    const qualityScore = calibratedScore(
        qualityRatio,
        DEFAULT_BALANCE_CONFIG.thresholds.striker,
        Steepness.Moderate
    );

    // Combine: specialist count matters most (50%), viable count secondary (30%), quality tertiary (20%)
    const strikerBalanceRatio = specialistBalance * 0.5 + viableBalance * 0.3 + qualityScore * 0.2;

    if (debug) {
        const t = DEFAULT_BALANCE_CONFIG.thresholds.striker;
        console.log('Striker Balance (3-Factor System):');
        console.log(`  Team A: ${teamAStrikerScore} points (${teamASpecialists} specialists [2pt], ${teamAViable} viable [1pt])`);
        console.log(`  Team B: ${teamBStrikerScore} points (${teamBSpecialists} specialists [2pt], ${teamBViable} viable [1pt])`);
        console.log('');
        console.log(formatComparison('  Specialist Strikers', teamASpecialists, teamBSpecialists, specialistBalance));
        console.log(`    Specialist Balance: ${specialistBalance.toFixed(3)} (weight: 50%)`);
        console.log(formatComparison('  Viable Strikers', teamAViable, teamBViable, viableBalance));
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
    const teamAMidfieldPenalty = calculateMidfieldPreferencePenalty(teamAZoneAverages);
    const teamBMidfieldPenalty = calculateMidfieldPreferencePenalty(teamBZoneAverages);

    // Combined midfield penalty (average of both teams)
    const combinedMidfieldPenalty = teamAMidfieldPenalty * teamBMidfieldPenalty;
    calibratedScore(
        teamAMidfieldPenalty * teamBMidfieldPenalty,
        DEFAULT_BALANCE_CONFIG.thresholds.starDistribution,
        Steepness.VeryGentle
    );
    const midDiffRatio = calibratedScore(
        calculateBasicDifferenceRatio(teamAZoneAverages[2], teamBZoneAverages[2]),
        DEFAULT_BALANCE_CONFIG.thresholds.starDistribution,
        Steepness.Gentle
    );

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
 * Classifies a star player by their zone specialization using relative weighting
 *
 * Uses a gradient system instead of hard thresholds:
 * - Calculates defensive vs attacking lean as a continuous value (-1 to +1)
 * - -1.0 = pure defensive specialist
 * - +1.0 = pure attacking specialist
 * -  0.0 = perfectly balanced all-rounder
 *
 * Classification labels are just for readability - the lean value is what matters.
 *
 * @param player The star player to classify
 * @returns Classification with specialist type and lean
 */
function classifyStarPlayerByZone(player: FastPlayer): StarZoneClassification {
    // Position indices for different zones
    // Pure Defensive: GK(0), CB(1), FB(2)
    // Pure Attacking: AM(6), ST(7), WR(8)
    // Midfield: DM(3), CM(4)
    // Wide: WM(5)
    const pureDefensiveIndices = [POSITION_INDICES.GK, POSITION_INDICES.CB, POSITION_INDICES.FB];
    const pureAttackingIndices = [POSITION_INDICES.AM, POSITION_INDICES.ST, POSITION_INDICES.WR];
    const midfieldIndices = [POSITION_INDICES.DM, POSITION_INDICES.CM];
    const wideIndices = [POSITION_INDICES.WM];

    // For legacy metrics: defensive = GK+CB+FB+DM, attacking = AM+ST+WR
    const defensivePositionIndices = [POSITION_INDICES.GK, POSITION_INDICES.CB, POSITION_INDICES.FB, POSITION_INDICES.DM];
    const attackingPositionIndices = [POSITION_INDICES.AM, POSITION_INDICES.ST, POSITION_INDICES.WR];

    // Find best scores in defensive and attacking zones
    let bestDefensiveScore = 0;
    for (const posIdx of defensivePositionIndices) {
        bestDefensiveScore = Math.max(bestDefensiveScore, player.scores[posIdx]);
    }

    let bestAttackingScore = 0;
    for (const posIdx of attackingPositionIndices) {
        bestAttackingScore = Math.max(bestAttackingScore, player.scores[posIdx]);
    }

    // Calculate average across all positions
    let totalScore = 0;
    for (let i = 0; i < player.scores.length; i++) {
        totalScore += player.scores[i];
    }
    const averageScore = totalScore / player.scores.length;

    // NEW 4-CATEGORY APPROACH:
    // 1. Check if player is a MIDFIELDER (strong DM/CM)
    // 2. Check if player is DEFENSIVE (strong CB/FB/GK, weak at midfield)
    // 3. Check if player is ATTACKING (strong AM/ST/WR, weak at midfield)
    // 4. Otherwise ALL-ROUNDER (versatile across zones)

    // Get all positions sorted by score
    type PositionScore = { score: number; idx: number };
    const positionScores: PositionScore[] = [];
    for (let i = 0; i < player.scores.length; i++) {
        positionScores.push({ score: player.scores[i], idx: i });
    }
    positionScores.sort((a, b) => b.score - a.score);

    // Look at top 3 positions to determine specialization
    const top3Positions = positionScores.slice(0, 3).map(p => p.idx);

    let pureDefCount = 0;
    let pureAttCount = 0;
    let midCount = 0;
    let wideCount = 0;

    for (const posIdx of top3Positions) {
        if (pureDefensiveIndices.includes(posIdx as any)) {
            pureDefCount++;
        } else if (pureAttackingIndices.includes(posIdx as any)) {
            pureAttCount++;
        } else if (midfieldIndices.includes(posIdx as any)) {
            midCount++;
        } else if (wideIndices.includes(posIdx as any)) {
            wideCount++;
        }
    }

    let specialistType: 'defensive' | 'attacking' | 'midfielder' | 'all-rounder';
    let specializationStrength: number;

    // Classification logic:
    // Key insight: Midfielders are players whose top positions include DM/CM
    // Not just "balanced" players, but players whose BEST positions are midfield
    if (midCount >= 2) {
        // 2+ midfield positions in top 3 → midfielder specialist
        specialistType = 'midfielder';
        specializationStrength = midCount / 3;
    } else if (pureDefCount >= 2) {
        // 2+ pure defensive positions (CB/FB/GK) in top 3 → defensive specialist
        specialistType = 'defensive';
        specializationStrength = pureDefCount / 3;
    } else if (pureAttCount >= 2) {
        // 2+ pure attacking positions in top 3 → attacking specialist
        specialistType = 'attacking';
        specializationStrength = pureAttCount / 3;
    } else {
        // Mixed positions across zones → all-rounder
        // Examples: CB+DM+ST, FB+WM+WR, CB+FB+AM
        specialistType = 'all-rounder';
        specializationStrength = 1.0 - Math.max(pureDefCount, pureAttCount, midCount) / 3;
    }

    return {
        player,
        specialistType,
        specializationStrength,
        bestDefensiveScore,
        bestAttackingScore,
        averageScore,
    };
}

/**
 * Configuration for star distribution penalty calculation
 *
 * These weights control how harshly different types of imbalances are penalized.
 * Higher values = stronger penalty for that factor.
 */
const STAR_DISTRIBUTION_PENALTY_CONFIG = {
    /** Quality normalization factor (typical star ratings are 85-95) */
    qualityNormalizer: 100,

    /** Lean direction penalties */
    lean: {
        /** Power exponent for basic lean difference (2.0 = quadratic, harsher) */
        power: 2.0,
        /** Weight multiplier for lean difference penalty */
        weight: 0.6,
        /** Power exponent when teams lean in opposing directions (very harsh) */
        opposingPower: 2.5,
        /** Weight multiplier when teams lean in opposing directions */
        opposingWeight: 0.8,
    },

    /** Quality imbalance penalties (most important!) */
    quality: {
        /** Power exponent for quality differences (0.7 = slightly sublinear) */
        power: 0.7,
        /** Weight for defensive quality imbalance */
        defensiveWeight: 0.3,
        /** Weight for attacking quality imbalance (highest priority!) */
        attackingWeight: 0.4,
    },

    /** Clustering penalties (when all stars lean the same direction) */
    clustering: {
        /** Variance threshold for extreme clustering */
        extremeThreshold: 0.001,
        /** Penalty for extreme clustering */
        extremePenalty: 0.15,
        /** Variance threshold for high clustering */
        highThreshold: 0.003,
        /** Penalty for high clustering */
        highPenalty: 0.10,
        /** Variance threshold for moderate clustering */
        moderateThreshold: 0.01,
        /** Penalty for moderate clustering */
        moderatePenalty: 0.05,
    },

    /** Uneven star count compensation penalties */
    unevenStarCount: {
        /**
         * When one team has fewer stars, they MUST have higher quality stars to compensate.
         * This penalty applies when the team with MORE stars also has BETTER quality (wrong direction!)
         *
         * Example: Team A has 3 stars, Team B has 2 stars
         * - If Team A's average star quality is HIGHER, apply heavy penalty (they have quantity AND quality)
         * - If Team B's average star quality is HIGHER, no penalty (correct compensation)
         */
        enabled: true,
        /** Power exponent for quality difference (exponential penalty) */
        power: 1.5,
        /** Weight multiplier - heavy penalty for wrong-direction quality */
        weight: 0.5,
    },
} as const;

/**
 * Calculates team metrics for star distribution using NEW 4-category position-based approach
 */
function calculateTeamStarMetrics(classifications: StarZoneClassification[]): {
    defSpecialistCount: number;
    attSpecialistCount: number;
    midfielderCount: number;
    allRounderCount: number;
    totalDefQuality: number;
    totalAttQuality: number;
} {
    if (classifications.length === 0) {
        return {
            defSpecialistCount: 0,
            attSpecialistCount: 0,
            midfielderCount: 0,
            allRounderCount: 0,
            totalDefQuality: 0,
            totalAttQuality: 0
        };
    }

    let defSpecialistCount = 0;
    let attSpecialistCount = 0;
    let midfielderCount = 0;
    let allRounderCount = 0;
    let totalDefQuality = 0;
    let totalAttQuality = 0;

    // Count specialists and accumulate quality
    for (const c of classifications) {
        // Count specialist types
        if (c.specialistType === 'defensive') {
            defSpecialistCount++;
        } else if (c.specialistType === 'attacking') {
            attSpecialistCount++;
        } else if (c.specialistType === 'midfielder') {
            midfielderCount++;
        } else {
            allRounderCount++;
        }

        // Accumulate total quality (simple sum - no weighting tricks)
        totalDefQuality += c.bestDefensiveScore;
        totalAttQuality += c.bestAttackingScore;
    }

    return {
        defSpecialistCount,
        attSpecialistCount,
        midfielderCount,
        allRounderCount,
        totalDefQuality,
        totalAttQuality
    };
}

/**
 * Core calculation for star distribution analysis
 *
 * This is the shared logic used by both calculateOptimalStarDistribution (for finding
 * the theoretical best) and calculateStarZonePenalty (for evaluating actual teams).
 *
 * Analyzes a split of star players into two teams and calculates:
 * 1. Quality-weighted directional lean for each team
 * 2. Absolute defensive/attacking quality for each team
 * 3. Variance in player leans (clustering detection)
 * 4. Overall penalty based on lean differences, quality imbalances, and clustering
 *
 * @param teamAClassifications Star classifications for team A
 * @param teamBClassifications Star classifications for team B
 * @returns Penalty score from 0 (terrible split) to 1 (perfect split)
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
    teamADefQuality: number;
    teamAAttQuality: number;
    teamBDefQuality: number;
    teamBAttQuality: number;
} {
    const config = STAR_DISTRIBUTION_PENALTY_CONFIG;

    // Calculate metrics for both teams (NEW 4-category position-based approach)
    const teamAMetrics = calculateTeamStarMetrics(teamAClassifications);
    const teamBMetrics = calculateTeamStarMetrics(teamBClassifications);

    // 1. SPECIALIST COUNT IMBALANCE
    // Ideally: equal defensive specialists, attacking specialists, and midfielders on both teams
    const defSpecialistDiff = Math.abs(teamAMetrics.defSpecialistCount - teamBMetrics.defSpecialistCount);
    const attSpecialistDiff = Math.abs(teamAMetrics.attSpecialistCount - teamBMetrics.attSpecialistCount);
    const midfielderDiff = Math.abs(teamAMetrics.midfielderCount - teamBMetrics.midfielderCount);

    // Normalize by total number of each type (avoid divide by zero)
    const totalDefSpec = teamAMetrics.defSpecialistCount + teamBMetrics.defSpecialistCount;
    const totalAttSpec = teamAMetrics.attSpecialistCount + teamBMetrics.attSpecialistCount;
    const totalMid = teamAMetrics.midfielderCount + teamBMetrics.midfielderCount;

    const normalizedDefSpecDiff = totalDefSpec > 0 ? defSpecialistDiff / (totalDefSpec / 2) : 0;
    const normalizedAttSpecDiff = totalAttSpec > 0 ? attSpecialistDiff / (totalAttSpec / 2) : 0;
    const normalizedMidDiff = totalMid > 0 ? midfielderDiff / (totalMid / 2) : 0;

    const specialistCountPenalty = (normalizedDefSpecDiff + normalizedAttSpecDiff + normalizedMidDiff) * 0.15;

    // 2. QUALITY PENALTIES (most important!)
    const defQualityDiff = Math.abs(teamAMetrics.totalDefQuality - teamBMetrics.totalDefQuality);
    const attQualityDiff = Math.abs(teamAMetrics.totalAttQuality - teamBMetrics.totalAttQuality);

    // Quality values are TOTALS across all stars
    // For 2-3 stars with ~90 rating each: total quality ~180-270
    const qualityNormalizationFactor = 100;

    const normalizedDefQualityDiff = defQualityDiff / qualityNormalizationFactor;
    const normalizedAttQualityDiff = attQualityDiff / qualityNormalizationFactor;

    const defQualityPenalty = Math.pow(normalizedDefQualityDiff, config.quality.power) * config.quality.defensiveWeight;
    const attQualityPenalty = Math.pow(normalizedAttQualityDiff, config.quality.power) * config.quality.attackingWeight;

    // 3. TOTAL PENALTY
    const totalPenalty = specialistCountPenalty + defQualityPenalty + attQualityPenalty;
    const penalty = Math.max(0, 1.0 - totalPenalty);

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
        teamADefQuality: teamAMetrics.totalDefQuality,
        teamAAttQuality: teamAMetrics.totalAttQuality,
        teamBDefQuality: teamBMetrics.totalDefQuality,
        teamBAttQuality: teamBMetrics.totalAttQuality,
    };
}

/**
 * Analyzes star player distribution by zone for a team
 *
 * @param team Team to analyze
 * @param starThreshold Minimum score to be considered a star player
 * @returns Distribution breakdown by specialist type
 */
function analyzeTeamStarDistribution(
    team: FastTeam,
    starThreshold: number
): TeamStarDistribution {
    const classifications: StarZoneClassification[] = [];
    let defensiveSpecialists = 0;
    let attackingSpecialists = 0;
    let midfielders = 0;
    let allRounders = 0;

    // Iterate through all positions and find star players
    for (const positionPlayers of team.positions) {
        for (const player of positionPlayers) {
            if (player.bestScore >= starThreshold) {
                const classification = classifyStarPlayerByZone(player);
                classifications.push(classification);

                if (classification.specialistType === 'defensive') {
                    defensiveSpecialists++;
                } else if (classification.specialistType === 'attacking') {
                    attackingSpecialists++;
                } else if (classification.specialistType === 'midfielder') {
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
 * Calculates optimal star distribution penalty for a given player pool
 *
 * This analyzes ALL star players to determine the theoretical best possible
 * distribution achievable with this specific set of players. This becomes the
 * baseline for comparing actual team distributions in the Monte Carlo loop.
 *
 * Approach:
 * 1. Identify all star players from the pool
 * 2. Classify each by their defensive/attacking lean
 * 3. Test ALL possible team splits combinatorially
 * 4. Return the BEST penalty achievable (optimal for THIS player pool)
 *
 * @param players All available players
 * @param config Balance configuration with star threshold
 * @returns Optimal star zone penalty (0-1, higher is better)
 */
export function calculateOptimalStarDistribution(
    players: FastPlayer[],
    config: BalanceConfiguration
): number {
    const starThreshold = config.starPlayers.absoluteMinimum;

    // Identify all star players
    const starPlayers: FastPlayer[] = [];
    for (const player of players) {
        if (player.bestScore >= starThreshold) {
            starPlayers.push(player);
        }
    }

    // If no stars or only 1 star, optimal is perfect (1.0)
    if (starPlayers.length <= 1) {
        return 1.0;
    }

    // Classify all stars
    const classifications = starPlayers.map(p => classifyStarPlayerByZone(p));

    // Find the ACTUAL optimal split by testing all possible combinations
    // For N stars, we need to split them into two teams as evenly as possible
    const numStars = classifications.length;
    const teamASize = Math.floor(numStars / 2);

    // Generate all possible combinations of teamASize stars
    const combinations = generateCombinations(numStars, teamASize);

    let bestPenalty = -Infinity;
    let worstPenalty = Infinity;
    let totalPenalties = 0;
    let zeroCount = 0;

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

        if (result.penalty > bestPenalty) {
            bestPenalty = result.penalty;
        }
        if (result.penalty < worstPenalty) {
            worstPenalty = result.penalty;
        }
        if (result.penalty === 0) {
            zeroCount++;
        }
        totalPenalties += result.penalty;
    }

    const avgPenalty = totalPenalties / combinations.length;

    console.log(`[calculateOptimalStarDistribution] ${numStars} stars, ${combinations.length} combinations`);
    console.log(`  Best: ${bestPenalty.toFixed(4)}, Worst: ${worstPenalty.toFixed(4)}, Avg: ${avgPenalty.toFixed(4)}`);
    console.log(`  Zero penalties: ${zeroCount}/${combinations.length} (${(100 * zeroCount / combinations.length).toFixed(1)}%)`);

    return bestPenalty;
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
        console.log(`  Team A Stars: ${distA.totalStars} total`);
        console.log(`    Defensive specialists: ${result.teamADefSpecialists}`);
        console.log(`    Attacking specialists: ${result.teamAAttSpecialists}`);
        console.log(`    Midfielders: ${result.teamAMidfielders}`);
        console.log(`    All-rounders: ${result.teamAAllRounders}`);
        console.log(`    Total Defensive Quality: ${result.teamADefQuality.toFixed(1)}`);
        console.log(`    Total Attacking Quality: ${result.teamAAttQuality.toFixed(1)}`);

        console.log(`  Team B Stars: ${distB.totalStars} total`);
        console.log(`    Defensive specialists: ${result.teamBDefSpecialists}`);
        console.log(`    Attacking specialists: ${result.teamBAttSpecialists}`);
        console.log(`    Midfielders: ${result.teamBMidfielders}`);
        console.log(`    All-rounders: ${result.teamBAllRounders}`);
        console.log(`    Total Defensive Quality: ${result.teamBDefQuality.toFixed(1)}`);
        console.log(`    Total Attacking Quality: ${result.teamBAttQuality.toFixed(1)}`);

        console.log(`  Quality Imbalances:`);
        console.log(`    Defensive quality diff: ${Math.abs(result.teamADefQuality - result.teamBDefQuality).toFixed(1)}`);
        console.log(`    Attacking quality diff: ${Math.abs(result.teamAAttQuality - result.teamBAttQuality).toFixed(1)}`);
        console.log(`    Def specialist count diff: ${Math.abs(result.teamADefSpecialists - result.teamBDefSpecialists)}`);
        console.log(`    Att specialist count diff: ${Math.abs(result.teamAAttSpecialists - result.teamBAttSpecialists)}`);
        console.log(`    Midfielder count diff: ${Math.abs(result.teamAMidfielders - result.teamBMidfielders)}`);

        console.log(`  Final Penalty: ${result.penalty.toFixed(3)}`);

        if (distA.classifications.length > 0) {
            console.log('  Team A Star Classifications (by top 3 positions):');
            for (const c of distA.classifications) {
                const playerName = c.player.original.guest_name || c.player.original.id;
                console.log(`    ${playerName}: ${c.specialistType} (DEF:${c.bestDefensiveScore.toFixed(1)}, ATT:${c.bestAttackingScore.toFixed(1)})`);
            }
        }

        if (distB.classifications.length > 0) {
            console.log('  Team B Star Classifications (by top 3 positions):');
            for (const c of distB.classifications) {
                const playerName = c.player.original.guest_name || c.player.original.id;
                console.log(`    ${playerName}: ${c.specialistType} (DEF:${c.bestDefensiveScore.toFixed(1)}, ATT:${c.bestAttackingScore.toFixed(1)})`);
            }
        }
    }

    return result.penalty;
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

    const starCountA = getStarCount(teamA, DEFAULT_BALANCE_CONFIG.starPlayers.absoluteMinimum);
    const starCountB = getStarCount(teamB, DEFAULT_BALANCE_CONFIG.starPlayers.absoluteMinimum);
    const starPenalty = Math.abs(starCountA - starCountB) >= 2 ? 0.5 : 1.0;

    // Calculate standard deviation of the metrics
    const mean = metricValues.reduce((a, b) => a + b, 0) / metricValues.length;
    const variance = metricValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / metricValues.length;
    const stdDev = Math.sqrt(variance);
    const finalScore = weightedScore * starPenalty;// * Math.pow(1-stdDev, 1.5);

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