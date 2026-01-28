/**
 * Auto-Balance Core Algorithm
 *
 * Core team assignment and optimization logic using gradient-based star distribution.
 *
 * STAR DISTRIBUTION SYSTEM:
 * All star distribution evaluation uses a centralized gradient-based scoring system:
 * - Pre-computation: calculateExtendedOptimalStarDistribution() generates ranked splits
 * - Per-iteration: evaluateAssignedStarDistribution() scores actual teams
 * - Both use scoreStarSplit() as single source of truth for gradient affinity metrics
 *
 * @module auto-balance/algorithm
 */

import { logger } from "@/lib/logger";
import type { ScoredGamePlayer } from "@/types/players";
import type { Formation } from "@/types/positions";
import { defaultZoneWeights, formationTemplates, getPointForPosition } from "@/types/positions";
import { preCalculatePlayerAnalytics } from "./adapters";
import { INDEX_TO_POSITION, POSITION_COUNT, ZONE_POSITIONS } from "./constants";
import { getStarCount } from "./debug-tools";
import { getFastFormation } from "./formation";
import {
    calculateExtendedOptimalStarDistribution,
    calculateGuidedSelectionConfig,
    calculateMetrics,
    calculateShapedPenaltyScore,
    evaluateAssignedStarDistribution,
    selectGuidedStarSplit,
} from "./metrics";
import type { ExtendedOptimalStats, RankedStarSplit } from "./types";
import type { BalanceConfiguration } from "./metrics-config";
import type { AssignmentContext, FastPlayer, FastTeam, SimulationResult, Teams } from "./types";
import {
    createFastTeam,
    createPositionComparator,
    cryptoRandomInt,
    getAvailablePositions,
    removePlayerFast,
    selectPlayerWithProximity,
} from "./utils";

/**
 * Initialize the assignment context with all necessary state
 *
 * @param players Player pool to assign
 * @param config Balance configuration
 * @param cachedFormationA Optional cached formation for team A
 * @param cachedFormationB Optional cached formation for team B
 * @returns Initialized context, or null if no valid formations exist
 */
function initializeAssignmentContext(
    players: FastPlayer[],
    config: BalanceConfiguration,
    cachedFormationA?: ReturnType<typeof getFastFormation>,
    cachedFormationB?: ReturnType<typeof getFastFormation>
): AssignmentContext | null {
    const totalPlayers = players.length;
    const teamASize = Math.floor(totalPlayers / 2);
    const teamBSize = totalPlayers - teamASize;

    // Use cached formations if provided, otherwise look them up
    const formationDataA = cachedFormationA || getFastFormation(teamASize);
    const formationDataB = cachedFormationB || (teamASize === teamBSize ? formationDataA : getFastFormation(teamBSize));

    if (!formationDataA || !formationDataB) {
        return null;
    }

    // Clone formation arrays (will be mutated during assignment)
    const formationA = formationDataA.array.slice();
    const formationB = formationDataB.array.slice();

    // Initialize teams
    const teamA = createFastTeam();
    const teamB = createFastTeam();

    // Store formations for position calculation
    teamA.formation = formationDataA.formation;
    teamB.formation = formationDataB.formation;

    // Clone players for manipulation
    const available = [...players];

    // Reset assignment state
    for (const player of available) {
        player.assignedPosition = -1;
        player.team = null;
    }

    // Initialize dynamic priority tracking for each team
    const teamAPriorities = new Int8Array(POSITION_COUNT);
    const teamBPriorities = new Int8Array(POSITION_COUNT);

    // Copy base priorities from defaultZoneWeights
    for (let i = 0; i < POSITION_COUNT; i++) {
        const position = INDEX_TO_POSITION[i];
        const weight = defaultZoneWeights[position];
        teamAPriorities[i] = weight.priorityStat;
        teamBPriorities[i] = weight.priorityStat;
    }

    // Pre-build comparators for each position
    const comparators = new Map<number, (a: FastPlayer, b: FastPlayer) => number>();
    for (let i = 0; i < POSITION_COUNT; i++) {
        comparators.set(i, createPositionComparator(i));
    }

    // Get configuration for guided randomness
    const algConfig = config.algorithm;
    const proximityThreshold = algConfig.proximityThreshold;
    const selectionWeights = algConfig.selectionWeights;

    // Calculate dynamic topN based on team size if scaling enabled
    const baseTopN = algConfig.baseTopN;
    const topN = algConfig.topNScaling ? Math.min(baseTopN, Math.floor(totalPlayers / 5)) : baseTopN;

    return {
        config,
        teamA,
        teamB,
        formationA,
        formationB,
        available,
        teamAPriorities,
        teamBPriorities,
        comparators,
        proximityThreshold,
        selectionWeights,
        topN,
    };
}

/**
 * Assign worst players to goalkeeper positions
 *
 * This prevents decent defenders from being wasted at GK.
 * Modifies context.teamA, context.teamB, and context.available in-place.
 *
 * @param context Assignment context
 */
function assignGoalkeepers(context: AssignmentContext): void {
    const GK_INDEX = 0;
    const numGKsNeeded = context.formationA[GK_INDEX] + context.formationB[GK_INDEX];

    if (numGKsNeeded === 0 || context.available.length === 0) {
        return;
    }

    // Sort players by bestScore (ascending) to get worst players first
    const sortedByWorst = [...context.available].sort((a, b) => a.bestScore - b.bestScore);

    for (let i = 0; i < numGKsNeeded && i < sortedByWorst.length; i++) {
        const player = sortedByWorst[i];

        // Decide which team gets this GK (balance total score)
        const assignToA =
            context.formationA[GK_INDEX] > 0 &&
            (context.formationB[GK_INDEX] === 0 || context.teamA.totalScore <= context.teamB.totalScore);

        const targetTeam = assignToA ? context.teamA : context.teamB;
        const targetFormation = assignToA ? context.formationA : context.formationB;

        if (targetFormation[GK_INDEX] > 0) {
            const score = player.bestScore;

            // Assign player to GK
            player.assignedPosition = GK_INDEX;
            player.team = assignToA ? "A" : "B";
            targetTeam.positions[GK_INDEX].push(player);
            targetTeam.totalScore += score;
            targetTeam.peakPotential += player.bestScore;
            targetTeam.playerCount++;
            targetFormation[GK_INDEX]--;

            // Remove from available pool (O(1) swap-and-pop)
            removePlayerFast(context.available, player);
        }
    }
}

/**
 * Assign all outfield players using priority-based position filling
 *
 * Uses guided randomness to select players for positions, balancing between
 * finding the best fit and introducing controlled randomness for variety.
 * Modifies context teams and available pool in-place.
 *
 * @param context Assignment context
 */
function assignOutfieldPlayers(context: AssignmentContext): void {
    while (context.available.length > 0) {
        // Get available positions for each team
        const aPositions = getAvailablePositions(context.formationA);
        const bPositions = getAvailablePositions(context.formationB);

        if (aPositions.length === 0 && bPositions.length === 0) break;

        // Choose team based on current balance
        const assignToA =
            aPositions.length > 0 && (bPositions.length === 0 || context.teamA.totalScore <= context.teamB.totalScore);

        const targetTeam = assignToA ? context.teamA : context.teamB;
        const targetFormation = assignToA ? context.formationA : context.formationB;
        const targetPriorities = assignToA ? context.teamAPriorities : context.teamBPriorities;
        const availablePositions = assignToA ? aPositions : bPositions;

        // OPTIMIZATION: Single-pass find minimum priority and collect positions
        let minPriority = Infinity;
        const lowestPriorityPositions: number[] = [];

        for (const posIdx of availablePositions) {
            const priority = targetPriorities[posIdx];
            if (priority < minPriority) {
                // Found new minimum - reset array and update min
                minPriority = priority;
                lowestPriorityPositions.length = 0;
                lowestPriorityPositions.push(posIdx);
            } else if (priority === minPriority) {
                // Same as current minimum - add to array
                lowestPriorityPositions.push(posIdx);
            }
        }

        // PURE RANDOM: Pick a position from those with lowest priority using crypto
        const posIdx = lowestPriorityPositions[cryptoRandomInt(0, lowestPriorityPositions.length)];

        // GUIDED RANDOMNESS: Select from top N candidates within proximity threshold
        const player = selectPlayerWithProximity(
            context.available,
            posIdx,
            context.comparators.get(posIdx)!,
            context.proximityThreshold,
            context.topN,
            context.selectionWeights
        );

        // Remove selected player from available pool (O(1) swap-and-pop)
        removePlayerFast(context.available, player);

        const score = player.scores[posIdx];

        // Assign player to position
        player.assignedPosition = posIdx;
        player.team = assignToA ? "A" : "B";
        targetTeam.positions[posIdx].push(player);
        targetTeam.totalScore += score;
        targetTeam.peakPotential += player.bestScore;
        targetTeam.playerCount++;
        targetFormation[posIdx]--;
        targetPriorities[posIdx] += 2; // Increment priority
    }
}

/**
 * Calculate zone scores and aggregate pre-calculated player stats
 *
 * Iterates through all players on both teams and aggregates:
 * - Zone scores (GK, DEF, MID, ATT)
 * - Peak potential scores by zone
 * - Pre-calculated stats (stamina, workrate, creativity, striker, allStats)
 *
 * @param teamA First team
 * @param teamB Second team
 */
function aggregateTeamStats(teamA: FastTeam, teamB: FastTeam): void {
    for (let zoneIdx = 0; zoneIdx < 4; zoneIdx++) {
        for (const posIdx of ZONE_POSITIONS[zoneIdx]) {
            // Team A
            for (const player of teamA.positions[posIdx]) {
                teamA.zoneScores[zoneIdx] += zoneIdx === 0 ? player.bestScore : player.scores[posIdx];
                teamA.zonePeakScores[zoneIdx] += player.bestScore;

                // Accumulate pre-calculated scores (much faster than recalculating!)
                teamA.staminaScore += player.staminaScore;
                teamA.attWorkrateScore += player.attWorkrateScore;
                teamA.defWorkrateScore += player.defWorkrateScore;
                teamA.workrateScore += player.attWorkrateScore; // deprecated - kept for compatibility
                teamA.creativityScore += player.creativityScore;
                teamA.strikerScore += player.strikerScore;
                teamA.allStatsScore += player.allStatsScore;
            }

            // Team B
            for (const player of teamB.positions[posIdx]) {
                teamB.zoneScores[zoneIdx] += zoneIdx === 0 ? player.bestScore : player.scores[posIdx];
                teamB.zonePeakScores[zoneIdx] += player.bestScore;

                // Accumulate pre-calculated scores (much faster than recalculating!)
                teamB.staminaScore += player.staminaScore;
                teamB.attWorkrateScore += player.attWorkrateScore;
                teamB.defWorkrateScore += player.defWorkrateScore;
                teamB.workrateScore += player.attWorkrateScore; // deprecated - kept for compatibility
                teamB.creativityScore += player.creativityScore;
                teamB.strikerScore += player.strikerScore;
                teamB.allStatsScore += player.allStatsScore;
            }
        }
    }
}

/**
 * Core team assignment algorithm
 * Assigns players to teams based on formation and balance
 *
 * This is a clean, modular implementation broken into distinct phases:
 * 1. Initialize context (formations, teams, priorities, comparators)
 * 2. Assign goalkeepers (worst players first)
 * 3. Assign outfield players (priority-based with guided randomness)
 * 4. Aggregate team stats (zone scores, pre-calculated analytics)
 *
 * PERFORMANCE: Accepts optional cached formations to avoid repeated lookups in Monte Carlo
 *
 * @param players Player pool to assign
 * @param config Balance configuration
 * @param cachedFormationA Optional cached formation for team A
 * @param cachedFormationB Optional cached formation for team B
 * @returns Assigned teams, or null if no valid formations exist
 */
export function assignPlayersToTeams(
    players: FastPlayer[],
    config: BalanceConfiguration,
    cachedFormationA?: ReturnType<typeof getFastFormation>,
    cachedFormationB?: ReturnType<typeof getFastFormation>
): Teams | null {
    // Phase 1: Initialize assignment context
    const context = initializeAssignmentContext(players, config, cachedFormationA, cachedFormationB);
    if (!context) return null;

    // Phase 2: Assign goalkeepers
    assignGoalkeepers(context);

    // Phase 3: Assign outfield players
    assignOutfieldPlayers(context);

    // Phase 4: Aggregate team stats
    aggregateTeamStats(context.teamA, context.teamB);

    return {
        teamA: context.teamA,
        teamB: context.teamB,
    };
}

/**
 * Normalizes player assignment data to match the team structure
 *
 * This ensures that player.assignedPosition and player.team match their actual
 * position in the team structure, regardless of mutations during Monte Carlo iterations.
 *
 * This is a defensive programming measure that makes the code robust to:
 * - Player object mutations across Monte Carlo iterations
 * - Any downstream code that relies on assignedPosition/team properties
 *
 * @param teams The team assignments to normalize
 */
function normalizePlayerAssignments(teams: Teams): void {
    // Team A
    for (let posIdx = 0; posIdx < teams.teamA.positions.length; posIdx++) {
        for (const player of teams.teamA.positions[posIdx]) {
            player.assignedPosition = posIdx;
            player.team = "A";
        }
    }

    // Team B
    for (let posIdx = 0; posIdx < teams.teamB.positions.length; posIdx++) {
        for (const player of teams.teamB.positions[posIdx]) {
            player.assignedPosition = posIdx;
            player.team = "B";
        }
    }
}

/**
 * GUIDED Monte Carlo simulation with pre-ranked star splits
 *
 * This is the NEW optimized version that:
 * 1. Pre-computes all possible star distributions using gradient affinity scoring
 * 2. Ranks splits by quality and uses weighted probability selection
 * 3. Uses dynamic strictness based on pool characteristics
 * 4. Guides Monte Carlo toward known-good star configurations
 *
 * Key differences from runOptimizedMonteCarlo:
 * - Uses calculateExtendedOptimalStarDistribution for pre-ranking
 * - Selects star splits with weighted probability (not random)
 * - Dynamic shaping exponent based on pool characteristics
 *
 * @param players Player pool
 * @param config Balance configuration
 * @param verbose Enable debug logging
 * @returns Best simulation result, or null if no valid formations
 */
export function runGuidedMonteCarlo(
    players: FastPlayer[],
    config: BalanceConfiguration,
    verbose: boolean = false
): SimulationResult | null {
    const maxIterations = config.monteCarlo.maxIterations;

    let bestScore = -Infinity;
    let bestResult: SimulationResult | null = null;

    // PRE-CALCULATION PHASE
    preCalculatePlayerAnalytics(players, config);

    const totalPlayers = players.length;
    const teamASize = Math.floor(totalPlayers / 2);
    const teamBSize = totalPlayers - teamASize;

    // Cache formations
    const availableFormationsA = formationTemplates[teamASize] || [];
    const availableFormationsB = formationTemplates[teamBSize] || [];

    if (availableFormationsA.length === 0 || availableFormationsB.length === 0) {
        logger.error("No formation available for team sizes:", teamASize, teamBSize);
        return null;
    }

    const cachedFormationsA = availableFormationsA.map((formation: Formation) => {
        const arr = new Int8Array(POSITION_COUNT);
        for (let i = 0; i < POSITION_COUNT; i++) {
            const position = INDEX_TO_POSITION[i];
            arr[i] = formation.positions[position] || 0;
        }
        return { array: arr, formation };
    });

    const cachedFormationsB =
        teamASize === teamBSize
            ? cachedFormationsA
            : availableFormationsB.map((formation: Formation) => {
                  const arr = new Int8Array(POSITION_COUNT);
                  for (let i = 0; i < POSITION_COUNT; i++) {
                      const position = INDEX_TO_POSITION[i];
                      arr[i] = formation.positions[position] || 0;
                  }
                  return { array: arr, formation };
              });

    // NEW: Calculate EXTENDED optimal stats with ranked splits and pool characteristics
    const extendedStats: ExtendedOptimalStats = calculateExtendedOptimalStarDistribution(players, config);

    // Calculate guided selection config based on split statistics
    const guidedConfig = calculateGuidedSelectionConfig(
        {
            best: extendedStats.best,
            mean: extendedStats.mean,
            worst: extendedStats.worst,
            count: extendedStats.combinations,
        },
        totalPlayers
    );

    // Extract star players for guided assignment
    const starThreshold = config.starPlayers.absoluteMinimum;
    const starPlayers = players.filter((p) => p.bestScore >= starThreshold);

    if (verbose) {
        logger.debug("🎯 Starting GUIDED Monte Carlo simulation...");
        logger.debug(`   Max iterations: ${maxIterations}`);
        logger.debug(
            `   Team sizes: ${teamASize} (${cachedFormationsA.length} formations) vs ${teamBSize} (${cachedFormationsB.length} formations)`
        );
        logger.debug(`   Extended star distribution stats:`);
        logger.debug(`     Best:  ${extendedStats.best.toFixed(4)}`);
        logger.debug(`     Mean:  ${extendedStats.mean.toFixed(4)}`);
        logger.debug(`     Worst: ${extendedStats.worst.toFixed(4)}`);
        logger.debug(`     Stars: ${extendedStats.numStars} (${extendedStats.combinations} splits ranked)`);
        logger.debug(`   Dynamic strictness:`);
        logger.debug(`     Shaping exponent: ${extendedStats.strictness.shapingExponent.toFixed(2)}`);
        logger.debug(`     Concentration: ${guidedConfig.concentrationParameter.toFixed(2)}`);
        logger.debug(`   Pool characteristics:`);
        logger.debug(`     Quality variance: ${extendedStats.poolCharacteristics.qualityVariance.toFixed(2)}`);
        logger.debug(`     Specialization entropy: ${extendedStats.poolCharacteristics.specializationEntropy.toFixed(2)}`);
        logger.debug(`     Optimization potential: ${extendedStats.poolCharacteristics.optimizationPotential.toFixed(2)}`);
    }

    // Track which splits we've used for logging
    let topSplitUsageCount = 0;

    for (let i = 0; i < maxIterations; i++) {
        // Pick random formations
        const formationA = cachedFormationsA[Math.floor(Math.random() * cachedFormationsA.length)];
        const formationB =
            teamASize === teamBSize
                ? formationA
                : cachedFormationsB[Math.floor(Math.random() * cachedFormationsB.length)];

        // NEW: If we have ranked splits, use guided selection to pick star distribution
        let selectedSplit: RankedStarSplit | null = null;
        if (extendedStats.rankedSplits.length > 0 && starPlayers.length >= 2) {
            selectedSplit = selectGuidedStarSplit(extendedStats.rankedSplits, guidedConfig);

            // Track top-5 split usage
            if (selectedSplit.rank < 5) {
                topSplitUsageCount++;
            }
        }

        // Assign players to teams
        // For now, we use the existing assignment but the star distribution scoring
        // will naturally favor configurations that match our selected split
        const result = assignPlayersToTeams(players, config, formationA, formationB);
        if (!result) continue;

        const metrics = calculateMetrics(result.teamA, result.teamB, config, false);

        // Calculate star distribution multiplier
        const starCountA = getStarCount(result.teamA, config.starPlayers.absoluteMinimum);
        const starCountB = getStarCount(result.teamB, config.starPlayers.absoluteMinimum);
        const starCountDiff = Math.abs(starCountA - starCountB);

        // Star count penalty
        const starCountPenalty = starCountDiff > 1 ? 0 : 1;

        // NEW: Use gradient-based star distribution evaluation (same scoring as pre-ranking)
        const gradientEval = evaluateAssignedStarDistribution(
            result.teamA,
            result.teamB,
            config,
            extendedStats.strictness
        );

        // Compare gradient score to pre-computed statistics
        // extendedStats.best/mean/worst are gradient scores from ranked splits
        const shapedStarScore = calculateShapedPenaltyScore(
            gradientEval.score,
            extendedStats,
            extendedStats.strictness.shapingExponent
        );

        // Combined multiplier
        const starMultiplier = starCountPenalty * shapedStarScore;
        const finalScore = metrics.score * starMultiplier;

        const simResult: SimulationResult = {
            teams: result,
            score: finalScore,
            metrics: metrics.details,
        };

        if (finalScore > bestScore) {
            bestScore = finalScore;
            bestResult = simResult;

            if (verbose && i % 20 === 0) {
                logger.debug(`   Iteration ${i}: Best score = ${bestScore.toFixed(3)} (star mult: ${starMultiplier.toFixed(3)})`);
            }
        }
    }

    if (verbose && bestResult) {
        logger.debug(`✓ Completed ${maxIterations} guided iterations`);
        logger.debug(`   Best score: ${bestScore.toFixed(3)}`);
        logger.debug(`   Score balance: ${bestResult.metrics.positionalScoreBalance.toFixed(3)}`);
        logger.debug(`   Star distribution: ${bestResult.metrics.talentDistributionBalance.toFixed(3)}`);
        logger.debug(`   Top-5 split usage: ${topSplitUsageCount}/${maxIterations} (${((100 * topSplitUsageCount) / maxIterations).toFixed(1)}%)`);

        // NEW: Log the actual star distribution in the final result
        logger.debug(`   FINAL RESULT star distribution:`);
        const finalTeamAStars: number[] = [];
        const finalTeamBStars: number[] = [];

        // Extract stars from the BEST RESULT teams, not the mutated starPlayers array
        const allPlayersInTeams: FastPlayer[] = [];

        // Collect all players from team A
        bestResult.teams.teamA.positions.forEach(positionPlayers => {
            positionPlayers.forEach(player => {
                if (player.isStarPlayer) {
                    const starIdx = starPlayers.findIndex(sp => sp.original.id === player.original.id);
                    if (starIdx !== -1) {
                        finalTeamAStars.push(starIdx);
                        allPlayersInTeams.push(player);
                    }
                }
            });
        });

        // Collect all players from team B
        bestResult.teams.teamB.positions.forEach(positionPlayers => {
            positionPlayers.forEach(player => {
                if (player.isStarPlayer) {
                    const starIdx = starPlayers.findIndex(sp => sp.original.id === player.original.id);
                    if (starIdx !== -1) {
                        finalTeamBStars.push(starIdx);
                        allPlayersInTeams.push(player);
                    }
                }
            });
        });

        // Format with player names for easier verification
        const teamAStarsWithNames = finalTeamAStars.map(idx => `${idx}:${starPlayers[idx]?.original?.name || 'Unknown'}`).join(", ");
        const teamBStarsWithNames = finalTeamBStars.map(idx => `${idx}:${starPlayers[idx]?.original?.name || 'Unknown'}`).join(", ");

        logger.debug(`     Team A stars: [${teamAStarsWithNames}]`);
        logger.debug(`     Team B stars: [${teamBStarsWithNames}]`);

        // Find this split in the ranked list
        if (extendedStats.rankedSplits.length > 0) {
            const matchingSplit = extendedStats.rankedSplits.find((split) => {
                const matchesA =
                    split.teamAIndices.length === finalTeamAStars.length &&
                    split.teamAIndices.every((idx) => finalTeamAStars.includes(idx));
                const matchesB =
                    split.teamBIndices.length === finalTeamBStars.length &&
                    split.teamBIndices.every((idx) => finalTeamBStars.includes(idx));
                return matchesA && matchesB;
            });

            if (matchingSplit) {
                const { breakdown } = matchingSplit;
                logger.debug(
                    `     Matches pre-ranked split #${matchingSplit.rank}: score=${matchingSplit.score.toFixed(4)} | aff=${breakdown.affinityBalance.toFixed(3)} qual=${breakdown.qualityBalance.toFixed(3)} flex=${breakdown.flexibilityBalance.toFixed(3)} cnt=${breakdown.specialistCountBalance.toFixed(3)} peak=${breakdown.peakTalentBalance.toFixed(3)}`
                );
            } else {
                logger.warn(`     ⚠️  Final star split does NOT match any pre-ranked split!`);
                logger.warn(`     This indicates the Monte Carlo assignment is not respecting star pre-ranking.`);
            }
        }
    }

    if (bestResult) {
        normalizePlayerAssignments(bestResult.teams);
    }

    return bestResult;
}

/**
 * Converts optimized result back to original format
 */
export function convertToGamePlayers(result: SimulationResult): {
    a: ScoredGamePlayer[];
    b: ScoredGamePlayer[];
    formationA: Formation | undefined;
    formationB: Formation | undefined;
} {
    const teamA: ScoredGamePlayer[] = [];
    const teamB: ScoredGamePlayer[] = [];

    // Process each position
    for (let posIdx = 0; posIdx < POSITION_COUNT; posIdx++) {
        const position = INDEX_TO_POSITION[posIdx];
        const weight = defaultZoneWeights[position];

        // Team A players
        const teamAPlayers = result.teams.teamA.positions[posIdx];
        teamAPlayers.forEach((player, idx) => {
            // Pass formation for CM positioning
            const point = getPointForPosition(
                weight,
                idx,
                teamAPlayers.length,
                result.teams.teamA.formation || undefined
            );
            teamA.push({
                ...player.original,
                position: point,
                exactPosition: position,
                team: "A",
            });
        });

        // Team B players
        const teamBPlayers = result.teams.teamB.positions[posIdx];
        teamBPlayers.forEach((player, idx) => {
            // Pass formation for CM positioning
            const point = getPointForPosition(
                weight,
                idx,
                teamBPlayers.length,
                result.teams.teamB.formation || undefined
            );
            teamB.push({
                ...player.original,
                position: point,
                exactPosition: position,
                team: "B",
            });
        });
    }

    return {
        a: teamA,
        b: teamB,
        formationA: result.teams.teamA.formation || undefined,
        formationB: result.teams.teamB.formation || undefined,
    };
}
