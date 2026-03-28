/**
 * Auto-Balance Metrics — Star Scoring
 *
 * Pool analysis, split scoring, ranking, and guided selection for star player
 * distribution. Uses gradient affinity profiles for mathematically derived scoring.
 *
 * @module auto-balance/metrics-star-scoring
 */

import type { BalanceConfiguration } from "./metrics-config";
import { calculateBasicDifferenceRatio, generateCombinations } from "./metrics-helpers";
import {
    calculateAffinityBalanceScore,
    calculateCountSplitPenalty,
    calculateFlexibilityBalance,
    calculatePeakTalentBalance,
    calculateZoneAffinity,
} from "./metrics-zone-affinity";
import type {
    DynamicStrictness,
    FastPlayer,
    FastTeam,
    GuidedSelectionConfig,
    PoolCharacteristics,
    RankedStarSplit,
    ZoneAffinityProfile,
} from "./types";

/**
 * Analyze pool characteristics for dynamic strictness calculation
 *
 * @param starProfiles Zone affinity profiles for all stars
 * @param starQualities Best scores for all stars
 * @param splitScores Scores from all tested splits
 * @returns Pool characteristics object
 */
export function analyzePoolCharacteristics(
    starProfiles: ZoneAffinityProfile[],
    starQualities: number[],
    splitScores: number[]
): PoolCharacteristics {
    const numStars = starProfiles.length;

    if (numStars === 0) {
        return {
            numStars: 0,
            qualityVariance: 0,
            specializationEntropy: 1.0,
            bestAchievableSplit: 1.0,
            meanSplitScore: 1.0,
            optimizationPotential: 1.0,
        };
    }

    // Quality variance (standard deviation)
    const meanQuality = starQualities.reduce((a, b) => a + b, 0) / numStars;
    const qualityVariance = Math.sqrt(starQualities.reduce((sum, q) => sum + (q - meanQuality) ** 2, 0) / numStars);

    // Specialization entropy: how diverse are the specialist types?
    const zoneCounts = { def: 0, mid: 0, att: 0, balanced: 0 };
    for (const profile of starProfiles) {
        zoneCounts[profile.dominantZone]++;
    }

    // Calculate entropy of zone distribution
    let specializationEntropy = 0;
    for (const zone of ["def", "mid", "att", "balanced"] as const) {
        const p = zoneCounts[zone] / numStars;
        if (p > 0) {
            specializationEntropy -= p * Math.log(p);
        }
    }
    // Normalize by max entropy (log(4))
    specializationEntropy /= Math.log(4);

    // Split statistics
    const bestAchievableSplit = splitScores.length > 0 ? Math.max(...splitScores) : 1.0;
    const meanSplitScore = splitScores.length > 0 ? splitScores.reduce((a, b) => a + b, 0) / splitScores.length : 1.0;
    const optimizationPotential = meanSplitScore > 0 ? bestAchievableSplit / meanSplitScore : 1.0;

    return {
        numStars,
        qualityVariance,
        specializationEntropy,
        bestAchievableSplit,
        meanSplitScore,
        optimizationPotential,
    };
}

/**
 * Calculate dynamic strictness parameters based on pool characteristics
 *
 * Key principles:
 * 1. More stars = more splits possible = can be stricter
 * 2. Higher quality variance = harder to balance = be gentler
 * 3. Higher specialization entropy = more flexibility = can be stricter
 * 4. Higher optimization potential = more differentiation between splits = be stricter
 *
 * @param characteristics Pool characteristics
 * @returns Dynamic strictness parameters
 */
export function calculateDynamicStrictness(characteristics: PoolCharacteristics): DynamicStrictness {
    const { numStars, qualityVariance, specializationEntropy, optimizationPotential } = characteristics;

    // Base shaping exponent (how aggressively to penalize deviation)
    // Range: 1.0 (very gentle) to 4.0 (very harsh)
    let baseShaping = 2.0;

    // Adjust for number of stars
    // More stars = more combinations = more room for optimization = be stricter
    if (numStars >= 8) {
        baseShaping += 0.5;
    } else if (numStars <= 4) {
        baseShaping -= 0.5;
    }

    // Adjust for quality variance
    // High variance makes balancing harder - be gentler
    // qualityVariance typically 0-5 points
    const varianceAdjustment = -0.2 * Math.min(qualityVariance / 5, 1);
    baseShaping += varianceAdjustment;

    // Adjust for specialization diversity
    // High entropy (diverse specialists) = easier to balance = be stricter
    // Low entropy (homogeneous specialists) = harder to balance = be gentler
    const entropyAdjustment = 0.4 * (specializationEntropy - 0.5);
    baseShaping += entropyAdjustment;

    // Clamp to valid range
    const shapingExponent = Math.max(1.0, Math.min(4.0, baseShaping));

    // Concentration parameter for guided selection
    // Higher optimization potential = more differentiation = concentrate on top splits
    let concentrationParameter = 2.0 + 3.0 * (optimizationPotential - 1.0);
    concentrationParameter = Math.max(1.0, Math.min(8.0, concentrationParameter));

    // Quality penalty weight
    // When quality variance is high, quality balance becomes more important
    let qualityPenaltyWeight = 0.3 + 0.2 * (qualityVariance / 5);
    qualityPenaltyWeight = Math.max(0.2, Math.min(0.5, qualityPenaltyWeight));

    return {
        shapingExponent,
        concentrationParameter,
        qualityPenaltyWeight,
    };
}

/**
 * Score a star split using gradient affinity profiles
 *
 * This replaces the magic constant-based scoring with mathematically derived values.
 *
 * @param teamAProfiles Zone affinity profiles for team A's stars
 * @param teamBProfiles Zone affinity profiles for team B's stars
 * @param teamAQualities Best scores for team A's stars
 * @param teamBQualities Best scores for team B's stars
 * @param strictness Dynamic strictness parameters
 * @returns Score and component breakdown
 */
export function scoreStarSplit(
    teamAProfiles: ZoneAffinityProfile[],
    teamBProfiles: ZoneAffinityProfile[],
    teamAQualities: number[],
    teamBQualities: number[],
    strictness: DynamicStrictness
): {
    score: number;
    breakdown: {
        affinityBalance: number;
        qualityBalance: number;
        flexibilityBalance: number;
        specialistCountBalance: number;
        peakTalentBalance: number;
    };
} {
    const EPS = 1e-9;

    const shapingExponent = finiteOr(strictness.shapingExponent, 1.0);
    const adjustedQualityWeight = finiteOr(strictness.qualityPenaltyWeight, 0);

    // Detect odd split early to adjust weights
    const countA = teamAQualities.length;
    const countB = teamBQualities.length;
    const isOdd = (countA + countB) % 2 === 1;

    // weights (adjusted for odd splits to emphasize quality over affinity)
    let affinityWeight = 0.3;
    let flexibilityWeight = 0.1;
    let countWeight = 0.15;
    let peakWeight = 0.15;

    if (isOdd) {
        // ODD SPLIT: Emphasize quality dramatically, especially for small splits
        const smallerTeamSize = Math.min(countA, countB);

        if (smallerTeamSize === 1) {
            // SINGLE STAR: Quality is 70% of the decision - the best star MUST be alone
            affinityWeight = 0.05; // Minimal
            flexibilityWeight = 0.1; // Some importance
            countWeight = 0.05; // Minimal
            peakWeight = 0.1; // Minimal (quality already covers this)
            // adjustedQualityWeight will be ~0.70 from dynamic strictness
        } else if (smallerTeamSize === 2) {
            // 2v3 SPLIT: Quality is 50% of decision
            affinityWeight = 0.1;
            flexibilityWeight = 0.15;
            countWeight = 0.05;
            peakWeight = 0.2;
        } else {
            // Larger odd splits: More balanced weights
            affinityWeight = 0.2;
            flexibilityWeight = 0.15;
            countWeight = 0.1;
            peakWeight = 0.2;
        }
    }

    const totalWeight = affinityWeight + adjustedQualityWeight + flexibilityWeight + countWeight + peakWeight;
    if (!(totalWeight > 0)) {
        // fail safe
        return {
            score: 0,
            breakdown: {
                affinityBalance: 0,
                qualityBalance: 0,
                flexibilityBalance: 0,
                specialistCountBalance: 0,
                peakTalentBalance: 0,
            },
        };
    }

    // 1) affinity balance
    const affinityBalance = clamp01Safe(calculateAffinityBalanceScore(teamAProfiles, teamBProfiles), EPS);

    // 2) quality balance (uses countA, countB, isOdd from above)
    let qualityBalance: number;

    if (isOdd) {
        // ODD SPLIT: CRITICAL - Smaller team MUST have higher or equal average quality
        // Identify which team is smaller
        const smallerIsA = countA < countB;
        const smallerCount = Math.min(countA, countB);

        const avgA = countA > 0 ? teamAQualities.reduce((a, b) => a + b, 0) / countA : 0;
        const avgB = countB > 0 ? teamBQualities.reduce((a, b) => a + b, 0) / countB : 0;
        const smallerAvg = smallerIsA ? avgA : avgB;
        const largerAvg = smallerIsA ? avgB : avgA;

        // REQUIREMENT 1: Smaller team MUST have higher average (not just close)
        // If smaller team has lower avg, heavily penalize
        let avgScore: number;
        if (smallerAvg < largerAvg) {
            // CATASTROPHIC: Smaller team has worse average quality
            // This means worst stars are alone - unacceptable
            const deficit = (largerAvg - smallerAvg) / largerAvg;
            avgScore = Math.max(0, 1.0 - deficit * 3.0); // 3x multiplier for harshness
        } else {
            // GOOD: Smaller team has equal or higher average
            const advantage = (smallerAvg - largerAvg) / (smallerAvg + EPS);
            avgScore = Math.min(1.0, 1.0 + advantage * 0.5); // Bonus for having better avg
        }

        // REQUIREMENT 2: Check if smaller team has worst star in the pool
        const allQualities = [...teamAQualities, ...teamBQualities].sort((a, b) => b - a);

        const smallerTeamQualities = smallerIsA ? teamAQualities : teamBQualities;
        const smallerTeamBest = Math.max(...smallerTeamQualities);

        // REQUIREMENT 3: For single star, check rank position (not just worst)
        const bestStar = allQualities[0];
        const worstStar = allQualities[allQualities.length - 1];
        const smallerHasWorst = smallerTeamQualities.includes(worstStar);
        const smallerHasBest = smallerTeamQualities.includes(bestStar);

        let rankPenalty = 1.0;
        if (smallerCount === 1) {
            // Single star case: Must be THE BEST star, or very close
            if (smallerHasWorst) {
                // CATASTROPHIC: Worst star alone
                rankPenalty = 0.05;
            } else if (smallerHasBest) {
                // PERFECT: Best star alone
                rankPenalty = 1.0;
            } else {
                // Middle star alone - penalize based on how far from best
                // At elite levels, even 1 point difference is huge
                const gapFromBest = bestStar - smallerTeamBest;
                const totalRange = bestStar - worstStar;

                if (totalRange > 0) {
                    // Exponential penalty: 1 point gap = ~0.7, 2 points = ~0.5, 3+ = ~0.3
                    const normalizedGap = gapFromBest / totalRange;
                    rankPenalty = (1.0 - normalizedGap) ** 3.0; // Cubic for harshness
                } else {
                    rankPenalty = 1.0; // All stars same quality
                }
            }
        } else {
            // Multi-star smaller team - less strict
            if (smallerHasWorst) {
                rankPenalty = 0.3;
            }
        }

        // Combine: Average requirement (50%) + rank position (50%)
        // For single star, rank is critical; for multi-star, average matters more
        const avgWeight = smallerCount === 1 ? 0.3 : 0.7;
        const rankWeight = smallerCount === 1 ? 0.7 : 0.3;
        const combinedRatio = avgWeight * avgScore + rankWeight * rankPenalty;
        qualityBalance = clamp01Safe(combinedRatio ** (shapingExponent * 1.5), EPS);
    } else {
        // EVEN SPLIT: Use sum of qualities (original logic)
        const qualityA = teamAQualities.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
        const qualityB = teamBQualities.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
        const qualityRatioRaw = calculateBasicDifferenceRatio(qualityA, qualityB);
        const qualityRatio = clamp(finiteOr(qualityRatioRaw, 0), 0, 1);
        qualityBalance = clamp01Safe(qualityRatio ** shapingExponent, EPS);
    }

    // 3) flexibility balance
    const flexibilityBalance = clamp01Safe(calculateFlexibilityBalance(teamAProfiles, teamBProfiles), EPS);

    // 4) count balance
    let specialistCountBalance: number;

    if (isOdd) {
        // ODD SPLITS: Specialist count balance is less meaningful when team sizes differ
        // Quality already ensures better stars go to smaller team - zone diversity is secondary
        const smallerCount = Math.min(countA, countB);

        // Fading baseline: 1v2: 0.85, 2v3: 0.75, 3v4: 0.70, 4v5: 0.65, etc.
        const baselineScore = Math.max(0.6, 0.95 - smallerCount * 0.1);
        specialistCountBalance = baselineScore;
    } else {
        // EVEN SPLITS: Calculate actual specialist count balance
        const countByZone = (profiles: ZoneAffinityProfile[], zone: "def" | "mid" | "att") =>
            profiles.filter((p) => p.dominantZone === zone).length;

        const defScore = clamp01Safe(
            calculateCountSplitPenalty(
                countByZone(teamAProfiles, "def"),
                countByZone(teamBProfiles, "def"),
                shapingExponent
            ),
            EPS
        );

        const attScore = clamp01Safe(
            calculateCountSplitPenalty(
                countByZone(teamAProfiles, "att"),
                countByZone(teamBProfiles, "att"),
                shapingExponent
            ),
            EPS
        );

        const midScore = clamp01Safe(
            calculateCountSplitPenalty(
                countByZone(teamAProfiles, "mid"),
                countByZone(teamBProfiles, "mid"),
                shapingExponent * 0.8
            ),
            EPS
        );

        specialistCountBalance = clamp01Safe((defScore * attScore * midScore) ** (1 / 3), EPS);
    }

    // 5) peak talent balance
    const peakTalentBalance = clamp01Safe(calculatePeakTalentBalance(teamAProfiles, teamBProfiles), EPS);

    // weighted geometric mean in log space
    const wA = affinityWeight / totalWeight;
    const wQ = adjustedQualityWeight / totalWeight;
    const wF = flexibilityWeight / totalWeight;
    const wC = countWeight / totalWeight;
    const wP = peakWeight / totalWeight;

    // If adjustedQualityWeight is 0, quality still contributes neutrally since wQ==0
    const score = Math.exp(
        wA * Math.log(affinityBalance) +
            wQ * Math.log(qualityBalance) +
            wF * Math.log(flexibilityBalance) +
            wC * Math.log(specialistCountBalance) +
            wP * Math.log(peakTalentBalance)
    );

    return {
        score: Number.isFinite(score) ? score : 0,
        breakdown: {
            affinityBalance,
            qualityBalance,
            flexibilityBalance,
            specialistCountBalance,
            peakTalentBalance,
        },
    };

    // helpers
    function finiteOr(x: number, fallback: number) {
        return Number.isFinite(x) ? x : fallback;
    }

    function clamp(x: number, lo: number, hi: number) {
        if (!Number.isFinite(x)) return lo;
        return Math.max(lo, Math.min(hi, x));
    }

    function clamp01Safe(x: number, eps: number) {
        // clamp to [eps, 1] to avoid log(0) / pow(neg, frac)
        if (!Number.isFinite(x)) return eps;
        if (x <= eps) return eps;
        if (x >= 1) return 1;
        return x;
    }
}

/**
 * Evaluate star distribution using gradient-based scoring for actual assigned teams
 *
 * This function extracts star players from assigned teams and scores their distribution
 * using the same gradient affinity metrics used during pre-ranking.
 *
 * @param teamA First team
 * @param teamB Second team
 * @param config Balance configuration with star threshold
 * @param strictness Dynamic strictness parameters
 * @returns Gradient-based score (0-1, higher is better) and breakdown
 */
export function evaluateAssignedStarDistribution(
    teamA: FastTeam,
    teamB: FastTeam,
    config: BalanceConfiguration,
    strictness: DynamicStrictness
): { score: number; breakdown: RankedStarSplit["breakdown"] } {
    const starThreshold = config.starPlayers.absoluteMinimum;

    // Extract star players from each team
    const teamAStars: FastPlayer[] = [];
    const teamBStars: FastPlayer[] = [];

    teamA.positions.forEach((positionPlayers) => {
        positionPlayers.forEach((player) => {
            if (player.bestScore >= starThreshold) {
                teamAStars.push(player);
            }
        });
    });

    teamB.positions.forEach((positionPlayers) => {
        positionPlayers.forEach((player) => {
            if (player.bestScore >= starThreshold) {
                teamBStars.push(player);
            }
        });
    });

    // If no stars, return perfect score
    if (teamAStars.length === 0 && teamBStars.length === 0) {
        return {
            score: 1.0,
            breakdown: {
                affinityBalance: 1.0,
                qualityBalance: 1.0,
                flexibilityBalance: 1.0,
                specialistCountBalance: 1.0,
                peakTalentBalance: 1.0,
            },
        };
    }

    // Calculate zone affinity profiles for each star
    const teamAProfiles = teamAStars.map((p) =>
        calculateZoneAffinity(p.zoneScores[1], p.zoneScores[2], p.zoneScores[3])
    );
    const teamBProfiles = teamBStars.map((p) =>
        calculateZoneAffinity(p.zoneScores[1], p.zoneScores[2], p.zoneScores[3])
    );

    // Get star qualities (best scores)
    const teamAQualities = teamAStars.map((p) => p.bestScore);
    const teamBQualities = teamBStars.map((p) => p.bestScore);

    // Use the same scoring function as pre-ranking
    return scoreStarSplit(teamAProfiles, teamBProfiles, teamAQualities, teamBQualities, strictness);
}

/**
 * Generate and rank all possible star splits
 *
 * Pre-computes all C(n, n/2) possible distributions and scores them
 * using gradient affinity metrics. Returns sorted by score descending.
 *
 * @param starProfiles Zone affinity profiles for all stars
 * @param starQualities Best scores for all stars
 * @param strictness Dynamic strictness parameters
 * @returns Array of ranked star splits
 */
export function generateRankedStarSplits(
    starProfiles: ZoneAffinityProfile[],
    starQualities: number[],
    strictness: DynamicStrictness
): RankedStarSplit[] {
    const n = starProfiles.length;
    if (n <= 1) return []; // No splitting needed

    const teamASize = Math.floor(n / 2);
    const combinations = generateCombinations(n, teamASize);

    const rankedSplits: RankedStarSplit[] = [];

    for (const teamAIndices of combinations) {
        // Build team B indices
        const teamBIndices: number[] = [];
        for (let i = 0; i < n; i++) {
            if (!teamAIndices.includes(i)) {
                teamBIndices.push(i);
            }
        }

        // Extract profiles and qualities for each team
        const teamAProfiles = teamAIndices.map((i) => starProfiles[i]);
        const teamBProfiles = teamBIndices.map((i) => starProfiles[i]);
        const teamAQuals = teamAIndices.map((i) => starQualities[i]);
        const teamBQuals = teamBIndices.map((i) => starQualities[i]);

        // Score this split
        const { score, breakdown } = scoreStarSplit(teamAProfiles, teamBProfiles, teamAQuals, teamBQuals, strictness);

        rankedSplits.push({
            teamAIndices,
            teamBIndices,
            score,
            rank: 0, // Will be set after sorting
            breakdown,
        });
    }

    // Sort by score descending (best first)
    rankedSplits.sort((a, b) => b.score - a.score);

    // Assign ranks
    rankedSplits.forEach((split, index) => {
        split.rank = index;
    });

    return rankedSplits;
}

/**
 * Select a star split using weighted probability favoring better splits
 *
 * Uses softmax-style selection where:
 * - Top splits have highest probability
 * - Lower splits still have non-zero probability (exploration)
 * - Concentration parameter controls the sharpness
 *
 * @param rankedSplits Pre-ranked star splits
 * @param config Guided selection configuration
 * @returns Selected star split
 */
export function selectGuidedStarSplit(rankedSplits: RankedStarSplit[], config: GuidedSelectionConfig): RankedStarSplit {
    if (rankedSplits.length === 0) {
        throw new Error("No star splits available");
    }

    if (rankedSplits.length === 1) {
        return rankedSplits[0];
    }

    // Calculate selection probabilities using rank-based softmax
    // P(i) proportional to exp(-concentration * rank / numSplits)
    const n = rankedSplits.length;
    const weights: number[] = [];

    for (const split of rankedSplits) {
        const normalizedRank = split.rank / (n - 1); // 0 = best, 1 = worst
        const weight = Math.exp(-config.concentrationParameter * normalizedRank);
        weights.push(Math.max(weight, config.minProbability));
    }

    // Normalize to probabilities
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const probabilities = weights.map((w) => w / totalWeight);

    // Sample according to probabilities
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < rankedSplits.length; i++) {
        cumulative += probabilities[i];
        if (random < cumulative) {
            return rankedSplits[i];
        }
    }

    // Fallback to last split (shouldn't reach here due to floating point)
    return rankedSplits[rankedSplits.length - 1];
}

/**
 * Calculate guided selection configuration based on split statistics
 *
 * @param splitStats Statistics from pre-ranked splits
 * @param totalPlayers Total player count in pool
 * @returns Guided selection configuration
 */
export function calculateGuidedSelectionConfig(
    splitStats: { best: number; mean: number; worst: number; count: number },
    totalPlayers: number
): GuidedSelectionConfig {
    // Optimization potential: ratio of best to mean
    const optimizationPotential = splitStats.mean > 0 ? splitStats.best / splitStats.mean : 1.0;

    // Base concentration
    // Higher potential = more valuable to pick good splits = higher concentration
    let concentration = 2.0;

    if (optimizationPotential > 1.5) {
        concentration = 5.0; // Strong differentiation - concentrate heavily
    } else if (optimizationPotential > 1.2) {
        concentration = 3.5; // Moderate differentiation
    } else if (optimizationPotential > 1.1) {
        concentration = 2.5; // Mild differentiation
    }
    // else keep at 2.0 - minimal differentiation, more exploration

    // Adjust for player count (more players = more non-star variation = can explore more)
    if (totalPlayers >= 20) {
        concentration *= 0.9; // Slightly more exploration
    }

    // Minimum probability ensures we don't completely ignore poor splits
    // This maintains some exploration for edge cases
    const minProbability = Math.max(0.01 / splitStats.count, 0.001);

    return {
        concentrationParameter: concentration,
        minProbability,
    };
}
