/**
 * Auto-Balance V2 Core Algorithm
 *
 * Balance-first, positions-last. Phases:
 * 1. Greedy seed (with randomization on restarts)
 * 2. Swap search with strict multi-dimensional scoring
 * 3. Restarts with perturbations
 *
 * Key design decisions:
 * - Overall quality balance is a first-class constraint, not just capability ratios
 * - Score uses multiplicative penalties so one bad dimension tanks everything
 * - Variance penalty prevents star+weak combos in critical dimensions
 * - Greedy seed randomizes player order on restarts for exploration
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

    const strongCount: Record<CapabilityKey, number> = {
        defending: 0,
        playmaking: 0,
        goalThreat: 0,
        athleticism: 0,
        engine: 0,
        technique: 0,
    };

    const sorted = [...team].sort((a, b) => b.overall - a.overall);

    for (const player of sorted) {
        for (const key of CAPABILITY_KEYS) {
            const val = player.capabilities[key];
            if (val >= 65) {
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

    return 1.0 - (Math.sqrt(variance) / 100) * sensitivity;
}

/**
 * Ratio helper: min/max, but penalized exponentially as the gap grows.
 * A 95% ratio scores much better than 90%, and 90% much better than 85%.
 * This prevents the algorithm from accepting "good enough" when better exists.
 */
function strictRatio(a: number, b: number): number {
    if (a === 0 && b === 0) return 1.0;
    const raw = Math.min(a, b) / Math.max(a, b);
    // Square the ratio so gaps are penalized more aggressively
    // 0.95 → 0.9025, 0.90 → 0.81, 0.85 → 0.7225
    return raw * raw;
}

/** Score how balanced two teams are across ALL dimensions */
export function scoreBalance(teamA: BalancePlayer[], teamB: BalancePlayer[], config: BalanceConfig): BalanceScore {
    const capsA = teamCapabilities(teamA, config);
    const capsB = teamCapabilities(teamB, config);

    // 1. Capability dimension ratios (squared for strictness)
    const dimensions = {} as Record<CapabilityKey, number>;
    for (const key of CAPABILITY_KEYS) {
        const ratio = strictRatio(capsA[key], capsB[key]);
        const vpA = variancePenalty(teamA, key, config.varianceSensitivity[key]);
        const vpB = variancePenalty(teamB, key, config.varianceSensitivity[key]);
        dimensions[key] = ratio * ((vpA + vpB) / 2);
    }

    // 2. Overall quality balance — sum of all player overalls must be close
    const sumA = teamA.reduce((s, p) => s + p.overall, 0);
    const sumB = teamB.reduce((s, p) => s + p.overall, 0);
    const overallRatio = strictRatio(sumA, sumB);

    // 3. Star balance — top 3 players per team should be comparable
    const topN = Math.min(3, Math.floor(teamA.length / 3));
    const topA = [...teamA].sort((a, b) => b.overall - a.overall).slice(0, topN);
    const topB = [...teamB].sort((a, b) => b.overall - a.overall).slice(0, topN);
    const topSumA = topA.reduce((s, p) => s + p.overall, 0);
    const topSumB = topB.reduce((s, p) => s + p.overall, 0);
    const starRatio = strictRatio(topSumA, topSumB);

    // 4. Zone effectiveness balance — both teams competitive in all 3 zones
    const zoneSum = (team: BalancePlayer[], zone: "def" | "mid" | "att") =>
        team.reduce((s, p) => s + p.zoneEffectiveness[zone], 0);
    const defRatio = strictRatio(zoneSum(teamA, "def"), zoneSum(teamB, "def"));
    const midRatio = strictRatio(zoneSum(teamA, "mid"), zoneSum(teamB, "mid"));
    const attRatio = strictRatio(zoneSum(teamA, "att"), zoneSum(teamB, "att"));
    const zoneScore = Math.min(defRatio, midRatio, attRatio);

    // 5. Peak talent balance — both teams should have comparable top-end
    // players in EACH capability, not just comparable sums.
    // This catches "all the best strikers on one team" without fragile
    // role-counting logic.
    const peakBalance = (() => {
        const topN = Math.max(1, Math.floor(teamA.length / 4));

        const topCapSum = (team: BalancePlayer[], key: CapabilityKey) => {
            const sorted = [...team].map((p) => p.capabilities[key]).sort((a, b) => b - a);
            return sorted.slice(0, topN).reduce((s, v) => s + v, 0);
        };

        let worstRatio = 1.0;
        for (const key of CAPABILITY_KEYS) {
            const ratio = strictRatio(topCapSum(teamA, key), topCapSum(teamB, key));
            worstRatio = Math.min(worstRatio, ratio);
        }

        return worstRatio;
    })();

    // 6. Archetype distribution — both teams should have natural attackers
    // if the player pool contains them. Penalizes splits that stack all
    // strikers (Target Striker, Inside Forward, Pressing Forward) on one team.
    const countAttackers = (team: BalancePlayer[]) =>
        team.filter((p) => !p.isPlaceholder && p.archetype.def.primaryZone === "att").length;
    const attA = countAttackers(teamA);
    const attB = countAttackers(teamB);
    // If 2+ attackers exist and one team has 0: heavy penalty.
    // If only 1 attacker total: no penalty (can't split).
    // Otherwise: reward balanced distribution.
    const archetypeDistribution = attA + attB <= 1 ? 1.0 : attA === 0 || attB === 0 ? 0.6 : strictRatio(attA, attB);

    // 7. Combine all factors
    const capValues = Object.values(dimensions);
    const capProduct = capValues.reduce((product, v) => product * v, 1.0);
    const capScore = capProduct ** (1 / capValues.length);

    // Weighted composite:
    //   Overall 30% — total quality parity (the "feels fair" factor)
    //   Zones 20% — both teams competitive in all areas
    //   Caps 15% — per-skill balance
    //   Stars 15% — top talent distributed
    //   Archetypes 10% — attacker distribution across teams
    //   Peaks 10% — top individual talent per skill balanced
    const overall =
        overallRatio * 0.3 +
        zoneScore * 0.2 +
        capScore * 0.15 +
        starRatio * 0.15 +
        archetypeDistribution * 0.1 +
        peakBalance * 0.1;

    const allScores = [
        ...capValues,
        overallRatio,
        starRatio,
        defRatio,
        midRatio,
        attRatio,
        peakBalance,
        archetypeDistribution,
    ];
    const worst = Math.min(...allScores);
    const mean = allScores.reduce((s, v) => s + v, 0) / allScores.length;

    return { dimensions, worst, mean, overall };
}

// ─── Formation Feasibility ──────────────────────────────────────────────────

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

/**
 * Greedy balanced partition with randomization.
 *
 * Stars (top ~25% by quality) are always sorted strictly by overall —
 * their placement matters too much to randomize.
 * Non-stars get shuffled within quality bands to explore different seeds.
 * This gives natural variation on reshuffles without disrupting star balance.
 */
function greedySeed(
    players: BalancePlayer[],
    intensity: number // 0 = deterministic, 1+ = increasing randomization
): { teamA: BalancePlayer[]; teamB: BalancePlayer[] } {
    const sorted = [...players].sort((a, b) => b.overall - a.overall);

    // Stars = top 25%, always in strict order
    const starCount = Math.max(2, Math.ceil(sorted.length * 0.25));

    if (intensity > 0) {
        // Only shuffle non-stars (index starCount onwards)
        const stars = sorted.slice(0, starCount);
        const rest = sorted.slice(starCount);

        // Shuffle rest with intensity-scaled band width
        const bandWidth = 3 + intensity * 3; // intensity 1 → ±6, intensity 2 → ±9
        for (let i = rest.length - 1; i > 0; i--) {
            // Find swap candidates within band
            let j = i;
            while (j > 0 && Math.abs(rest[j - 1].overall - rest[i].overall) <= bandWidth) {
                j--;
            }
            const swapIdx = j + Math.floor(Math.random() * (i - j + 1));
            [rest[i], rest[swapIdx]] = [rest[swapIdx], rest[i]];
        }

        sorted.length = 0;
        sorted.push(...stars, ...rest);
    }

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

/**
 * Swap search with controlled stochasticity.
 *
 * @param temperature 0 = always pick best swap (deterministic).
 *                    >0 = sometimes pick a random good swap instead of the best.
 *                    Higher = more randomness, more variety, slightly less optimal.
 */
function swapSearch(
    initialA: BalancePlayer[],
    initialB: BalancePlayer[],
    config: BalanceConfig,
    temperature: number = 0
): SwapSearchResult {
    const teamA = [...initialA];
    const teamB = [...initialB];
    const swaps: SwapRecord[] = [];

    let currentScore = scoreBalance(teamA, teamB, config);
    let improved = true;
    let maxPasses = 50;

    while (improved && maxPasses-- > 0) {
        improved = false;

        // Collect ALL improving swaps, not just the best
        const candidates: Array<{ i: number; j: number; delta: number }> = [];

        for (let i = 0; i < teamA.length; i++) {
            for (let j = 0; j < teamB.length; j++) {
                if (Math.abs(teamA[i].overall - teamB[j].overall) < 0.5) continue;

                [teamA[i], teamB[j]] = [teamB[j], teamA[i]];

                if (
                    isFormationFeasible(teamA, config.feasibilityThreshold) &&
                    isFormationFeasible(teamB, config.feasibilityThreshold)
                ) {
                    const candidate = scoreBalance(teamA, teamB, config);
                    const delta = candidate.overall - currentScore.overall;

                    if (delta > 0.0001) {
                        candidates.push({ i, j, delta });
                    }
                }

                [teamA[i], teamB[j]] = [teamB[j], teamA[i]];
            }
        }

        if (candidates.length > 0) {
            // Sort by improvement descending
            candidates.sort((a, b) => b.delta - a.delta);

            let pick: (typeof candidates)[0];

            if (temperature === 0 || candidates.length === 1) {
                // Deterministic: always best swap
                pick = candidates[0];
            } else {
                // Stochastic: weighted random from top candidates
                // Higher temperature = consider more candidates
                const poolSize = Math.min(candidates.length, Math.max(2, Math.ceil(candidates.length * temperature)));
                const pool = candidates.slice(0, poolSize);

                // Weight by delta (better swaps still more likely)
                const totalDelta = pool.reduce((s, c) => s + c.delta, 0);
                let r = Math.random() * totalDelta;
                pick = pool[0];
                for (const c of pool) {
                    r -= c.delta;
                    if (r <= 0) {
                        pick = c;
                        break;
                    }
                }
            }

            const before = currentScore.overall;
            [teamA[pick.i], teamB[pick.j]] = [teamB[pick.j], teamA[pick.i]];
            currentScore = scoreBalance(teamA, teamB, config);

            swaps.push({
                playerA: teamA[pick.i].name,
                playerB: teamB[pick.j].name,
                scoreBefore: before,
                scoreAfter: currentScore.overall,
                improvement: pick.delta,
            });

            improved = true;
        }
    }

    return { teamA, teamB, score: currentScore, swaps };
}

// ─── Phase 3: Restarts ─────────────────────────────────────────────────────

const VARIATION_RUNS: Record<string, { runs: number; perturbations: number }> = {
    low: { runs: 10, perturbations: 1 },
    medium: { runs: 100, perturbations: 4 },
    high: { runs: 250, perturbations: 6 },
};

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

export function runBalance(
    players: BalancePlayer[],
    config: BalanceConfig
): { teamA: BalancePlayer[]; teamB: BalancePlayer[]; score: BalanceScore; audit: SwapRecord[] } {
    const { runs, perturbations } = VARIATION_RUNS[config.variation];

    let bestResult: SwapSearchResult | null = null;

    for (let i = 0; i < runs; i++) {
        // Phase 1: Greedy seed
        // Run 0: deterministic (baseline)
        // Runs 1-39: moderate shuffle (intensity 1)
        // Runs 40-79: wider shuffle (intensity 2)
        const intensity = i === 0 ? 0 : 1 + Math.floor(i / 40);
        const seed = greedySeed(players, intensity);

        // Phase 3: Perturb on restarts
        const { teamA, teamB } = i === 0 ? seed : perturb(seed.teamA, seed.teamB, perturbations);

        // Phase 2: Swap search
        // Run 0: deterministic (temperature 0) — algorithm's best answer
        // Restarts: increasing temperature for variety
        const temperature = i === 0 ? 0 : 0.3 + (i / runs) * 0.4;
        const result = swapSearch(teamA, teamB, config, temperature);

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
