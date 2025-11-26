/**
 * Auto-Balance Core Algorithm
 * 
 * Core team assignment and optimization logic.
 * 
 * @module auto-balance/algorithm
 */

import type { FastPlayer, FastTeam, Teams, SimulationResult, AssignmentContext } from "./types";
import type { ScoredGamePlayer } from "@/types/players";
import type { Formation } from "@/types/positions";
import {
    INDEX_TO_POSITION,
    POSITION_COUNT,
    ZONE_POSITIONS,
} from "./constants";
import { defaultZoneWeights, getPointForPosition, formationTemplates } from "@/types/positions";
import { getFastFormation } from "./formation";
import { createFastTeam, createPositionComparator, cryptoRandomInt, selectPlayerWithProximity, getAvailablePositions, removePlayerFast } from "./utils";
import type { BalanceConfiguration } from "./metrics-config";
import { calculateMetrics, calculateOptimalStarDistribution, calculateStarZonePenalty } from "./metrics";
import { getStarCount } from "./debug-tools";
import { preCalculatePlayerAnalytics } from "./adapters";

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
    const formationDataB = cachedFormationB || (teamASize === teamBSize
        ? formationDataA
        : getFastFormation(teamBSize));

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
    const topN = algConfig.topNScaling
        ? Math.min(baseTopN, Math.floor(totalPlayers / 5))
        : baseTopN;

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
        topN
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
        const assignToA = context.formationA[GK_INDEX] > 0 &&
            (context.formationB[GK_INDEX] === 0 || context.teamA.totalScore <= context.teamB.totalScore);

        const targetTeam = assignToA ? context.teamA : context.teamB;
        const targetFormation = assignToA ? context.formationA : context.formationB;

        if (targetFormation[GK_INDEX] > 0) {
            const score = player.bestScore;

            // Assign player to GK
            player.assignedPosition = GK_INDEX;
            player.team = assignToA ? 'A' : 'B';
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
        const assignToA = aPositions.length > 0 &&
            (bPositions.length === 0 || context.teamA.totalScore <= context.teamB.totalScore);

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
        player.team = assignToA ? 'A' : 'B';
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
                teamA.zoneScores[zoneIdx] += (zoneIdx === 0 ? player.bestScore : player.scores[posIdx]);
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
                teamB.zoneScores[zoneIdx] += (zoneIdx === 0 ? player.bestScore : player.scores[posIdx]);
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
        teamB: context.teamB
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
            player.team = 'A';
        }
    }

    // Team B
    for (let posIdx = 0; posIdx < teams.teamB.positions.length; posIdx++) {
        for (const player of teams.teamB.positions[posIdx]) {
            player.assignedPosition = posIdx;
            player.team = 'B';
        }
    }
}

/**
 * Runs Monte Carlo simulation to find optimal team balance
 *
 * @deprecated Use runOptimizedMonteCarlo for better performance
 */
export function runMonteCarlo(
    players: FastPlayer[],
    config: BalanceConfiguration
): SimulationResult | null {
    let bestResult: SimulationResult | null = null;
    let bestScore = -Infinity;

    // Pre-calculate player analytics before Monte Carlo loop
    preCalculatePlayerAnalytics(players, config);

    for (let i = 0; i < config.monteCarlo.maxIterations; i++) {
        const result = assignPlayersToTeams(players, config);

        if (!result) continue;

        const metrics = calculateMetrics(result.teamA, result.teamB, config, false);

        if (metrics.score > bestScore) {
            bestScore = metrics.score;
            bestResult = { teams: result, score: metrics.score, metrics: metrics.details };
        }
    }

    // Normalize player assignments to match team structure before returning
    if (bestResult) {
        normalizePlayerAssignments(bestResult.teams);
    }

    return bestResult;
}

/**
 * Optimized Monte Carlo simulation with early termination
 *
 * Replaces triple nested loop (500×100×100 = 5M iterations) with
 * single-tier smart search (~200-250 iterations).
 *
 * Features:
 * - Early exit when excellent result found
 * - Configurable iteration limit
 * - Progress tracking
 * - Optional diagnostic output
 */
export function runOptimizedMonteCarlo(
    players: FastPlayer[],
    config: BalanceConfiguration,
    verbose: boolean = false
): SimulationResult | null {
    const maxIterations = config.monteCarlo.maxIterations;

    let bestScore = -Infinity;
    let bestResult: SimulationResult | null = null;

    // PRE-CALCULATION PHASE: Calculate all invariant player analytics ONCE before Monte Carlo
    // This moves expensive stat calculations outside the loop for massive performance gains
    preCalculatePlayerAnalytics(players, config);

    // OPTIMIZATION: Cache ALL available formations for random selection
    // Profiling showed getFastFormation consumed ~4.5% of execution time (89 calls)
    // Instead of calling getFastFormation each iteration, we cache all options and pick randomly
    const totalPlayers = players.length;
    const teamASize = Math.floor(totalPlayers / 2);
    const teamBSize = totalPlayers - teamASize;

    // Pre-convert all available formations to fast arrays
    const availableFormationsA = formationTemplates[teamASize] || [];
    const availableFormationsB = formationTemplates[teamBSize] || [];

    if (availableFormationsA.length === 0 || availableFormationsB.length === 0) {
        console.error('No formation available for team sizes:', teamASize, teamBSize);
        return null;
    }

    // Pre-calculate fast arrays for all formations
    const cachedFormationsA = availableFormationsA.map((formation: Formation) => {
        const arr = new Int8Array(POSITION_COUNT);
        for (let i = 0; i < POSITION_COUNT; i++) {
            const position = INDEX_TO_POSITION[i];
            arr[i] = formation.positions[position] || 0;
        }
        return { array: arr, formation };
    });

    const cachedFormationsB = teamASize === teamBSize
        ? cachedFormationsA
        : availableFormationsB.map((formation: Formation) => {
            const arr = new Int8Array(POSITION_COUNT);
            for (let i = 0; i < POSITION_COUNT; i++) {
                const position = INDEX_TO_POSITION[i];
                arr[i] = formation.positions[position] || 0;
            }
            return { array: arr, formation };
        });

    // Calculate optimal star distribution BEFORE Monte Carlo loop
    const optimalStarPenalty = calculateOptimalStarDistribution(players, config);

    if (verbose) {
        console.log('🎲 Starting optimized Monte Carlo simulation...');
        console.log(`   Max iterations: ${maxIterations}`);
        console.log(`   Team sizes: ${teamASize} (${cachedFormationsA.length} formations) vs ${teamBSize} (${cachedFormationsB.length} formations)`);
        console.log(`   Optimal star distribution penalty: ${optimalStarPenalty.toFixed(3)}`);
    }

    for (let i = 0; i < maxIterations; i++) {
        // Pick random formations from cached arrays (very fast!)
        const formationA = cachedFormationsA[Math.floor(Math.random() * cachedFormationsA.length)];
        // CONSISTENCY: If both teams have same size, use the same formation for fairness
        const formationB = teamASize === teamBSize
            ? formationA
            : cachedFormationsB[Math.floor(Math.random() * cachedFormationsB.length)];

        const result = assignPlayersToTeams(players, config, formationA, formationB);
        if (!result) continue;

        const metrics = calculateMetrics(result.teamA, result.teamB, config, false);

        // Calculate star distribution multiplier
        const starCountA = getStarCount(result.teamA, config.starPlayers.absoluteMinimum);
        const starCountB = getStarCount(result.teamB, config.starPlayers.absoluteMinimum);
        const starCountDiff = Math.abs(starCountA - starCountB);

        // Star count penalty: >1 difference is unacceptable (0), 1 diff is bad (0.7), 0 diff is perfect (1.0)
        const starCountPenalty = starCountDiff > 1 ? 0 : 1;

        // Calculate actual star zone distribution penalty
        const actualStarPenalty = calculateStarZonePenalty(result.teamA, result.teamB, config, false);

        // Compare to optimal: how close are we to the best possible?
        const starDistQuality = optimalStarPenalty > 0 ? actualStarPenalty / optimalStarPenalty : 1.0;

        // Combined star multiplier: count * distribution quality
        const starMultiplier = starCountPenalty * starDistQuality;
        
        // Apply multiplier to get final score
        const finalScore = metrics.score * starMultiplier;

        const simResult: SimulationResult = {
            teams: result,
            score: finalScore,
            metrics: metrics.details
        };

        if (finalScore > bestScore) {
            bestScore = finalScore;
            bestResult = simResult;

            if (verbose && i % 20 === 0) {
                console.log(`   Iteration ${i}: Best score = ${bestScore.toFixed(3)}`);
            }
        }
    }

    if (verbose && bestResult) {
        console.log(`✓ Completed ${maxIterations} iterations`);
        console.log(`   Best score: ${bestScore.toFixed(3)}`);
        console.log(`   Score balance: ${bestResult.metrics.positionalScoreBalance.toFixed(3)}`);
        console.log(`   Star distribution: ${bestResult.metrics.talentDistributionBalance.toFixed(3)}`);
    }

    // Normalize player assignments to match team structure before returning
    if (bestResult) {
        normalizePlayerAssignments(bestResult.teams);
    }

    return bestResult;
}

/**
 * Converts optimized result back to original format
 */
export function convertToGamePlayers(
    result: SimulationResult
): { a: ScoredGamePlayer[]; b: ScoredGamePlayer[] } {
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
                team: 'A',
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
                team: 'B',
            });
        });
    }

    return { a: teamA, b: teamB };
}