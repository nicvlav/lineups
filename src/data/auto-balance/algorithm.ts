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
    POSITION_INDICES,
    ZONE_POSITIONS,
    INDEX_TO_POSITION,
    POSITION_COUNT,
    // getStdDevThreshold
} from "./constants";
import { defaultZoneWeights, getPointForPosition } from "@/data/position-types";
import { getFastFormation } from "./formation";
import { createFastTeam, createPositionComparator, sortWorstInPlace, cryptoRandom, cryptoRandomInt, selectPlayerWithProximity, getAvailableZones } from "./utils";
import type { BalanceConfiguration } from "./metrics-config";
import { calculateMetricsV3 } from "./metrics";

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

    // Phase 1: Assign goalkeepers (worst overall players)
    sortWorstInPlace(available);

    const gkIdx = POSITION_INDICES.GK;
    if (formationA[gkIdx] > 0 && available.length > 0) {
        const gk = available.shift()!;
        gk.assignedPosition = gkIdx;
        gk.team = 'A';
        teamA.positions[gkIdx].push(gk);
        teamA.totalScore += gk.scores[gkIdx];
        teamA.peakPotential += gk.bestScore;
        teamA.playerCount++;
        formationA[gkIdx]--;
    }

    if (formationB[gkIdx] > 0 && available.length > 0) {
        const gk = available.shift()!;
        gk.assignedPosition = gkIdx;
        gk.team = 'B';
        teamB.positions[gkIdx].push(gk);
        teamB.totalScore += gk.scores[gkIdx];
        teamB.peakPotential += gk.bestScore;
        teamB.playerCount++;
        formationB[gkIdx]--;
    }

    // Phase 2: Assign remaining players with dynamic balancing
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
        // Choose team based on current balance
        const aZones = getAvailableZones(formationA);
        const bZones = getAvailableZones(formationB);

        if (aZones.length === 0 && bZones.length === 0) break;

        const assignToA = aZones.length > 0 &&
            (bZones.length === 0 || teamA.totalScore <= teamB.totalScore);

        const targetTeam = assignToA ? teamA : teamB;
        const targetFormation = assignToA ? formationA : formationB;
        const availableZones = assignToA ? aZones : bZones;

        // RANDOMIZATION: Pick a random zone to fill using crypto random
        const randomZone = availableZones[cryptoRandomInt(0, availableZones.length)];
        const zonePositions = ZONE_POSITIONS[randomZone];

        // Within the zone, still respect priority order
        let assigned = false;

        // Collect all available positions in this zone with their priorities
        const availablePositions: { posIdx: number; priority: number }[] = [];
        for (const posIdx of zonePositions) {
            if (targetFormation[posIdx] > 0) {
                const position = INDEX_TO_POSITION[posIdx];
                const weight = defaultZoneWeights[position];
                availablePositions.push({ posIdx, priority: weight.priorityStat });
            }
        }

        // Sort by priority (but randomize within same priority for more variety)
        availablePositions.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // Add randomization for same priority positions using crypto random
            return cryptoRandom() - 0.5;
        });

        // Try to assign to positions in this zone
        for (const { posIdx } of availablePositions) {
            if (assigned) break;

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

                assigned = true;
            }
        }

        if (!assigned && available.length > 0) {

            // if (config.debugMode) {
            //     console.warn("Could not assign player in zone", randomZone);
            // }
            // Try any position as fallback (still using guided randomness)
            for (let posIdx = 0; posIdx < POSITION_COUNT; posIdx++) {
                if (targetFormation[posIdx] > 0 && available.length > 0) {
                    const player = selectPlayerWithProximity(
                        available,
                        posIdx,
                        comparators.get(posIdx)!,
                        proximityThreshold,
                        topN,
                        selectionWeights
                    );

                    const playerIndex = available.indexOf(player);
                    if (playerIndex > -1) {
                        available.splice(playerIndex, 1);
                    }

                    player.assignedPosition = posIdx;
                    player.team = assignToA ? 'A' : 'B';
                    targetTeam.positions[posIdx].push(player);
                    targetTeam.totalScore += player.scores[posIdx];
                    targetTeam.peakPotential += player.bestScore;
                    targetTeam.playerCount++;
                    targetFormation[posIdx]--;
                    break;
                }
            }
        }
    }

    // Get formula weights from configuration
    const creativityFormula = config.formulas.creativity;
    const strikerFormula = config.formulas.striker;

    // Calculate zone scores and attack/defense scores
    for (let zoneIdx = 0; zoneIdx < 4; zoneIdx++) {
        for (const posIdx of ZONE_POSITIONS[zoneIdx]) {
            for (const player of teamA.positions[posIdx]) {
                const score = player.scores[posIdx];
                teamA.zoneScores[zoneIdx] += score;
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
                const score = player.scores[posIdx];
                teamB.zoneScores[zoneIdx] += score;
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
    const results: SimulationResult[] = [];
    const maxIterations = config.monteCarlo.maxIterations;
    const earlyExitThreshold = config.monteCarlo.earlyExitThreshold;

    let bestScore = -Infinity;
    let bestResult: SimulationResult | null = null;

    if (verbose) {
        console.log('🎲 Starting optimized Monte Carlo simulation...');
        console.log(`   Max iterations: ${maxIterations}`);
        console.log(`   Early exit threshold: ${earlyExitThreshold}`);
    }

    for (let i = 0; i < maxIterations; i++) {
        const result = assignPlayersToTeams(players, config);
        if (!result) continue;

        const metrics = calculateMetricsV3(result.teamA, result.teamB, config, false);
        const simResult: SimulationResult = {
            teams: result,
            score: metrics.score,
            metrics: metrics.details
        };

        results.push(simResult);

        if (metrics.score > bestScore) {
            bestScore = metrics.score;
            bestResult = simResult;

            if (verbose && i % 20 === 0) {
                console.log(`   Iteration ${i}: Best score = ${bestScore.toFixed(3)}`);
            }
        }

        // Early exit if excellent result found
        if (metrics.score >= earlyExitThreshold) {
            if (verbose) {
                console.log(`   Excellent result found at iteration ${i}!`);
                console.log(`   Score: ${metrics.score.toFixed(3)} (threshold: ${earlyExitThreshold})`);
                console.log(`   Score balance: ${metrics.details.positionalScoreBalance.toFixed(3)}`);
                console.log(`   Star distribution: ${metrics.details.talentDistributionBalance.toFixed(3)}`);
                console.log(`   Zone balance: ${metrics.details.zonalDistributionBalance.toFixed(3)}`);
            }
            return simResult;
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