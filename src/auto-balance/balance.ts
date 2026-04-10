/**
 * Auto-Balance V2 Core Algorithm
 *
 * Balance-first, positions-last. Three phases:
 * 1. Greedy seed — sort by quality, alternate assignment
 * 2. Swap search — pairwise swaps improving minimax across 6 dimensions
 * 3. Restarts — perturbations to escape local optima
 *
 * ~300 LOC replacing ~5,500 LOC of Monte Carlo + star penalties + zone affinity.
 */

import { logger } from "@/lib/logger";
import type { CapabilityKey, PlayerCapabilities } from "@/types/traits";
import { CAPABILITY_KEYS } from "@/types/traits";
import type { BalanceConfig, BalancePlayer, BalanceScore, SwapRecord } from "./types";

// ─── Score Computation ──────────────────────────────────────────────────────

/** Sum capabilities across a team, applying diminishing returns */
function teamCapabilities(team: BalancePlayer[], config: BalanceConfig): PlayerCapabilities {
    const sums: PlayerCapabilities = {
        defending: 0,
        playmaking: 0,
        goalThreat: 0,
        athleticism: 0,
        engine: 0,
        technique: 0,
    };

    // Count how many players are "strong" in each dimension (above 65)
    const strongCount: Record<CapabilityKey, number> = {
        defending: 0,
        playmaking: 0,
        goalThreat: 0,
        athleticism: 0,
        engine: 0,
        technique: 0,
    };

    // Sort by overall descending so best players get full contribution
    const sorted = [...team].sort((a, b) => b.overall - a.overall);

    for (const player of sorted) {
        for (const key of CAPABILITY_KEYS) {
            const val = player.capabilities[key];
            if (val >= 65) {
                // Diminishing returns: Nth strong player contributes less
                const multiplier = 1.0 / (1.0 + strongCount[key] * config.diminishingReturnsFactor);
                sums[key] += val * multiplier;
                strongCount[key]++;
            } else {
                sums[key] += val;
            }
        }
    }

    return sums;
}

/** Compute per-dimension variance penalty for a team */
function variancePenalty(team: BalancePlayer[], key: CapabilityKey, sensitivity: number): number {
    if (team.length < 2 || sensitivity === 0) return 1.0;

    const values = team.map((p) => p.capabilities[key]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;

    // Higher variance → lower multiplier (penalty)
    return 1.0 - (Math.sqrt(variance) / 100) * sensitivity;
}

/** Score how balanced two teams are across all 6 dimensions */
export function scoreBalance(teamA: BalancePlayer[], teamB: BalancePlayer[], config: BalanceConfig): BalanceScore {
    const capsA = teamCapabilities(teamA, config);
    const capsB = teamCapabilities(teamB, config);

    const dimensions = {} as Record<CapabilityKey, number>;

    for (const key of CAPABILITY_KEYS) {
        const a = capsA[key];
        const b = capsB[key];
        const ratio = a === 0 && b === 0 ? 1.0 : Math.min(a, b) / Math.max(a, b);

        // Apply variance penalty — penalizes teams with star+weak combos
        const vpA = variancePenalty(teamA, key, config.varianceSensitivity[key]);
        const vpB = variancePenalty(teamB, key, config.varianceSensitivity[key]);
        const vpAvg = (vpA + vpB) / 2;

        dimensions[key] = ratio * vpAvg;
    }

    const values = Object.values(dimensions);
    const worst = Math.min(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    return {
        dimensions,
        worst,
        mean,
        overall: worst * 0.6 + mean * 0.4,
    };
}

// ─── Formation Feasibility ──────────────────────────────────────────────────

/** Check that a team can field a real formation (adequate zone coverage) */
function isFormationFeasible(team: BalancePlayer[], threshold: number): boolean {
    const zoneCoverage = { def: 0, mid: 0, att: 0 };
    const minPerZone = Math.max(1, Math.floor(team.length / 4));

    for (const player of team) {
        const best = Math.max(player.zoneEffectiveness.def, player.zoneEffectiveness.mid, player.zoneEffectiveness.att);
        if (player.zoneEffectiveness.def >= best * threshold) zoneCoverage.def++;
        if (player.zoneEffectiveness.mid >= best * threshold) zoneCoverage.mid++;
        if (player.zoneEffectiveness.att >= best * threshold) zoneCoverage.att++;
    }

    return zoneCoverage.def >= minPerZone && zoneCoverage.mid >= minPerZone && zoneCoverage.att >= minPerZone;
}

// ─── Phase 1: Greedy Seed ───────────────────────────────────────────────────

function greedySeed(players: BalancePlayer[]): { teamA: BalancePlayer[]; teamB: BalancePlayer[] } {
    const sorted = [...players].sort((a, b) => b.overall - a.overall);
    const teamA: BalancePlayer[] = [];
    const teamB: BalancePlayer[] = [];

    let sumA = 0;
    let sumB = 0;

    for (const player of sorted) {
        if (sumA <= sumB) {
            teamA.push(player);
            sumA += player.overall;
        } else {
            teamB.push(player);
            sumB += player.overall;
        }
    }

    return { teamA, teamB };
}

// ─── Phase 2: Swap Search ───────────────────────────────────────────────────

interface SwapSearchResult {
    teamA: BalancePlayer[];
    teamB: BalancePlayer[];
    score: BalanceScore;
    swaps: SwapRecord[];
}

function swapSearch(initialA: BalancePlayer[], initialB: BalancePlayer[], config: BalanceConfig): SwapSearchResult {
    const teamA = [...initialA];
    const teamB = [...initialB];
    const swaps: SwapRecord[] = [];

    let currentScore = scoreBalance(teamA, teamB, config);
    let improved = true;

    while (improved) {
        improved = false;
        let bestDelta = 0;
        let bestI = -1;
        let bestJ = -1;

        // Evaluate all pairwise swaps, find the best one
        for (let i = 0; i < teamA.length; i++) {
            for (let j = 0; j < teamB.length; j++) {
                // Swap
                [teamA[i], teamB[j]] = [teamB[j], teamA[i]];

                // Check feasibility
                if (
                    isFormationFeasible(teamA, config.feasibilityThreshold) &&
                    isFormationFeasible(teamB, config.feasibilityThreshold)
                ) {
                    const candidate = scoreBalance(teamA, teamB, config);
                    const delta = candidate.overall - currentScore.overall;

                    if (delta > bestDelta) {
                        bestDelta = delta;
                        bestI = i;
                        bestJ = j;
                    }
                }

                // Swap back
                [teamA[i], teamB[j]] = [teamB[j], teamA[i]];
            }
        }

        // Execute the best swap if it improves balance
        if (bestI >= 0 && bestJ >= 0) {
            const before = currentScore.overall;
            [teamA[bestI], teamB[bestJ]] = [teamB[bestJ], teamA[bestI]];
            currentScore = scoreBalance(teamA, teamB, config);

            swaps.push({
                playerA: teamA[bestI].name,
                playerB: teamB[bestJ].name,
                scoreBefore: before,
                scoreAfter: currentScore.overall,
                improvement: bestDelta,
            });

            improved = true;
        }
    }

    return { teamA, teamB, score: currentScore, swaps };
}

// ─── Phase 3: Restarts with Perturbations ───────────────────────────────────

const VARIATION_RUNS: Record<string, { runs: number; perturbations: number }> = {
    low: { runs: 1, perturbations: 0 },
    medium: { runs: 50, perturbations: 3 },
    high: { runs: 150, perturbations: 5 },
};

/** Randomly swap N players between teams */
function perturb(
    teamA: BalancePlayer[],
    teamB: BalancePlayer[],
    count: number
): { teamA: BalancePlayer[]; teamB: BalancePlayer[] } {
    const a = [...teamA];
    const b = [...teamB];

    for (let n = 0; n < count; n++) {
        const i = Math.floor(Math.random() * a.length);
        const j = Math.floor(Math.random() * b.length);
        [a[i], b[j]] = [b[j], a[i]];
    }

    return { teamA: a, teamB: b };
}

/** Main balance algorithm: greedy seed → swap search → restarts */
export function runBalance(
    players: BalancePlayer[],
    config: BalanceConfig
): { teamA: BalancePlayer[]; teamB: BalancePlayer[]; score: BalanceScore; audit: SwapRecord[] } {
    const { runs, perturbations } = VARIATION_RUNS[config.variation];

    let bestResult: SwapSearchResult | null = null;

    for (let i = 0; i < runs; i++) {
        // Phase 1: Greedy seed
        const seed = greedySeed(players);

        // Phase 3: Perturb (skip on first run to keep the pure greedy baseline)
        const { teamA, teamB } = i === 0 ? seed : perturb(seed.teamA, seed.teamB, perturbations);

        // Phase 2: Swap search
        const result = swapSearch(teamA, teamB, config);

        if (!bestResult || result.score.overall > bestResult.score.overall) {
            bestResult = result;
        }
    }

    if (!bestResult) {
        throw new Error("Balance algorithm produced no result");
    }

    logger.debug(
        `Balance complete: score=${bestResult.score.overall.toFixed(4)}, ` +
            `worst=${bestResult.score.worst.toFixed(4)}, ` +
            `swaps=${bestResult.swaps.length}, runs=${runs}`
    );

    return {
        teamA: bestResult.teamA,
        teamB: bestResult.teamB,
        score: bestResult.score,
        audit: bestResult.swaps,
    };
}
