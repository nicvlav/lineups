/**
 * Auto-Balance Core Algorithm
 * 
 * Core team assignment and optimization logic.
 * 
 * @module auto-balance/algorithm
 */

import type { FastPlayer, Teams, SimulationResult } from "./types";
import type { ScoredGamePlayer } from "@/data/player-types";
import {
    INDEX_TO_POSITION,
    POSITION_COUNT,
    ZONE_POSITIONS,
} from "./constants";
import { defaultZoneWeights, getPointForPosition } from "@/data/position-types";
import { getFastFormation } from "./formation";
import { createFastTeam, createPositionComparator, cryptoRandomInt, selectPlayerWithProximity, getAvailablePositions } from "./utils";
import type { BalanceConfiguration } from "./metrics-config";
import { calculateMetricsV3, calculateOptimalStarDistribution, calculateStarZonePenalty } from "./metrics";
import { getStarCount } from "./debug-tools";

/**
 * Core team assignment algorithm
 * Assigns players to teams based on formation and balance
 * Basically the most important function for this website's concept
 * 
 * Disgustingly long function... 
 * Really need to improve the readability of this one and break it up into smaller functions
 */
export function assignPlayersToTeams(
    players: FastPlayer[],
    config: BalanceConfiguration
): Teams | null {
    const totalPlayers = players.length;
    const teamASize = Math.floor(totalPlayers / 2);
    const teamBSize = totalPlayers - teamASize;

    // Get formations
    const formationDataA = getFastFormation(teamASize);
    const formationDataB = teamASize === teamBSize
        ? formationDataA
        : getFastFormation(teamBSize);

    if (!formationDataA || !formationDataB) {
        // if (config.debugMode) {
        //     console.warn(`No formation available for ${teamASize}/${teamBSize} players`);
        // }
        return null;
    }

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

    // Phase 0: Assign worst players to GK first
    // This prevents decent defenders from being placed at GK
    const GK_INDEX = 0;
    const numGKsNeeded = formationA[GK_INDEX] + formationB[GK_INDEX];

    if (numGKsNeeded > 0 && available.length > 0) {
        // Sort players by bestScore (ascending) to get worst players first
        const sortedByWorst = [...available].sort((a, b) => a.bestScore - b.bestScore);

        for (let i = 0; i < numGKsNeeded && i < sortedByWorst.length; i++) {
            const player = sortedByWorst[i];

            // Decide which team gets this GK
            const assignToA = formationA[GK_INDEX] > 0 &&
                (formationB[GK_INDEX] === 0 || teamA.totalScore <= teamB.totalScore);

            const targetTeam = assignToA ? teamA : teamB;
            const targetFormation = assignToA ? formationA : formationB;

            if (targetFormation[GK_INDEX] > 0) {
                const score = player.scores[GK_INDEX];

                player.assignedPosition = GK_INDEX;
                player.team = assignToA ? 'A' : 'B';
                targetTeam.positions[GK_INDEX].push(player);
                targetTeam.totalScore += score;
                targetTeam.peakPotential += player.bestScore;
                targetTeam.playerCount++;
                targetFormation[GK_INDEX]--;

                // Remove from available pool
                const availableIndex = available.indexOf(player);
                if (availableIndex > -1) {
                    available.splice(availableIndex, 1);
                }
            }
        }
    }

    // Main Assignment Phase: Unified priority-based position filling

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
        comparators.set(i, createPositionComparator(i, 1.03));
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

    while (available.length > 0) {
        // Get available positions for each team (not zones)
        const aPositions = getAvailablePositions(formationA);
        const bPositions = getAvailablePositions(formationB);

        if (aPositions.length === 0 && bPositions.length === 0) break;

        // Choose team based on current balance (unchanged logic)
        const assignToA = aPositions.length > 0 &&
            (bPositions.length === 0 || teamA.totalScore <= teamB.totalScore);

        const targetTeam = assignToA ? teamA : teamB;
        const targetFormation = assignToA ? formationA : formationB;
        const targetPriorities = assignToA ? teamAPriorities : teamBPriorities;
        const availablePositions = assignToA ? aPositions : bPositions;

        // Find minimum priority among available positions
        let minPriority = Infinity;
        for (const posIdx of availablePositions) {
            if (targetPriorities[posIdx] < minPriority) {
                minPriority = targetPriorities[posIdx];
            }
        }

        // Collect all positions at minimum priority
        const lowestPriorityPositions: number[] = [];
        for (const posIdx of availablePositions) {
            if (targetPriorities[posIdx] === minPriority) {
                lowestPriorityPositions.push(posIdx);
            }
        }

        // PURE RANDOM: Pick a position from those with lowest priority using crypto
        const posIdx = lowestPriorityPositions[cryptoRandomInt(0, lowestPriorityPositions.length)];

        // Assign player to the selected position
        if (available.length > 0) {
            // GUIDED RANDOMNESS: Select from top N candidates within proximity threshold
            const player = selectPlayerWithProximity(
                available,
                posIdx,
                comparators.get(posIdx)!,
                proximityThreshold,
                topN,
                selectionWeights
            );

            // Remove selected player from available pool
            const playerIndex = available.indexOf(player);
            if (playerIndex > -1) {
                available.splice(playerIndex, 1);
            }

            const score = player.scores[posIdx];

            player.assignedPosition = posIdx;
            player.team = assignToA ? 'A' : 'B';
            targetTeam.positions[posIdx].push(player);
            targetTeam.totalScore += score;
            targetTeam.peakPotential += player.bestScore;
            targetTeam.playerCount++;
            targetFormation[posIdx]--;
            targetPriorities[posIdx] += 2; // Includes bonus for N >= 2

        }
    }

    // Get formula weights from configuration
    const creativityFormula = config.formulas.creativity;
    const strikerFormula = config.formulas.striker;

    // Calculate zone scores and attack/defense scores
    for (let zoneIdx = 0; zoneIdx < 4; zoneIdx++) {
        for (const posIdx of ZONE_POSITIONS[zoneIdx]) {
            for (const player of teamA.positions[posIdx]) {
                teamA.zoneScores[zoneIdx] += (zoneIdx === 0 ? player.bestScore : player.scores[posIdx]);
                teamA.zonePeakScores[zoneIdx] += player.bestScore;

                // Track energy scores (stamina + work rate)
                const stats = player.original.stats;
                if (stats) {
                    teamA.staminaScore += stats.stamina;
                    teamA.attWorkrateScore += stats.attWorkrate;
                    teamA.defWorkrateScore += stats.defWorkrate;
                    teamA.workrateScore += stats.attWorkrate; // deprecated - kept for compatibility

                    // Creativity score using configured formula
                    teamA.creativityScore +=
                        stats.vision * creativityFormula.vision +
                        stats.teamwork * creativityFormula.teamwork +
                        stats.decisions * creativityFormula.decisions +
                        stats.passing * creativityFormula.passing +
                        stats.composure * creativityFormula.composure;

                    // Striker score using configured formula
                    teamA.strikerScore +=
                        stats.finishing * strikerFormula.finishing +
                        stats.offTheBall * strikerFormula.offTheBall +
                        stats.technique * strikerFormula.technique +
                        stats.attWorkrate * strikerFormula.attWorkrate;
                }
            }
            for (const player of teamB.positions[posIdx]) {
                teamB.zoneScores[zoneIdx] += (zoneIdx === 0 ? player.bestScore : player.scores[posIdx]);
                teamB.zonePeakScores[zoneIdx] += player.bestScore;

                // Track energy scores (stamina + work rate)
                const stats = player.original.stats;
                if (stats) {
                    teamB.staminaScore += stats.stamina;
                    teamB.attWorkrateScore += stats.attWorkrate;
                    teamB.defWorkrateScore += stats.defWorkrate;
                    teamB.workrateScore += stats.attWorkrate; // deprecated - kept for compatibility

                    // Creativity score using configured formula
                    teamB.creativityScore +=
                        stats.vision * creativityFormula.vision +
                        stats.teamwork * creativityFormula.teamwork +
                        stats.decisions * creativityFormula.decisions +
                        stats.passing * creativityFormula.passing +
                        stats.composure * creativityFormula.composure;

                    // Striker score using configured formula
                    teamB.strikerScore +=
                        stats.finishing * strikerFormula.finishing +
                        stats.offTheBall * strikerFormula.offTheBall +
                        stats.technique * strikerFormula.technique +
                        stats.attWorkrate * strikerFormula.attWorkrate;
                }
            }
        }
    }
    return {
        teamA,
        teamB
    };
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

    for (let i = 0; i < config.monteCarlo.maxIterations; i++) {
        const result = assignPlayersToTeams(players, config);

        if (!result) continue;

        const metrics = calculateMetricsV3(result.teamA, result.teamB, config, false);

        if (metrics.score > bestScore) {
            bestScore = metrics.score;
            bestResult = { teams: result, score: metrics.score, metrics: metrics.details };
        }
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

    // Calculate optimal star distribution BEFORE Monte Carlo loop
    const optimalStarPenalty = calculateOptimalStarDistribution(players, config);

    if (verbose) {
        console.log('🎲 Starting optimized Monte Carlo simulation...');
        console.log(`   Max iterations: ${maxIterations}`);
        console.log(`   Optimal star distribution penalty: ${optimalStarPenalty.toFixed(3)}`);
    }

    for (let i = 0; i < maxIterations; i++) {
        const result = assignPlayersToTeams(players, config);
        if (!result) continue;

        const metrics = calculateMetricsV3(result.teamA, result.teamB, config, false);

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

    return bestResult;
}

/**
 * Recursive optimization for better results

export function runRecursiveOptimization(
    players: FastPlayer[],
    config: BalanceConfig
): SimulationResult | null {
    // Run initial optimization
    let bestResult: SimulationResult | null = null;
    let bestScore = -Infinity;

    // Recursive refinement - focus heavily on talent distribution and consistency
    const subConfig: BalanceConfig = {
        ...config,
        recursiveDepth: 50,
        recursive: false,
        weights: {
            overallStrengthBalance: 0.0,
            positionalScoreBalance: 0.3,
            zonalDistributionBalance: 0.2,
            energyBalance: 0.033,
            creativityBalance: 0.033,
            strikerBalance: 0.033,
            allStatBalance: 0.1,
            talentDistributionBalance: 0.3      
        },
    };

    for (let depth = 0; depth < config.recursiveDepth; depth++) {
        const refined = runMonteCarlo(players, subConfig);

        if (!refined) continue;

        const metrics = calculateMetrics(refined.teams.teamA, refined.teams.teamB, config, false);

        if (metrics.score > bestScore) {
            bestScore = metrics.score;
            bestResult = { teams: refined.teams, score: metrics.score, metrics: metrics.details };
        }
    }

    return bestResult;
}
 */
/**
 * Recursive optimization for better results

export function runTopLevelRecursiveOptimization(
    players: FastPlayer[],
    config: BalanceConfig
): SimulationResult | null {
    let bestResult: SimulationResult | null = null;
    let bestScore = -Infinity;

    // Recursive refinement - focus heavily on talent distribution and consistency
    const subConfig: BalanceConfig = {
        ...config,
        recursiveDepth: 100,
        weights: {
            overallStrengthBalance: 0.0,
            positionalScoreBalance: 0.05,
            zonalDistributionBalance: 0.2,
            energyBalance: 0.15,
            creativityBalance: 0.15,
            strikerBalance: 0.15,
            allStatBalance: 0.2,
            talentDistributionBalance: 0.1
        },
        recursive: true,
    };

    for (let depth = 0; depth < config.recursiveDepth; depth++) {
        const refined = runMonteCarlo(players, subConfig);

        if (!refined) continue;

        const metrics = calculateMetrics(refined.teams.teamA, refined.teams.teamB, config, false);

        // if (
        //     metrics.score >= 0.95 &&
        //     metrics.details.positionalScoreBalance >= 0.925 &&
        //     metrics.details.talentDistributionBalance >= 0.925 &&
        //     (Math.abs(refined.teams.teamA.peakPotential - refined.teams.teamB.peakPotential) < 5)) {
        //     return { teams: refined.teams, score: metrics.score, metrics: metrics.details };
        // }

        if (metrics.score > bestScore) {
            bestScore = metrics.score;
            bestResult = { teams: refined.teams, score: metrics.score, metrics: metrics.details };
        }
        console.log("Run ", depth, config.recursiveDepth, metrics);
    }

    return bestResult;
}
 */
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