/**
 * Auto-Balance Core Algorithm
 * 
 * Core team assignment and optimization logic.
 * 
 * @module auto-balance/algorithm
 */

import type { FastPlayer, SimulationResult, BalanceConfig } from "./types";
import type { ScoredGamePlayer } from "@/data/player-types";
import {
    POSITION_INDICES,
    ZONE_POSITIONS,
    INDEX_TO_POSITION,
    POSITION_COUNT
} from "./constants";
import { defaultZoneWeights, getPointForPosition } from "@/data/position-types";
import { getFastFormation } from "./formation";
import { calculateMetrics } from "./metrics";
import { createFastTeam, createPositionComparator, sortWorstInPlace } from "./utils";

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
): SimulationResult | null {
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

        // RANDOMIZATION: Pick a random zone to fill (like original)
        const randomZone = availableZones[Math.floor(Math.random() * availableZones.length)];
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

        // Sort by priority (but could randomize within same priority for more variety)
        availablePositions.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // Add small randomization for same priority positions
            return Math.random() - 0.5;
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
                    teamA.creativityScore += stats.vision + stats.passing + stats.technique + stats.decisions + stats.teamwork;
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
                    teamB.creativityScore += stats.vision + stats.passing + stats.technique + stats.decisions + stats.teamwork;
                }
            }
        }
    }

    // Calculate balance metrics
    const metrics = calculateMetrics(teamA, teamB, config, false);

    return {
        teamA,
        teamB,
        score: metrics.score,
        metrics: metrics.details,
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

    for (let i = 0; i < config.numSimulations; i++) {
        const result = assignPlayersToTeams(players, config);

        if (result && result.score > bestScore) {
            bestScore = result.score;
            bestResult = result;

            if (config.debugMode && i % 10 === 0) {
                console.log(`Simulation ${i}/${config.numSimulations}: Score=${result.score.toFixed(3)}`);
            }
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
    let bestResult = runMonteCarlo(players, config);
    if (!bestResult) return null;

    // Recursive refinement
    const subConfig: BalanceConfig = {
        ...config,
        numSimulations: 500,
        recursive: false,
        weights: {
            overallStrengthBalance: 0.1,
            positionalScoreBalance: 0.2,
            zonalDistributionBalance: 0.2,
            energyBalance: 0.3,
            creativityBalance: 0.2,
        },
    };

    for (let depth = 0; depth < config.recursiveDepth; depth++) {
        const refined = runMonteCarlo(players, subConfig);
        if (refined && refined.score > bestResult.score) {
            bestResult = refined;
        }
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
        const teamAPlayers = result.teamA.positions[posIdx];
        teamAPlayers.forEach((player, idx) => {
            // Pass formation for CM positioning
            const point = getPointForPosition(
                weight,
                idx,
                teamAPlayers.length,
                result.teamA.formation || undefined
            );
            teamA.push({
                ...player.original,
                position: point,
                exactPosition: position,
                team: 'A',
            });
        });

        // Team B players
        const teamBPlayers = result.teamB.positions[posIdx];
        teamBPlayers.forEach((player, idx) => {
            // Pass formation for CM positioning
            const point = getPointForPosition(
                weight,
                idx,
                teamBPlayers.length,
                result.teamB.formation || undefined
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