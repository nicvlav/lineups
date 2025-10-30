/**
 * Auto-Balance Core Algorithm
 * 
 * Core team assignment and optimization logic.
 * 
 * @module auto-balance/algorithm
 */

import type { FastPlayer, Teams, SimulationResult, BalanceConfig } from "./types";
import type { ScoredGamePlayer } from "@/data/player-types";
import {
    POSITION_INDICES,
    ZONE_POSITIONS,
    INDEX_TO_POSITION,
    POSITION_COUNT,
    getStdDevThreshold
} from "./constants";
import { defaultZoneWeights, getPointForPosition } from "@/data/position-types";
import { getFastFormation } from "./formation";
import { createFastTeam, createPositionComparator, sortWorstInPlace, cryptoRandom, cryptoRandomInt } from "./utils";
import { calculateMetrics } from "./metrics";

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
    config: BalanceConfig
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
        if (config.debugMode) {
            console.warn(`No formation available for ${teamASize}/${teamBSize} players`);
        }
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
    // first pre-build comparitors for each position
    // might simplfiy this to one generic sort method.. 
    const comparators = new Map<number, (a: FastPlayer, b: FastPlayer) => number>();
    for (let i = 0; i < POSITION_COUNT; i++) {
        comparators.set(i, createPositionComparator(i, config.dominanceRatio));
    }

    // Track which zones have available positions
    const getAvailableZones = (formation: Int8Array): number[] => {
        const zones: number[] = [];
        for (let zoneIdx = 0; zoneIdx < 4; zoneIdx++) {
            for (const posIdx of ZONE_POSITIONS[zoneIdx]) {
                if (formation[posIdx] > 0) {
                    zones.push(zoneIdx);
                    break;
                }
            }
        }
        return zones;
    };

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

            // Sort available players for this position
            available.sort(comparators.get(posIdx)!);

            if (available.length > 0) {
                const player = available.shift()!;
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
            if (config.debugMode) {
                console.warn("Could not assign player in zone", randomZone);
            }
            // Try any position as fallback
            for (let posIdx = 0; posIdx < POSITION_COUNT; posIdx++) {
                if (targetFormation[posIdx] > 0) {
                    available.sort(comparators.get(posIdx)!);
                    if (available.length > 0) {
                        const player = available.shift()!;
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
    }

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
                    teamA.workrateScore += stats.workrate;
                    teamA.creativityScore += stats.vision + stats.decisions + stats.teamwork;
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
                    teamB.workrateScore += stats.workrate;
                    teamB.creativityScore += stats.vision + stats.decisions + stats.teamwork;
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
 */
export function runMonteCarlo(
    players: FastPlayer[],
    config: BalanceConfig
): SimulationResult | null {
    let bestResult: SimulationResult | null = null;
    let bestScore = -Infinity;

    for (let i = 0; i < config.recursiveDepth; i++) {
        const result = assignPlayersToTeams(players, config);

        if (!result) continue;

        const metrics = calculateMetrics(result.teamA, result.teamB, config, false);

        // Quality gates: reject results that don't meet minimum consistency standards
        const allMetricValues = Object.values(metrics.details);
        const mean = allMetricValues.reduce((a, b) => a + b, 0) / allMetricValues.length;
        const variance = allMetricValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allMetricValues.length;
        const stdDev = Math.sqrt(variance);

        // Gate 1: Reject if metrics are too inconsistent
        // Dynamic threshold: more players = stricter (lower threshold)

        if (stdDev > getStdDevThreshold(players.length)) continue;

        // Gate 2: Reject if overallStrengthBalance is below 95% of other metrics' mean
        const otherMetricsMean = (mean * allMetricValues.length - metrics.details.overallStrengthBalance) / (allMetricValues.length - 1);
        if (metrics.details.overallStrengthBalance < otherMetricsMean * 0.95) continue;

        if (metrics.score > bestScore) {
            bestScore = metrics.score;
            bestResult = { teams: result, score: metrics.score, metrics: metrics.details };
        }
    }

    return bestResult;
}

/**
 * Recursive optimization for better results
 */
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
        recursiveDepth: 500,
        recursive: false,
        weights: {
            overallStrengthBalance: 0.4,
            positionalScoreBalance: 0.15,
            zonalDistributionBalance: 0.1,
            energyBalance: 0.0,
            creativityBalance: 0.0,
            allStatBalance: 0.15,
            talentDistributionBalance: 0.2         // THE SECRET SAUCE - dominate the recursive phase
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

/**
 * Recursive optimization for better results
 */
export function runTopLevelRecursiveOptimization(
    players: FastPlayer[],
    config: BalanceConfig
): SimulationResult | null {
    let bestResult: SimulationResult | null = null;
    let bestScore = -Infinity;

    // Recursive refinement - focus heavily on talent distribution and consistency
    const subConfig: BalanceConfig = {
        ...config,
        recursiveDepth: 1000,
        weights: {
            overallStrengthBalance: 0.25,
            positionalScoreBalance: 0.1,
            zonalDistributionBalance: 0.1,
            energyBalance: 0.1,
            creativityBalance: 0.1,
            allStatBalance: 0.2,
            talentDistributionBalance: 0.15
        },
        recursive: true,
    };

    for (let depth = 0; depth < config.recursiveDepth; depth++) {
        const refined = runMonteCarlo(players, subConfig);

        if (!refined) continue;

        const metrics = calculateMetrics(refined.teams.teamA, refined.teams.teamB, config, false);

        if (
            metrics.score >= 0.95 &&
            metrics.details.positionalScoreBalance >= 0.925 &&
            metrics.details.talentDistributionBalance >= 0.925 &&
            (Math.abs(refined.teams.teamA.peakPotential - refined.teams.teamB.peakPotential) < 5)) {
            return { teams: refined.teams, score: metrics.score, metrics: metrics.details };
        }

        if (metrics.score > bestScore) {
            bestScore = metrics.score;
            bestResult = { teams: refined.teams, score: metrics.score, metrics: metrics.details };
        }
        console.log("Run ", depth, config.recursiveDepth, metrics);
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