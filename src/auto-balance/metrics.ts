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
    let strikerBalanceRatio = specialistBalance * 0.5 + viableBalance * 0.3 + qualityScore * 0.2;

    // if one team has more specialists than the other
    // we want the team with less specialists
    // to compensate with a higher overall score
    // if (teamASpecialists != teamBSpecialists && ((teamASpecialists > teamBSpecialists) == (teamA.strikerScore > teamB.strikerScore))) {
    //     strikerBalanceRatio *= 0.25;
    // }

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
    // Pure Defensive: CB(1), FB(2)
    // Pure Attacking: AM(6), ST(7), WR(8)
    // Midfield: DM(3), CM(4)
    // Wide: WM(5)
    const pureDefensiveIndices = [POSITION_INDICES.CB, POSITION_INDICES.FB, POSITION_INDICES.DM];
    const pureAttackingIndices = [POSITION_INDICES.ST, POSITION_INDICES.WR, POSITION_INDICES.AM];
    const midfieldIndices = [POSITION_INDICES.DM, POSITION_INDICES.CM, POSITION_INDICES.WM, POSITION_INDICES.AM];

    // Find best scores in defensive and attacking zones
    let bestDefensiveScore = 0;
    for (const posIdx of pureDefensiveIndices) {
        bestDefensiveScore = Math.max(bestDefensiveScore, player.scores[posIdx]);
    }

    let bestMidfieldScore = 0;
    for (const posIdx of midfieldIndices) {
        bestMidfieldScore = Math.max(bestMidfieldScore, player.scores[posIdx]);
    }

    let bestAttackingScore = 0;
    for (const posIdx of pureAttackingIndices) {
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

    // Use threshold-based approach instead of fixed top-3:
    // - Best position must be above 90, OR
    // - Position score is within 3 points of the top score
    const bestScore = positionScores[0].score;
    const qualifyingPositions: number[] = [];

    for (const pos of positionScores) {
        if ((pos.score >= 90) || (pos.score >= (bestScore - 3))) {
            qualifyingPositions.push(pos.idx);
        } else {
            // Once we fall outside the range, we can stop
            break;
        }
    }

    let pureDefCount = 0;
    let pureAttCount = 0;
    let midCount = 0;

    for (const posIdx of qualifyingPositions) {
        if (pureDefensiveIndices.includes(posIdx as any)) {
            pureDefCount++;
        }
        if (pureAttackingIndices.includes(posIdx as any)) {
            pureAttCount++;
        }
        if (midfieldIndices.includes(posIdx as any)) {
            midCount++;
        }
    }

    let specialistType: 'defensive' | 'attacking' | 'midfielder' | 'all-rounder';

    const totalQualifying = pureDefCount + pureAttCount + midCount;

    // Classification logic with dynamic thresholds based on number of qualifying positions:
    // Use proportions instead of fixed counts to handle variable position counts
    const midProportion = totalQualifying > 0 ? midCount / totalQualifying : 0;
    const defProportion = totalQualifying > 0 ? pureDefCount / totalQualifying : 0;
    const attProportion = totalQualifying > 0 ? pureAttCount / totalQualifying : 0;

    const minProp = Math.min(midProportion, defProportion, attProportion);
    const maxProp = Math.max(midProportion, defProportion, attProportion);

    if (minProp !== 0 && minProp >= (maxProp - 0.05)) {
        specialistType = 'all-rounder';
    }

    // A specialist needs at least 50% of their qualifying positions in one zone
    else if (maxProp == midProportion && bestMidfieldScore >= bestAttackingScore && bestMidfieldScore >= bestDefensiveScore) {
        // Majority midfield positions → midfielder specialist
        specialistType = 'midfielder';
    } else if (maxProp == defProportion && bestDefensiveScore >= bestAttackingScore && bestDefensiveScore >= bestMidfieldScore) {
        // Majority pure defensive positions → defensive specialist
        specialistType = 'defensive';
    } else if (maxProp == attProportion && bestAttackingScore >= bestDefensiveScore && bestAttackingScore >= bestMidfieldScore) {
        // Majority pure attacking positions → attacking specialist
        specialistType = 'attacking';
    } else {
        // Mixed positions across zones → all-rounder
        specialistType = 'all-rounder';
    }

    return {
        player,
        name: player.original.name,
        specialistType,
        bestDefensiveScore,
        bestMidfieldScore,
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
        defensiveWeight: 0.15,
        /** Weight for midfield quality imbalance */
        midfieldWeight: 0.35,
        /** Weight for attacking quality imbalance (highest priority!) */
        attackingWeight: 0.25,
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
    totalMidQuality: number;
    totalAttQuality: number;
} {
    if (classifications.length === 0) {
        return {
            defSpecialistCount: 0,
            attSpecialistCount: 0,
            midfielderCount: 0,
            allRounderCount: 0,
            totalDefQuality: 0,
            totalMidQuality: 0,
            totalAttQuality: 0
        };
    }

    let defSpecialistCount = 0;
    let attSpecialistCount = 0;
    let midfielderCount = 0;
    let allRounderCount = 0;
    let totalDefQuality = 0;
    let totalMidQuality = 0;
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
        totalAttQuality
    };
}

/**
 * ODD STAR COUNT SUBROUTINE
 *
 * Special handling for odd star counts (e.g., 9 stars = 5v4 split).
 * Uses 40% scaled penalties to keep scores in 0.10-0.90 range instead of always 0.
 *
 * Focus: Specialist distribution is THE MOST IMPORTANT factor!
 */
function calculateStarDistributionPenaltyOddStars(
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
    teamAMidQuality: number;
    teamAAttQuality: number;
    teamBDefQuality: number;
    teamBMidQuality: number;
    teamBAttQuality: number;
    teamATotalQuality: number;
    teamBTotalQuality: number;
    teamAAvgBestScore: number;
    teamBAvgBestScore: number;
    teamAAvgRating: number;
    teamBAvgRating: number;
    teamAStdDev: number;
    teamBStdDev: number;
    teamAZoneWins: number;
    teamBZoneWins: number;
    neutralZones: number;
    individualQualityPenalty: number;
    variancePenalty: number;
    highVariancePenalty: number;
    directionalClusteringPenalty: number;
    specialistDirectionalPenalty: number;
    totalQualitySkewPenalty: number;
    unevenStarCountPenalty: number;
} {
    const ODD_STAR_SCALE = 0.40; // 40% of normal penalties to keep scores in 0.10-0.90 range

    // Calculate metrics for both teams
    const teamAMetrics = calculateTeamStarMetrics(teamAClassifications);
    const teamBMetrics = calculateTeamStarMetrics(teamBClassifications);

    // 1. INDIVIDUAL PLAYER QUALITY BALANCE (scaled)
    let teamABestScoreSum = 0;
    let teamBBestScoreSum = 0;
    for (const c of teamAClassifications) {
        teamABestScoreSum += c.player.bestScore;
    }
    for (const c of teamBClassifications) {
        teamBBestScoreSum += c.player.bestScore;
    }

    const teamAAvgBestScore = teamAClassifications.length > 0 ? teamABestScoreSum / teamAClassifications.length : 0;
    const teamBAvgBestScore = teamBClassifications.length > 0 ? teamBBestScoreSum / teamBClassifications.length : 0;

    const avgBestScoreDiff = Math.abs(teamAAvgBestScore - teamBAvgBestScore);
    const normalizedBestScoreDiff = avgBestScoreDiff / 10;
    // Reduced from 0.60 to 0.45: Less emphasis on perfect quality balance in odd stars
    // We know it's practically impossible, so we lean on high-quality players instead
    const individualQualityPenalty = Math.pow(normalizedBestScoreDiff, 1.2) * 0.45 * ODD_STAR_SCALE;

    // Variance calculations
    let teamAAvgRatingSum = 0;
    let teamBAvgRatingSum = 0;
    for (const c of teamAClassifications) {
        teamAAvgRatingSum += c.averageScore;
    }
    for (const c of teamBClassifications) {
        teamBAvgRatingSum += c.averageScore;
    }

    const teamAAvgRating = teamAClassifications.length > 0 ? teamAAvgRatingSum / teamAClassifications.length : 0;
    const teamBAvgRating = teamBClassifications.length > 0 ? teamBAvgRatingSum / teamBClassifications.length : 0;

    let teamAVariance = 0;
    for (const c of teamAClassifications) {
        teamAVariance += Math.pow(c.averageScore - teamAAvgRating, 2);
    }
    teamAVariance = teamAClassifications.length > 0 ? teamAVariance / teamAClassifications.length : 0;
    const teamAStdDev = Math.sqrt(teamAVariance);

    let teamBVariance = 0;
    for (const c of teamBClassifications) {
        teamBVariance += Math.pow(c.averageScore - teamBAvgRating, 2);
    }
    teamBVariance = teamBClassifications.length > 0 ? teamBVariance / teamBClassifications.length : 0;
    const teamBStdDev = Math.sqrt(teamBVariance);

    const varianceDiff = Math.abs(teamAStdDev - teamBStdDev);
    const normalizedVarianceDiff = varianceDiff / 5;
    const variancePenalty = Math.pow(normalizedVarianceDiff, 1.0) * 0.15 * ODD_STAR_SCALE;

    const avgStdDev = (teamAStdDev + teamBStdDev) / 2;
    const highVariancePenalty = avgStdDev > 3.0 ? Math.pow((avgStdDev - 3.0) / 5, 1.0) * 0.10 * ODD_STAR_SCALE : 0;

    // 2. SPECIALIST DISTRIBUTION PENALTIES (THE MOST IMPORTANT - scaled)
    const totalDefSpecialists = teamAMetrics.defSpecialistCount + teamBMetrics.defSpecialistCount;
    const totalAttSpecialists = teamAMetrics.attSpecialistCount + teamBMetrics.attSpecialistCount;
    const totalMidfielders = teamAMetrics.midfielderCount + teamBMetrics.midfielderCount;

    const defDiff = Math.abs(teamAMetrics.defSpecialistCount - teamBMetrics.defSpecialistCount);
    const attDiff = Math.abs(teamAMetrics.attSpecialistCount - teamBMetrics.attSpecialistCount);
    const midDiff = Math.abs(teamAMetrics.midfielderCount - teamBMetrics.midfielderCount);

    let specialistDistributionPenalty = 0;
    let specialistQualityImbalancePenalty = 0; // NEW: Quality within specialist type

    // For ODD total specialists, diff of 1 is unavoidable but diff of 2+ is bad
    if (totalDefSpecialists % 2 === 1) {
        if (defDiff > 1) {
            specialistDistributionPenalty += 0.80 * ODD_STAR_SCALE; // 32%
        } else if (defDiff === 1) {
            specialistDistributionPenalty += 0.05 * ODD_STAR_SCALE; // 2%

            // NEW: With odd def specialists (e.g., 2 total), check if smaller team got worse quality
            // This handles "when lower team gets worse of the two defense specialists"
            if (totalDefSpecialists === 2) {
                const smallerTeamHasLessQuality =
                    (teamAMetrics.defSpecialistCount === 1 && teamAMetrics.totalDefQuality < teamBMetrics.totalDefQuality) ||
                    (teamBMetrics.defSpecialistCount === 1 && teamBMetrics.totalDefQuality < teamAMetrics.totalDefQuality);

                if (smallerTeamHasLessQuality) {
                    // Penalize when the team with fewer def specialists also has lower def quality
                    const defQualityDiff = Math.abs(teamAMetrics.totalDefQuality - teamBMetrics.totalDefQuality);
                    specialistQualityImbalancePenalty += Math.min(0.15, defQualityDiff / 200) * ODD_STAR_SCALE;
                }
            }
        }
    } else {
        // Even total: any imbalance is bad
        if (defDiff > 0) {
            specialistDistributionPenalty += 0.80 * ODD_STAR_SCALE; // 32%
        }
    }

    if (totalAttSpecialists % 2 === 1) {
        if (attDiff > 1) {
            specialistDistributionPenalty += 0.80 * ODD_STAR_SCALE; // 32%
        } else if (attDiff === 1) {
            specialistDistributionPenalty += 0.05 * ODD_STAR_SCALE; // 2%

            // NEW: Same logic for attacking specialists
            if (totalAttSpecialists === 2) {
                const smallerTeamHasLessQuality =
                    (teamAMetrics.attSpecialistCount === 1 && teamAMetrics.totalAttQuality < teamBMetrics.totalAttQuality) ||
                    (teamBMetrics.attSpecialistCount === 1 && teamBMetrics.totalAttQuality < teamAMetrics.totalAttQuality);

                if (smallerTeamHasLessQuality) {
                    const attQualityDiff = Math.abs(teamAMetrics.totalAttQuality - teamBMetrics.totalAttQuality);
                    specialistQualityImbalancePenalty += Math.min(0.15, attQualityDiff / 200) * ODD_STAR_SCALE;
                }
            }
        }
    } else {
        if (attDiff > 0) {
            specialistDistributionPenalty += 0.80 * ODD_STAR_SCALE; // 32%
        }
    }

    // Midfielders: Less strict since they're inherently balanced role
    if (totalMidfielders % 2 === 1) {
        if (midDiff > 1) {
            specialistDistributionPenalty += 0.50 * ODD_STAR_SCALE; // 20% (reduced from 24%)
        } else if (midDiff === 1) {
            specialistDistributionPenalty += 0.03 * ODD_STAR_SCALE; // 1.2% (reduced)
        }
    } else {
        if (midDiff > 0) {
            specialistDistributionPenalty += 0.50 * ODD_STAR_SCALE; // 20% (reduced)
        }
    }

    // Specialist pairing penalty (scaled) - WITH COMPENSATION LOGIC
    const teamAHasMoreDef = teamAMetrics.defSpecialistCount > teamBMetrics.defSpecialistCount;
    const teamAHasMoreAtt = teamAMetrics.attSpecialistCount > teamBMetrics.attSpecialistCount;
    const teamAHasMoreMid = teamAMetrics.midfielderCount > teamBMetrics.midfielderCount;

    let specialistPairingPenalty = 0;

    // Cross-specialist compensation: Try to balance unfavorable def with favorable att
    // Example: Team A has 2 def, Team B has 1 def (bad for B) → compensate by giving B 2 att
    if (teamAHasMoreDef !== teamAHasMoreAtt && defDiff > 0 && attDiff > 0) {
        // This is GOOD - def and att are on opposite teams (compensating)
        // Reduce penalty slightly to encourage this pattern
        const avgImbalance = (defDiff + attDiff) / 2;
        specialistPairingPenalty = Math.min(0.40, avgImbalance * 0.20) * ODD_STAR_SCALE; // Reduced from 0.50
    } else if ((teamAHasMoreDef && teamAHasMoreAtt) || (!teamAHasMoreDef && teamAHasMoreDef === teamAHasMoreAtt)) {
        // This is BAD - one team has more of BOTH def and att (not compensating)
        if (defDiff > 0 && attDiff > 0) {
            const avgImbalance = (defDiff + attDiff) / 2;
            specialistPairingPenalty = Math.min(0.60, avgImbalance * 0.30) * ODD_STAR_SCALE; // Increased penalty
        }
    }

    // Mid specialists can help compensate too (they're generalists, second best after all-rounders)
    if (defDiff > 0 && attDiff === 0 && midDiff > 0) {
        // One team has more def, other has more mid - this is reasonable compensation
        if (teamAHasMoreDef !== teamAHasMoreMid) {
            // Good: compensating with mids
            specialistPairingPenalty = Math.min(0.10, midDiff * 0.05) * ODD_STAR_SCALE;
        }
    }

    // Directional clustering penalty (scaled)
    let teamAZoneWins = 0;
    let teamBZoneWins = 0;
    let neutralZones = 0;

    const defWinner = teamAMetrics.totalDefQuality > teamBMetrics.totalDefQuality ? 'A' :
                      teamBMetrics.totalDefQuality > teamAMetrics.totalDefQuality ? 'B' : 'neutral';
    const midWinner = teamAMetrics.totalMidQuality > teamBMetrics.totalMidQuality ? 'A' :
                      teamBMetrics.totalMidQuality > teamAMetrics.totalMidQuality ? 'B' : 'neutral';
    const attWinner = teamAMetrics.totalAttQuality > teamBMetrics.totalAttQuality ? 'A' :
                      teamBMetrics.totalAttQuality > teamAMetrics.totalAttQuality ? 'B' : 'neutral';

    if (defWinner === 'A') teamAZoneWins++;
    else if (defWinner === 'B') teamBZoneWins++;
    else neutralZones++;

    if (midWinner === 'A') teamAZoneWins++;
    else if (midWinner === 'B') teamBZoneWins++;
    else neutralZones++;

    if (attWinner === 'A') teamAZoneWins++;
    else if (attWinner === 'B') teamBZoneWins++;
    else neutralZones++;

    let directionalClusteringPenalty = 0;
    const maxWins = Math.max(teamAZoneWins, teamBZoneWins);
    if (maxWins === 3) {
        directionalClusteringPenalty = 0.40 * ODD_STAR_SCALE; // 16%
    } else if (maxWins === 2 && neutralZones === 0) {
        directionalClusteringPenalty = 0.20 * ODD_STAR_SCALE; // 8%
    }

    // Specialist directional penalty (scaled)
    const teamASpecialistTotal = teamAMetrics.defSpecialistCount + teamAMetrics.attSpecialistCount + teamAMetrics.midfielderCount;
    const teamBSpecialistTotal = teamBMetrics.defSpecialistCount + teamBMetrics.attSpecialistCount + teamBMetrics.midfielderCount;
    let specialistDirectionalPenalty = 0;
    if (teamASpecialistTotal > 0 || teamBSpecialistTotal > 0) {
        const specialistImbalance = Math.abs(teamASpecialistTotal - teamBSpecialistTotal);
        const totalSpecialists = teamASpecialistTotal + teamBSpecialistTotal;
        const specialistImbalanceRatio = specialistImbalance / (totalSpecialists || 1);
        specialistDirectionalPenalty = Math.pow(specialistImbalanceRatio, 1.5) * 0.30 * ODD_STAR_SCALE;
    }

    // Per-zone quality balance (NEW - emphasis on balanced zones individually)
    // With odd stars, we try to balance overall quality while accepting zone imbalances
    const defQualityDiff = Math.abs(teamAMetrics.totalDefQuality - teamBMetrics.totalDefQuality);
    const midQualityDiff = Math.abs(teamAMetrics.totalMidQuality - teamBMetrics.totalMidQuality);
    const attQualityDiff = Math.abs(teamAMetrics.totalAttQuality - teamBMetrics.totalAttQuality);

    // Penalize per-zone quality imbalances, but less harshly than in even stars
    const perZoneQualityPenalty = (
        Math.pow(defQualityDiff / 100, 1.1) * 0.15 +
        Math.pow(midQualityDiff / 100, 1.1) * 0.12 + // Mids slightly less important
        Math.pow(attQualityDiff / 100, 1.1) * 0.15
    ) * ODD_STAR_SCALE;

    // Total quality skew penalty (overall balance still important)
    const teamATotalQuality = teamAMetrics.totalDefQuality + teamAMetrics.totalMidQuality + teamAMetrics.totalAttQuality;
    const teamBTotalQuality = teamBMetrics.totalDefQuality + teamBMetrics.totalMidQuality + teamBMetrics.totalAttQuality;
    const totalQualityDiff = Math.abs(teamATotalQuality - teamBTotalQuality);
    const totalQualitySkewPenalty = Math.pow(totalQualityDiff / 100, 1.2) * 0.30 * ODD_STAR_SCALE; // Increased from 0.25

    // Unevenly sized teams penalty (inherent with odd stars, but minimal)
    const unevenStarCountPenalty = Math.abs(teamAClassifications.length - teamBClassifications.length) > 0 ? 0.05 * ODD_STAR_SCALE : 0;

    // Combine all penalties
    const totalPenalty = individualQualityPenalty + variancePenalty + highVariancePenalty +
                        specialistDistributionPenalty + specialistQualityImbalancePenalty +
                        specialistPairingPenalty +
                        directionalClusteringPenalty + specialistDirectionalPenalty +
                        perZoneQualityPenalty + totalQualitySkewPenalty + unevenStarCountPenalty;

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
        teamAMidQuality: teamAMetrics.totalMidQuality,
        teamAAttQuality: teamAMetrics.totalAttQuality,
        teamBDefQuality: teamBMetrics.totalDefQuality,
        teamBMidQuality: teamBMetrics.totalMidQuality,
        teamBAttQuality: teamBMetrics.totalAttQuality,
        teamATotalQuality,
        teamBTotalQuality,
        teamAAvgBestScore,
        teamBAvgBestScore,
        teamAAvgRating,
        teamBAvgRating,
        teamAStdDev,
        teamBStdDev,
        teamAZoneWins,
        teamBZoneWins,
        neutralZones,
        individualQualityPenalty,
        variancePenalty,
        highVariancePenalty,
        directionalClusteringPenalty,
        specialistDirectionalPenalty,
        totalQualitySkewPenalty,
        unevenStarCountPenalty,
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
    teamADefQuality: number;
    teamAMidQuality: number;
    teamAAttQuality: number;
    teamBDefQuality: number;
    teamBMidQuality: number;
    teamBAttQuality: number;
    teamATotalQuality: number;
    teamBTotalQuality: number;
    teamAAvgBestScore: number;
    teamBAvgBestScore: number;
    teamAAvgRating: number;
    teamBAvgRating: number;
    teamAStdDev: number;
    teamBStdDev: number;
    teamAZoneWins: number;
    teamBZoneWins: number;
    neutralZones: number;
    individualQualityPenalty: number;
    variancePenalty: number;
    highVariancePenalty: number;
    directionalClusteringPenalty: number;
    specialistDirectionalPenalty: number;
    totalQualitySkewPenalty: number;
    unevenStarCountPenalty: number;
} {
    const totalStars = teamAClassifications.length + teamBClassifications.length;

    // Route to appropriate penalty calculation based on odd/even
    if (totalStars % 2 === 1) {
        return calculateStarDistributionPenaltyOddStars(teamAClassifications, teamBClassifications);
    }

    // EVEN STARS: Continue with normal harsh penalties
    const config = STAR_DISTRIBUTION_PENALTY_CONFIG;

    // Calculate metrics for both teams (NEW 4-category position-based approach)
    const teamAMetrics = calculateTeamStarMetrics(teamAClassifications);
    const teamBMetrics = calculateTeamStarMetrics(teamBClassifications);

    // 1. INDIVIDUAL PLAYER QUALITY BALANCE (CRITICAL!)
    // Check if one team is getting the "better" individual stars overall

    // Calculate average bestScore for each team's stars
    let teamABestScoreSum = 0;
    let teamBBestScoreSum = 0;

    for (const c of teamAClassifications) {
        teamABestScoreSum += c.player.bestScore;
    }
    for (const c of teamBClassifications) {
        teamBBestScoreSum += c.player.bestScore;
    }

    const teamAAvgBestScore = teamAClassifications.length > 0 ? teamABestScoreSum / teamAClassifications.length : 0;
    const teamBAvgBestScore = teamBClassifications.length > 0 ? teamBBestScoreSum / teamBClassifications.length : 0;

    // Calculate average of averageScore (versatility metric - for variance calculation only)
    let teamAAvgRatingSum = 0;
    let teamBAvgRatingSum = 0;

    for (const c of teamAClassifications) {
        teamAAvgRatingSum += c.averageScore;
    }
    for (const c of teamBClassifications) {
        teamBAvgRatingSum += c.averageScore;
    }

    const teamAAvgRating = teamAClassifications.length > 0 ? teamAAvgRatingSum / teamAClassifications.length : 0;
    const teamBAvgRating = teamBClassifications.length > 0 ? teamBAvgRatingSum / teamBClassifications.length : 0;

    // Penalize differences in average bestScore (peak individual quality)
    // This is THE key metric for measuring if one team got better individual players
    // For individual player averages, differences of 1-5 points are significant!
    // Use a divisor of 10 instead of 100, and gentler power scaling (1.2 instead of 1.5)
    const avgBestScoreDiff = Math.abs(teamAAvgBestScore - teamBAvgBestScore);
    const normalizedBestScoreDiff = avgBestScoreDiff / 10; // 3-point diff = 0.3 (meaningful!)
    const individualQualityPenalty = Math.pow(normalizedBestScoreDiff, 1.2) * 0.60; // Increased weight from 0.40 to 0.60!

    // Calculate variance in individual player quality (detect "spiky" vs "flat" teams)
    // A team with [1st, 2nd, 6th] best players is "spiky" (high variance in avgRating)
    // A team with [3rd, 4th, 5th] best players is "flat" (low variance in avgRating)
    let teamAVariance = 0;
    for (const c of teamAClassifications) {
        teamAVariance += Math.pow(c.averageScore - teamAAvgRating, 2);
    }
    teamAVariance = teamAClassifications.length > 0 ? teamAVariance / teamAClassifications.length : 0;
    const teamAStdDev = Math.sqrt(teamAVariance);

    let teamBVariance = 0;
    for (const c of teamBClassifications) {
        teamBVariance += Math.pow(c.averageScore - teamBAvgRating, 2);
    }
    teamBVariance = teamBClassifications.length > 0 ? teamBVariance / teamBClassifications.length : 0;
    const teamBStdDev = Math.sqrt(teamBVariance);

    // Penalize imbalance in variance (one team is "spiky", other is "flat")
    // Spiky teams have unfair distribution - one superstar carrying weak players
    const varianceDiff = Math.abs(teamAStdDev - teamBStdDev);
    const normalizedVarianceDiff = varianceDiff / 5; // Std dev of 2-3 points is normal
    const variancePenalty = Math.pow(normalizedVarianceDiff, 1.0) * 0.15;

    // Also penalize teams with HIGH variance (spiky is bad regardless of balance)
    const avgStdDev = (teamAStdDev + teamBStdDev) / 2;
    const highVariancePenalty = avgStdDev > 3.0 ? Math.pow((avgStdDev - 3.0) / 5, 1.0) * 0.10 : 0;

    // 2. QUALITY PENALTIES (per-zone)
    const defQualityDiff = Math.abs(teamAMetrics.totalDefQuality - teamBMetrics.totalDefQuality);
    const midQualityDiff = Math.abs(teamAMetrics.totalMidQuality - teamBMetrics.totalMidQuality);
    const attQualityDiff = Math.abs(teamAMetrics.totalAttQuality - teamBMetrics.totalAttQuality);

    // Quality values are TOTALS across all stars
    // For 2-3 stars with ~90 rating each: total quality ~180-270
    const qualityNormalizationFactor = 100;

    const normalizedDefQualityDiff = defQualityDiff / qualityNormalizationFactor;
    const normalizedMidQualityDiff = midQualityDiff / qualityNormalizationFactor;
    const normalizedAttQualityDiff = attQualityDiff / qualityNormalizationFactor;

    const defQualityPenalty = Math.pow(normalizedDefQualityDiff, config.quality.power) * config.quality.defensiveWeight;
    const midQualityPenalty = Math.pow(normalizedMidQualityDiff, config.quality.power) * config.quality.midfieldWeight;
    const attQualityPenalty = Math.pow(normalizedAttQualityDiff, config.quality.power) * config.quality.attackingWeight;

    // 3. OVERALL QUALITY SKEW PENALTY
    // Check if one team has consistently higher quality across ALL zones
    const teamATotalQuality = teamAMetrics.totalDefQuality + teamAMetrics.totalMidQuality + teamAMetrics.totalAttQuality;
    const teamBTotalQuality = teamBMetrics.totalDefQuality + teamBMetrics.totalMidQuality + teamBMetrics.totalAttQuality;
    const totalQualityDiff = Math.abs(teamATotalQuality - teamBTotalQuality);
    const normalizedTotalQualityDiff = totalQualityDiff / (qualityNormalizationFactor * 3); // 3 zones
    const totalQualitySkewPenalty = Math.pow(normalizedTotalQualityDiff, config.quality.power) * 0.25;

    // 4. PER-ZONE DIRECTIONAL WINNER TRACKING
    // Track which team wins each zone (not just the difference)
    let teamAZoneWins = 0;
    let teamBZoneWins = 0;
    let neutralZones = 0;

    // Threshold for considering a zone "neutral" (within 5% of normalization factor)
    const zoneNeutralThreshold = qualityNormalizationFactor * 0.05;

    if (Math.abs(teamAMetrics.totalDefQuality - teamBMetrics.totalDefQuality) <= zoneNeutralThreshold) {
        neutralZones++;
    } else if (teamAMetrics.totalDefQuality > teamBMetrics.totalDefQuality) {
        teamAZoneWins++;
    } else {
        teamBZoneWins++;
    }

    if (Math.abs(teamAMetrics.totalMidQuality - teamBMetrics.totalMidQuality) <= zoneNeutralThreshold) {
        neutralZones++;
    } else if (teamAMetrics.totalMidQuality > teamBMetrics.totalMidQuality) {
        teamAZoneWins++;
    } else {
        teamBZoneWins++;
    }

    if (Math.abs(teamAMetrics.totalAttQuality - teamBMetrics.totalAttQuality) <= zoneNeutralThreshold) {
        neutralZones++;
    } else if (teamAMetrics.totalAttQuality > teamBMetrics.totalAttQuality) {
        teamAZoneWins++;
    } else {
        teamBZoneWins++;
    }

    // 5. DIRECTIONAL CLUSTERING PENALTY
    // Heavily penalize when one team wins multiple/all zones
    const maxZoneWins = Math.max(teamAZoneWins, teamBZoneWins);
    let directionalClusteringPenalty = 0;

    if (maxZoneWins === 3) {
        // 3-0 zone split: one team dominates all zones (catastrophic!)
        directionalClusteringPenalty = 0.50; // 50% penalty
    } else if (maxZoneWins === 2 && neutralZones === 0) {
        // 2-1 zone split: strong directional imbalance
        directionalClusteringPenalty = 0.30; // 30% penalty
    } else if (maxZoneWins === 2 && neutralZones === 1) {
        // 2-0-1 split: two zones favor one team, one neutral
        directionalClusteringPenalty = 0.20; // 20% penalty
    }
    // else: 1-1-1 or 0-0-3 (balanced) gets no penalty

    // 6. SPECIALIST DISTRIBUTION PENALTY (CRITICAL!)
    // This is THE MOST IMPORTANT metric for team balance!
    //
    // Key Rules:
    // 1. Def/Att specialists should be PAIRED on same team (they cancel each other out)
    // 2. Midfielders/All-rounders should be on the OTHER team (balance)
    // 3. Even splits are MANDATORY - any imbalance is heavily penalized
    // 4. Odd total specialists: 1-diff is acceptable but needs compensation

    const defDiff = Math.abs(teamAMetrics.defSpecialistCount - teamBMetrics.defSpecialistCount);
    const attDiff = Math.abs(teamAMetrics.attSpecialistCount - teamBMetrics.attSpecialistCount);
    const midDiff = Math.abs(teamAMetrics.midfielderCount - teamBMetrics.midfielderCount);

    // Count total specialists to detect odd/even cases
    const totalDefSpecialists = teamAMetrics.defSpecialistCount + teamBMetrics.defSpecialistCount;
    const totalAttSpecialists = teamAMetrics.attSpecialistCount + teamBMetrics.attSpecialistCount;
    const totalMidfielders = teamAMetrics.midfielderCount + teamBMetrics.midfielderCount;
    const totalSpecialists = totalDefSpecialists + totalAttSpecialists + totalMidfielders;

    let specialistDistributionPenalty = 0;

    // A. UNEVEN SPECIALIST SPLITS (SEVERE PENALTY!)
    // For even totals: difference > 0 is unacceptable
    // For odd totals: difference > 1 is unacceptable

    if (totalDefSpecialists % 2 === 0 && defDiff > 0) {
        // Even number of def specialists but uneven split - CATASTROPHIC!
        specialistDistributionPenalty += 0.80; // 80% penalty - almost disqualifying
    } else if (totalDefSpecialists % 2 === 1 && defDiff > 1) {
        // Odd number but difference is 2+ - still very bad
        specialistDistributionPenalty += 0.60;
    } else if (totalDefSpecialists % 2 === 1 && defDiff === 1) {
        // Odd number with 1-diff - acceptable but needs quality compensation
        specialistDistributionPenalty += 0.05; // Small penalty to prefer even when possible
    }

    if (totalAttSpecialists % 2 === 0 && attDiff > 0) {
        // Even number of att specialists but uneven split - CATASTROPHIC!
        specialistDistributionPenalty += 0.80;
    } else if (totalAttSpecialists % 2 === 1 && attDiff > 1) {
        // Odd number but difference is 2+ - very bad
        specialistDistributionPenalty += 0.60;
    } else if (totalAttSpecialists % 2 === 1 && attDiff === 1) {
        // Odd number with 1-diff - acceptable but needs compensation
        specialistDistributionPenalty += 0.05;
    }

    if (totalMidfielders % 2 === 0 && midDiff > 0) {
        // Even number of midfielders but uneven split - SEVERE!
        specialistDistributionPenalty += 0.60; // Slightly less critical than def/att
    } else if (totalMidfielders % 2 === 1 && midDiff > 1) {
        // Odd number but difference is 2+
        specialistDistributionPenalty += 0.40;
    } else if (totalMidfielders % 2 === 1 && midDiff === 1) {
        // Odd number with 1-diff - acceptable
        specialistDistributionPenalty += 0.03;
    }

    // B. SPECIALIST PAIRING PENALTY
    // Def + Att specialists should be on SAME team (they balance each other)
    // Check if they're incorrectly split across teams

    let specialistPairingPenalty = 0;

    // If we have both def and att specialists, check their distribution
    if (totalDefSpecialists > 0 && totalAttSpecialists > 0) {
        // Ideal: If Team A has def specialists, they should also have att specialists
        // Bad: Team A has all def, Team B has all att (they don't cancel out)

        // Check if specialists are concentrated on opposite teams
        const teamAHasMoreDef = teamAMetrics.defSpecialistCount > teamBMetrics.defSpecialistCount;
        const teamAHasMoreAtt = teamAMetrics.attSpecialistCount > teamBMetrics.attSpecialistCount;

        // If opposite specialists lean to opposite teams, that's wrong!
        if (teamAHasMoreDef !== teamAHasMoreAtt && defDiff > 0 && attDiff > 0) {
            // They're leaning opposite directions - heavily penalize
            const avgImbalance = (defDiff + attDiff) / 2;
            specialistPairingPenalty = Math.min(0.50, avgImbalance * 0.25); // Up to 50% penalty
        }
    }

    // C. DIRECTIONAL SPECIALIST CLUSTERING
    // One team having more specialists in ALL categories is very bad
    let teamASpecialistAdvantages = 0;
    let teamBSpecialistAdvantages = 0;

    if (teamAMetrics.defSpecialistCount > teamBMetrics.defSpecialistCount) teamASpecialistAdvantages++;
    else if (teamBMetrics.defSpecialistCount > teamAMetrics.defSpecialistCount) teamBSpecialistAdvantages++;

    if (teamAMetrics.attSpecialistCount > teamBMetrics.attSpecialistCount) teamASpecialistAdvantages++;
    else if (teamBMetrics.attSpecialistCount > teamAMetrics.attSpecialistCount) teamBSpecialistAdvantages++;

    if (teamAMetrics.midfielderCount > teamBMetrics.midfielderCount) teamASpecialistAdvantages++;
    else if (teamBMetrics.midfielderCount > teamAMetrics.midfielderCount) teamBSpecialistAdvantages++;

    const maxSpecialistAdvantages = Math.max(teamASpecialistAdvantages, teamBSpecialistAdvantages);
    let specialistDirectionalPenalty = 0;

    // Only apply if total is even (for odd totals, 1-diff is unavoidable)
    if (totalSpecialists % 2 === 0) {
        if (maxSpecialistAdvantages === 3) {
            specialistDirectionalPenalty = 0.50; // 50% - one team has all types
        } else if (maxSpecialistAdvantages === 2) {
            specialistDirectionalPenalty = 0.25; // 25% - one team dominates
        }
    } else {
        // Odd total - be more lenient
        if (maxSpecialistAdvantages === 3) {
            specialistDirectionalPenalty = 0.30; // Still bad but unavoidable
        } else if (maxSpecialistAdvantages === 2) {
            specialistDirectionalPenalty = 0.10; // Mild penalty
        }
    }

    // Combine all specialist penalties
    const totalSpecialistPenalty = specialistDistributionPenalty + specialistPairingPenalty + specialistDirectionalPenalty;

    // 7. UNEVEN STAR COUNT DIRECTIONAL PENALTY
    // When star counts are uneven (3v2), the team with FEWER stars MUST have better quality
    let unevenStarCountPenalty = 0;
    const starCountA = teamAClassifications.length;
    const starCountB = teamBClassifications.length;

    if (config.unevenStarCount.enabled && starCountA !== starCountB) {
        const teamWithMore = starCountA > starCountB ? 'A' : 'B';
        const moreTeamHasHigherQuality = teamWithMore === 'A'
            ? teamAAvgBestScore >= teamBAvgBestScore
            : teamBAvgBestScore >= teamAAvgBestScore;

        if (moreTeamHasHigherQuality) {
            const qualityDiff = teamWithMore === 'A'
                ? teamAAvgBestScore - teamBAvgBestScore
                : teamBAvgBestScore - teamAAvgBestScore;
            const normalizedDiff = Math.max(0, qualityDiff) / 10;
            unevenStarCountPenalty = Math.pow(normalizedDiff, config.unevenStarCount.power) * config.unevenStarCount.weight;
        }
    }

    // 8. TOTAL PENALTY
    // NOTE: Specialist penalties can be > 1.0 (disqualifying) for severe imbalances!
    const totalPenalty = individualQualityPenalty +
        variancePenalty +
        highVariancePenalty +
        defQualityPenalty +
        midQualityPenalty +
        attQualityPenalty +
        totalQualitySkewPenalty +
        directionalClusteringPenalty +
        totalSpecialistPenalty + // CRITICAL! Can exceed 1.0
        unevenStarCountPenalty;
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
        teamAMidQuality: teamAMetrics.totalMidQuality,
        teamAAttQuality: teamAMetrics.totalAttQuality,
        teamBDefQuality: teamBMetrics.totalDefQuality,
        teamBMidQuality: teamBMetrics.totalMidQuality,
        teamBAttQuality: teamBMetrics.totalAttQuality,
        teamATotalQuality,
        teamBTotalQuality,
        teamAAvgBestScore,
        teamBAvgBestScore,
        teamAAvgRating,
        teamBAvgRating,
        teamAStdDev,
        teamBStdDev,
        teamAZoneWins,
        teamBZoneWins,
        neutralZones,
        individualQualityPenalty,
        variancePenalty,
        highVariancePenalty,
        directionalClusteringPenalty,
        specialistDirectionalPenalty,
        totalQualitySkewPenalty,
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

    if (combinations.length === 0) {
        return 1.0;
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

        // if (result.penalty > 0.4) {
        //     console.log("==============Start Optimal Run==================", result.penalty);
        //     teamAIndices.forEach((i => {
        //         console.log("A: ", classifications[i]);
        //     }));

        //     teamBIndices.forEach((i => {
        //         console.log("B: ", classifications[i]);
        //     }));

        //     console.log("Score", result.penalty);

        //     console.log("==============End Optimal Run==================", result.penalty);
        // }
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
        console.log('');
        console.log(`  Team A Stars: ${distA.totalStars} total`);
        console.log(`    Defensive specialists: ${result.teamADefSpecialists}`);
        console.log(`    Attacking specialists: ${result.teamAAttSpecialists}`);
        console.log(`    Midfielders: ${result.teamAMidfielders}`);
        console.log(`    All-rounders: ${result.teamAAllRounders}`);
        console.log(`    Average Best Score (peak): ${result.teamAAvgBestScore.toFixed(1)}`);
        console.log(`    Average Rating (overall): ${result.teamAAvgRating.toFixed(1)}`);
        console.log(`    Total Defensive Quality: ${result.teamADefQuality.toFixed(1)}`);
        console.log(`    Total Midfield Quality: ${result.teamAMidQuality.toFixed(1)}`);
        console.log(`    Total Attacking Quality: ${result.teamAAttQuality.toFixed(1)}`);
        console.log(`    TOTAL QUALITY (all zones): ${result.teamATotalQuality.toFixed(1)}`);
        console.log('');

        console.log(`  Team B Stars: ${distB.totalStars} total`);
        console.log(`    Defensive specialists: ${result.teamBDefSpecialists}`);
        console.log(`    Attacking specialists: ${result.teamBAttSpecialists}`);
        console.log(`    Midfielders: ${result.teamBMidfielders}`);
        console.log(`    All-rounders: ${result.teamBAllRounders}`);
        console.log(`    Average Best Score (peak): ${result.teamBAvgBestScore.toFixed(1)}`);
        console.log(`    Average Rating (overall): ${result.teamBAvgRating.toFixed(1)}`);
        console.log(`    Total Defensive Quality: ${result.teamBDefQuality.toFixed(1)}`);
        console.log(`    Total Midfield Quality: ${result.teamBMidQuality.toFixed(1)}`);
        console.log(`    Total Attacking Quality: ${result.teamBAttQuality.toFixed(1)}`);
        console.log(`    TOTAL QUALITY (all zones): ${result.teamBTotalQuality.toFixed(1)}`);
        console.log('');

        console.log(`  ═══════════════════════════════════════════════════════════`);
        console.log(`  INDIVIDUAL PLAYER QUALITY (MOST IMPORTANT!):`);
        console.log(`  ═══════════════════════════════════════════════════════════`);
        console.log(`    Team A Avg Best Score: ${result.teamAAvgBestScore.toFixed(1)}`);
        console.log(`    Team B Avg Best Score: ${result.teamBAvgBestScore.toFixed(1)}`);
        console.log(`    Best Score Diff: ${Math.abs(result.teamAAvgBestScore - result.teamBAvgBestScore).toFixed(1)}`);
        console.log(`    Individual Quality Penalty: ${result.individualQualityPenalty.toFixed(3)} (0.60 weight) ${result.individualQualityPenalty > 0.05 ? '⚠️ MAJOR IMBALANCE' : '✓'}`);
        console.log('');
        console.log(`    Variance Analysis (based on averageScore across all positions):`);
        console.log(`    Team A Avg Rating: ${result.teamAAvgRating.toFixed(1)} (σ=${result.teamAStdDev.toFixed(1)}) ${result.teamAStdDev > 3.0 ? '(SPIKY ⚠️)' : '(flat)'}`);
        console.log(`    Team B Avg Rating: ${result.teamBAvgRating.toFixed(1)} (σ=${result.teamBStdDev.toFixed(1)}) ${result.teamBStdDev > 3.0 ? '(SPIKY ⚠️)' : '(flat)'}`);
        console.log(`    Variance Imbalance Penalty: ${result.variancePenalty.toFixed(3)} (0.15 weight)`);
        console.log(`    High Variance Penalty: ${result.highVariancePenalty.toFixed(3)} (0.10 weight)`);
        console.log('');

        console.log(`  Quality Imbalances (Per-Zone):`);
        console.log(`    Defensive quality diff: ${Math.abs(result.teamADefQuality - result.teamBDefQuality).toFixed(1)}`);
        console.log(`    Midfield quality diff: ${Math.abs(result.teamAMidQuality - result.teamBMidQuality).toFixed(1)}`);
        console.log(`    Attacking quality diff: ${Math.abs(result.teamAAttQuality - result.teamBAttQuality).toFixed(1)}`);
        console.log('');

        console.log(`  OVERALL QUALITY SKEW:`);
        console.log(`    Total quality diff: ${Math.abs(result.teamATotalQuality - result.teamBTotalQuality).toFixed(1)}`);
        console.log(`    Total quality skew penalty: ${result.totalQualitySkewPenalty.toFixed(3)} (0.25 weight)`);
        const qualityWinner = result.teamATotalQuality > result.teamBTotalQuality ? 'Team A' :
            result.teamBTotalQuality > result.teamATotalQuality ? 'Team B' : 'Balanced';
        console.log(`    Winner: ${qualityWinner} ${qualityWinner !== 'Balanced' ? '⚠️ SKEWED' : '✓'}`);
        console.log('');

        console.log(`  PER-ZONE DIRECTIONAL BALANCE:`);
        console.log(`    DEF winner: ${result.teamADefQuality > result.teamBDefQuality ? 'Team A' : result.teamBDefQuality > result.teamADefQuality ? 'Team B' : 'Neutral'}`);
        console.log(`    MID winner: ${result.teamAMidQuality > result.teamBMidQuality ? 'Team A' : result.teamBMidQuality > result.teamAMidQuality ? 'Team B' : 'Neutral'}`);
        console.log(`    ATT winner: ${result.teamAAttQuality > result.teamBAttQuality ? 'Team A' : result.teamBAttQuality > result.teamAAttQuality ? 'Team B' : 'Neutral'}`);
        console.log(`    Zone wins: Team A=${result.teamAZoneWins}, Team B=${result.teamBZoneWins}, Neutral=${result.neutralZones}`);
        console.log(`    Directional clustering penalty: ${result.directionalClusteringPenalty.toFixed(3)}`);
        const maxZoneWins = Math.max(result.teamAZoneWins, result.teamBZoneWins);
        if (maxZoneWins === 3) {
            console.log(`    Status: 3-0 ZONE SWEEP ⚠️⚠️⚠️ CATASTROPHIC`);
        } else if (maxZoneWins === 2) {
            console.log(`    Status: 2-${result.neutralZones > 0 ? '0-1' : '1'} zone split ⚠️ IMBALANCED`);
        } else {
            console.log(`    Status: Balanced ✓`);
        }
        console.log('');

        console.log(`  SPECIALIST COUNT IMBALANCES:`);
        console.log(`    Def specialist count diff: ${Math.abs(result.teamADefSpecialists - result.teamBDefSpecialists)}`);
        console.log(`    Att specialist count diff: ${Math.abs(result.teamAAttSpecialists - result.teamBAttSpecialists)}`);
        console.log(`    Midfielder count diff: ${Math.abs(result.teamAMidfielders - result.teamBMidfielders)}`);
        console.log(`    Specialist directional penalty: ${result.specialistDirectionalPenalty.toFixed(3)}`);
        console.log('');

        console.log(`  FINAL PENALTY: ${result.penalty.toFixed(3)}`);
        console.log('');

        if (distA.classifications.length > 0) {
            console.log('  Team A Star Classifications:');
            for (const c of distA.classifications) {
                const playerName = c.player.original.guest_name || c.player.original.id;
                console.log(`    ${playerName}: ${c.specialistType} (DEF:${c.bestDefensiveScore.toFixed(1)}, MID:${c.bestMidfieldScore.toFixed(1)}, ATT:${c.bestAttackingScore.toFixed(1)})`);
            }
        }

        if (distB.classifications.length > 0) {
            console.log('  Team B Star Classifications:');
            for (const c of distB.classifications) {
                const playerName = c.player.original.guest_name || c.player.original.id;
                console.log(`    ${playerName}: ${c.specialistType} (DEF:${c.bestDefensiveScore.toFixed(1)}, MID:${c.bestMidfieldScore.toFixed(1)}, ATT:${c.bestAttackingScore.toFixed(1)})`);
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