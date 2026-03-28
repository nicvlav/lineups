/**
 * Auto-Balance Metrics — Star Penalty System
 *
 * Penalty calculations and optimal distribution orchestrators for star player
 * distribution. Includes the legacy specialist-based penalty system and the
 * extended optimal distribution calculator.
 *
 * @module auto-balance/metrics-star-penalty
 */

import { logger } from "@/lib/logger";
import { classifyPlayerByZone } from "@/lib/player-quality";
import { getFormationsForCount } from "@/types/formations";
import type { Position, StarZoneClassification } from "@/types/positions";
import { ENABLE_DEBUG } from "./constants";
import type { BalanceConfiguration } from "./metrics-config";
import { calculateBasicDifferenceRatio, generateCombinations } from "./metrics-helpers";
import {
    analyzePoolCharacteristics,
    calculateDynamicStrictness,
    generateRankedStarSplits,
} from "./metrics-star-scoring";
import { calculateZoneAffinity } from "./metrics-zone-affinity";
import type {
    DynamicStrictness,
    ExtendedOptimalStats,
    FastPlayer,
    FastTeam,
    PoolCharacteristics,
    TeamStarDistribution,
    ZoneAffinityProfile,
} from "./types";

/**
 * Star distribution penalty weights
 *
 * Philosophy: penalties are multiplicative — a single bad dimension tanks
 * the overall score, which forces the optimizer to find globally balanced splits
 * rather than splits that ace one metric and ignore others.
 *
 * Even splits demand strict symmetry because a perfect 50/50 is achievable.
 * Odd splits relax structural penalties (count, zone) and lean harder on
 * quality balance so the smaller team compensates with better individual players.
 *
 * Weights are empirically calibrated against 18–22 player pools. When tuning,
 * change one weight at a time and compare ranked splits before/after.
 */
const PENALTY_WEIGHTS = {
    /**
     * EVEN STAR CONFIGURATION
     * Perfect balance is achievable and required
     */
    even: {
        // ========== QUALITY-BASED PENALTIES ==========
        /** Average best score difference - prevents one team getting "better" individual players */
        individualQuality: 0.7, // Increased from 0.60

        /** Grand total quality skew - sum of all zone best scores must balance */
        totalQualitySkew: 0.4, // Increased from 0.25 - CRITICAL for quality balance!

        /** Per-zone quality penalties (best scores summed per zone) */
        zoneQualityDef: 0.2,
        zoneQualityMid: 0.15,
        zoneQualityAtt: 0.2,

        /** Variance penalties - prevent "spiky" vs "flat" team compositions */
        varianceImbalance: 0.15, // Std dev difference between teams
        highVariance: 0.1, // Penalty for overall high variance (spiky teams)

        // ========== SPECIALIST DISTRIBUTION PENALTIES ==========
        /** Uneven specialist splits (CATASTROPHIC - can be disqualifying) */
        specialistUneven: 0.8, // Even split is MANDATORY for even totals

        /** Specialist pairing penalty (def/att should be on same team) */
        specialistPairing: 0.5,

        /** Specialist directional clustering (one team gets all types) */
        specialistDirectional: 0.5,

        // ========== DIRECTIONAL CLUSTERING PENALTIES ==========
        /** Zone clustering penalties (prevent 3-0, 2-1 zone sweeps) */
        zoneClusteringTotal: 0.5, // 3-0 sweep
        zoneClusteringMajor: 0.3, // 2-1 split
        zoneClusteringMinor: 0.2, // 2-0-1 split

        // ========== NORMALIZATION & SCALING ==========
        /** Normalization factor for quality differences */
        qualityNormalization: 100,

        /** Normalization factor for variance differences */
        varianceNormalization: 5,

        /** Power scaling for quality penalties */
        qualityPower: 1.3, // Increased from 1.2 for stronger scaling

        /** Power scaling for specialist imbalances */
        specialistPower: 1.5,
    },

    /**
     * ODD STAR CONFIGURATION
     * Some imbalance is unavoidable (e.g., 3v2), focus on quality equivalency
     */
    odd: {
        /** Base scale multiplier - all penalties scaled down for odd scenarios */
        scale: 0.5, // Increased from 0.40 to strengthen penalties

        // ========== QUALITY-BASED PENALTIES ==========
        /** Individual quality balance - MORE IMPORTANT for odd since structural balance is impossible */
        individualQuality: 0.6, // Increased from 0.45

        /** Grand total quality skew - MOST IMPORTANT for odd stars! */
        totalQualitySkew: 0.5, // DOUBLED from 0.25 - ensures total quality equivalency

        /** Per-zone quality penalties (less strict than even) */
        zoneQualityDef: 0.15,
        zoneQualityMid: 0.1,
        zoneQualityAtt: 0.15,

        /** Variance penalties */
        varianceImbalance: 0.12,
        highVariance: 0.08,

        // ========== SPECIALIST DISTRIBUTION PENALTIES ==========
        /** Uneven specialist splits (acceptable for odd, penalize 2+ diff) */
        specialistUneven: 0.8, // Same as even, but 1-diff is allowed

        /** Specialist pairing (less strict) */
        specialistPairing: 0.4,

        /** Specialist directional clustering */
        specialistDirectional: 0.3,

        /** Quality compensation for 1-diff specialists */
        specialistQualityComp: 0.15, // Penalize when smaller team gets worse quality

        // ========== DIRECTIONAL CLUSTERING PENALTIES ==========
        zoneClusteringTotal: 0.4,
        zoneClusteringMajor: 0.2,

        // ========== NORMALIZATION & SCALING ==========
        qualityNormalization: 100,
        varianceNormalization: 5,

        /** Stronger quality power for odd (quality matters MORE) */
        qualityPower: 1.4, // Increased from 1.2

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
    bestScoreSum: number;
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
            bestScore: 0,
            bestScoreSum: 0,
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

    let bestScoreSum = 0;

    // Count specialists and accumulate quality
    for (const c of classifications) {
        // Count specialist types
        if (c.specialistType === "Defender") {
            defSpecialistCount++;
        } else if (c.specialistType === "Attacker") {
            attSpecialistCount++;
        } else if (c.specialistType === "Midfielder") {
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
        bestScoreSum += c.bestScore;
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
        bestScore: Math.max(bestDefScore, bestMidScore, bestAttScore),
        bestScoreSum,
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

    const diffPenalty = oddTotal ? defDiff * midDiff * attDiff : defDiff ** 4 * midDiff ** 4 * attDiff ** 4;

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

    let generalQualityPenalty = 0.0;
    if (oddTotal) {
        specialistDistributionPenalty *= 0.5;
        const aIsSmaller = teamAClassifications.length < teamBClassifications.length;
        teamAClassifications.length + teamBClassifications.length;
        const smaller = aIsSmaller ? teamAMetrics : teamBMetrics;
        const larger = aIsSmaller ? teamBMetrics : teamAMetrics;

        if (smaller.bestDefScore < larger.bestDefScore) {
            generalQualityPenalty += 0.2;
        }

        if (smaller.bestMidScore < larger.bestMidScore) {
            generalQualityPenalty += 0.2;
        }

        if (smaller.bestAttScore < larger.bestAttScore) {
            generalQualityPenalty += 0.2;
        }

        if (smaller.bestScore < larger.bestScore) {
            generalQualityPenalty += 0.2;
        }
    } else {
        generalQualityPenalty =
            1.0 - calculateBasicDifferenceRatio(teamAMetrics.bestScoreSum, teamBMetrics.bestScoreSum) ** 10;
    }

    // 10. TOTAL PENALTY CALCULATION
    const totalPenalty =
        diffPenalty * specialistPairingPenalty * (1.0 - specialistDistributionPenalty) * (1.0 - generalQualityPenalty);
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

                if (classification.specialistType === "Defender") {
                    defensiveSpecialists++;
                } else if (classification.specialistType === "Attacker") {
                    attackingSpecialists++;
                } else if (classification.specialistType === "Midfielder") {
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

    const shaped = normalized ** exponent;

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
    const formations = getFormationsForCount(Math.floor(players.length / 2));
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
    const classifications = starPlayers.map((p) => classifyPlayerByZone(p.original.zoneFit, availablePositions));

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
    let indices = combinations[0];

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
        const teamAClassifications = teamAIndices.map((i) => classifications[i]);
        const teamBClassifications = teamBIndices.map((i) => classifications[i]);

        const result = calculateStarDistributionPenalty(teamAClassifications, teamBClassifications);

        if (ENABLE_DEBUG && result.penalty > 0.3) {
            logger.debug("==============Start Optimal Run==================", result.penalty);
            let aAttSum = 0;
            let aMidSum = 0;
            let aDefSum = 0;
            let aBestScore = 0;

            let bAttSum = 0;
            let bMidSum = 0;
            let bDefSum = 0;
            let bBestScore = 0;

            teamAIndices.forEach((i) => {
                logger.debug(`A => type: ${classifications[i].specialistType} | best: ${classifications[i].bestScore}`);

                aAttSum += classifications[i].bestAttackingScore;
                aMidSum += classifications[i].bestMidfieldScore;
                aDefSum += classifications[i].bestDefensiveScore;
                aBestScore += classifications[i].bestScore;
            });

            teamBIndices.forEach((i) => {
                logger.debug(`B => type: ${classifications[i].specialistType} | best: ${classifications[i].bestScore}`);

                bAttSum += classifications[i].bestAttackingScore;
                bMidSum += classifications[i].bestMidfieldScore;
                bDefSum += classifications[i].bestDefensiveScore;
                bBestScore += classifications[i].bestScore;
            });

            logger.debug(
                `def  => A: ${aDefSum.toFixed(1)} | B: ${bDefSum.toFixed(1)} | Ratio: ${calculateBasicDifferenceRatio(aDefSum, bDefSum).toFixed(4)}`
            );
            logger.debug(
                `mid  => A: ${aMidSum.toFixed(1)} | B: ${bMidSum.toFixed(1)} | Ratio: ${calculateBasicDifferenceRatio(aMidSum, bMidSum).toFixed(4)}`
            );
            logger.debug(
                `att  => A: ${aAttSum.toFixed(1)} | B: ${bAttSum.toFixed(1)} | Ratio: ${calculateBasicDifferenceRatio(aAttSum, bAttSum).toFixed(4)}`
            );
            logger.debug(
                `best => A: ${aBestScore.toFixed(1)} | B: ${bBestScore.toFixed(1)} | Ratio: ${calculateBasicDifferenceRatio(aBestScore, bBestScore).toFixed(4)}`
            );

            logger.debug("==============End Optimal Run==================", result.penalty);
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

        indices.forEach((i) => {
            logger.debug("A: ", classifications[i]);
        });

        bIndices.forEach((i) => {
            logger.debug("B: ", classifications[i]);
        });
    }

    const avgPenalty = totalPenalties / combinations.length;

    logger.debug(`[calculateOptimalStarDistribution] ${numStars} stars, ${combinations.length} combinations`);
    logger.debug(`  Best: ${bestPenalty.toFixed(4)}, Worst: ${worstPenalty.toFixed(4)}, Avg: ${avgPenalty.toFixed(4)}`);
    logger.debug(
        `  Zero penalties: ${zeroCount}/${combinations.length} (${((100 * zeroCount) / combinations.length).toFixed(1)}%)`
    );

    return {
        best: bestPenalty,
        worst: worstPenalty,
        mean: avgPenalty,
        numStars,
        combinations: combinations.length,
    };
}

/**
 * Extended version of calculateOptimalStarDistribution that includes:
 * - Pre-ranked star splits for guided Monte Carlo selection
 * - Pool characteristics for dynamic strictness calculation
 * - Zone affinity profiles for gradient-based scoring
 *
 * This is the NEW entry point for the guided Monte Carlo system.
 *
 * @param players All available players
 * @param config Balance configuration with star threshold
 * @returns Extended optimal stats with ranked splits and pool characteristics
 */
export function calculateExtendedOptimalStarDistribution(
    players: FastPlayer[],
    config: BalanceConfiguration
): ExtendedOptimalStats {
    const starThreshold = config.starPlayers.absoluteMinimum;

    // Identify all star players
    const starPlayers: FastPlayer[] = [];
    for (const player of players) {
        if (player.bestScore >= starThreshold) {
            starPlayers.push(player);
        }
    }

    const numStars = starPlayers.length;

    // If no stars or only 1 star, return default perfect stats
    if (numStars <= 1) {
        const defaultStrictness: DynamicStrictness = {
            shapingExponent: 2.0,
            concentrationParameter: 2.0,
            qualityPenaltyWeight: 0.3,
        };

        return {
            best: 1.0,
            worst: 1.0,
            mean: 1.0,
            numStars,
            combinations: 1,
            rankedSplits: [],
            poolCharacteristics: {
                numStars,
                qualityVariance: 0,
                specializationEntropy: 1.0,
                bestAchievableSplit: 1.0,
                meanSplitScore: 1.0,
                optimizationPotential: 1.0,
            },
            strictness: defaultStrictness,
        };
    }

    // Calculate zone affinity profiles for all stars
    // Using zone scores: [GK, DEF, MID, ATT] - we skip GK (index 0)
    const starProfiles: ZoneAffinityProfile[] = starPlayers.map((p) =>
        calculateZoneAffinity(
            p.zoneScores[1], // DEF
            p.zoneScores[2], // MID
            p.zoneScores[3] // ATT
        )
    );

    const starQualities = starPlayers.map((p) => p.bestScore);

    // Calculate initial strictness for split scoring (will be refined after)
    const initialPoolChars: PoolCharacteristics = analyzePoolCharacteristics(starProfiles, starQualities, []);
    const initialStrictness = calculateDynamicStrictness(initialPoolChars);

    // Generate and rank all possible star splits using gradient affinity scoring
    const rankedSplits = generateRankedStarSplits(starProfiles, starQualities, initialStrictness);

    // Extract split scores for final pool characteristics
    const splitScores = rankedSplits.map((s) => s.score);

    // Calculate final pool characteristics with actual split statistics
    const poolCharacteristics = analyzePoolCharacteristics(starProfiles, starQualities, splitScores);

    // Calculate final dynamic strictness with complete information
    const strictness = calculateDynamicStrictness(poolCharacteristics);

    // Calculate traditional stats for backward compatibility
    const best = splitScores.length > 0 ? Math.max(...splitScores) : 1.0;
    const worst = splitScores.length > 0 ? Math.min(...splitScores) : 1.0;
    const mean = splitScores.length > 0 ? splitScores.reduce((a, b) => a + b, 0) / splitScores.length : 1.0;

    logger.debug(`[calculateExtendedOptimalStarDistribution] ${numStars} stars, ${rankedSplits.length} combinations`);
    logger.debug(`  Best: ${best.toFixed(4)}, Worst: ${worst.toFixed(4)}, Mean: ${mean.toFixed(4)}`);
    logger.debug(`  Score RANGE: ${(best - worst).toFixed(4)} (${(((best - worst) / best) * 100).toFixed(1)}% spread)`);
    logger.debug(
        `  Strictness: exponent=${strictness.shapingExponent.toFixed(2)}, concentration=${strictness.concentrationParameter.toFixed(2)}`
    );
    logger.debug(
        `  Pool: variance=${poolCharacteristics.qualityVariance.toFixed(2)}, entropy=${poolCharacteristics.specializationEntropy.toFixed(2)}`
    );

    // Log star profiles for debugging
    logger.debug(`  Star profiles:`);
    starProfiles.forEach((profile, i) => {
        const playerName = starPlayers[i]?.original?.name || "Unknown";
        logger.debug(
            `    [${i}] ${playerName.padEnd(15)} | ${starQualities[i].toFixed(0)} | dom=${profile.dominantZone.padEnd(8)} | aff: D=${profile.affinity.def.toFixed(2)} M=${profile.affinity.mid.toFixed(2)} A=${profile.affinity.att.toFixed(2)} | str=${profile.specialistStrength.toFixed(2)} flex=${profile.flexibility.toFixed(2)}`
        );
    });

    // Log top 5 and bottom 3 splits for comparison
    if (rankedSplits.length > 0) {
        logger.debug(`  Top 5 splits:`);
        rankedSplits.slice(0, 5).forEach((split, i) => {
            const { breakdown } = split;
            logger.debug(
                `    #${i}: score=${split.score.toFixed(4)} | aff=${breakdown.affinityBalance.toFixed(3)} qual=${breakdown.qualityBalance.toFixed(3)} flex=${breakdown.flexibilityBalance.toFixed(3)} cnt=${breakdown.specialistCountBalance.toFixed(3)} peak=${breakdown.peakTalentBalance.toFixed(3)} | A=[${split.teamAIndices.join(",")}] B=[${split.teamBIndices.join(",")}]`
            );
        });

        if (rankedSplits.length > 5) {
            logger.debug(`  Bottom 3 splits:`);
            rankedSplits.slice(-3).forEach((split) => {
                const { breakdown } = split;
                logger.debug(
                    `    #${split.rank}: score=${split.score.toFixed(4)} | aff=${breakdown.affinityBalance.toFixed(3)} qual=${breakdown.qualityBalance.toFixed(3)} flex=${breakdown.flexibilityBalance.toFixed(3)} cnt=${breakdown.specialistCountBalance.toFixed(3)} peak=${breakdown.peakTalentBalance.toFixed(3)} | A=[${split.teamAIndices.join(",")}] B=[${split.teamBIndices.join(",")}]`
                );
            });
        }
    }

    return {
        best,
        worst,
        mean,
        numStars,
        combinations: rankedSplits.length,
        rankedSplits,
        poolCharacteristics,
        strictness,
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
        logger.debug("Star Zone Specialization Analysis (NEW 4-Category Position-Based System):");
        logger.debug("");
        logger.debug(`  Team A Stars: ${distA.totalStars} total`);
        logger.debug(`    Defensive specialists: ${result.teamADefSpecialists}`);
        logger.debug(`    Attacking specialists: ${result.teamAAttSpecialists}`);
        logger.debug(`    Midfielders: ${result.teamAMidfielders}`);
        logger.debug(`    All-rounders: ${result.teamAAllRounders}`);
        logger.debug("");

        logger.debug(`  Team B Stars: ${distB.totalStars} total`);
        logger.debug(`    Defensive specialists: ${result.teamBDefSpecialists}`);
        logger.debug(`    Attacking specialists: ${result.teamBAttSpecialists}`);
        logger.debug(`    Midfielders: ${result.teamBMidfielders}`);
        logger.debug(`    All-rounders: ${result.teamBAllRounders}`);
        logger.debug("");

        logger.debug(`  SPECIALIST COUNT IMBALANCES:`);
        logger.debug(
            `    Def specialist count diff: ${Math.abs(result.teamADefSpecialists - result.teamBDefSpecialists)}`
        );
        logger.debug(
            `    Att specialist count diff: ${Math.abs(result.teamAAttSpecialists - result.teamBAttSpecialists)}`
        );
        logger.debug(`    Midfielder count diff: ${Math.abs(result.teamAMidfielders - result.teamBMidfielders)}`);
        logger.debug("");

        logger.debug(`  FINAL PENALTY: ${result.penalty.toFixed(3)}`);
        logger.debug("");

        if (distA.classifications.length > 0) {
            logger.debug("  Team A Star Classifications:");
            for (const c of distA.classifications) {
                logger.debug(
                    `    STAR: ${c.specialistType} (DEF:${c.bestDefensiveScore.toFixed(1)}, MID:${c.bestMidfieldScore.toFixed(1)}, ATT:${c.bestAttackingScore.toFixed(1)})`
                );
            }
        }

        if (distB.classifications.length > 0) {
            logger.debug("  Team B Star Classifications:");
            for (const c of distB.classifications) {
                logger.debug(
                    `    STAR: ${c.specialistType} (DEF:${c.bestDefensiveScore.toFixed(1)}, MID:${c.bestMidfieldScore.toFixed(1)}, ATT:${c.bestAttackingScore.toFixed(1)})`
                );
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
