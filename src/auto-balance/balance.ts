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
import type { BalanceConfig, BalancePlayer, BalanceScore, ScoreWeights, SwapRecord } from "./types";
import { DEFAULT_SCORE_WEIGHTS } from "./types";

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
export function scoreBalance(
    teamA: BalancePlayer[],
    teamB: BalancePlayer[],
    config: BalanceConfig,
    weights: ScoreWeights = config.scoreWeights ?? DEFAULT_SCORE_WEIGHTS
): BalanceScore {
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

    // 3. Star balance — top 40% of each team should be comparable.
    // Wider window (was top 3) catches star DEPTH imbalance, not just the
    // very top. For 11 players: top 5. For 10: top 4.
    const topN = Math.max(2, Math.ceil(teamA.length * 0.4));
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

    // 5. Zone peak balance — both teams should have comparable top-end
    // players in EACH zone, not just comparable zone totals. This catches
    // "Greg + Christian both on one team" by checking whether the best
    // defenders/midfielders/attackers are distributed, not just summed.
    const peakBalance = (() => {
        const topN = Math.max(1, Math.floor(teamA.length / 4));

        const topZoneSum = (team: BalancePlayer[], zone: "def" | "mid" | "att") => {
            const sorted = [...team].map((p) => p.zoneEffectiveness[zone]).sort((a, b) => b - a);
            return sorted.slice(0, topN).reduce((s, v) => s + v, 0);
        };

        const defPeak = strictRatio(topZoneSum(teamA, "def"), topZoneSum(teamB, "def"));
        const midPeak = strictRatio(topZoneSum(teamA, "mid"), topZoneSum(teamB, "mid"));
        const attPeak = strictRatio(topZoneSum(teamA, "att"), topZoneSum(teamB, "att"));

        return Math.min(defPeak, midPeak, attPeak);
    })();

    // 6. Archetype distribution — both teams should have balanced specialist types.
    // Counts players by their archetype's declared primaryZone — a crisp signal
    // that doesn't get compressed by the multi-archetype zone scoring system.
    // A Winger is always "att", an Anchor is always "def", a Destroyer is "mid".
    const countByArchetypeZone = (team: BalancePlayer[], zone: "att" | "def" | "mid") =>
        team.filter((p) => !p.isPlaceholder && p.archetype.def.primaryZone === zone).length;

    // Distribution penalty: MONOTONIC — 0-N must always be worse than 1-N,
    // so the algorithm never prefers stacking all specialists on one team
    // just because the "1-N" strictRatio math was harsher than the "0-N" floor.
    // Uses raw ratio (not squared) with a floor to avoid over-penalizing.
    const distributionPenalty = (a: number, b: number) => {
        if (a + b === 0) return 1.0;
        if (a === 0 || b === 0) {
            const other = Math.max(a, b);
            if (other === 1) return 0.95;
            return Math.max(0.25, 0.7 - other * 0.1); // 0-2: 0.50, 0-3: 0.40, 0-4: 0.30
        }
        const ratio = Math.min(a, b) / Math.max(a, b);
        return Math.max(0.55, ratio); // 1-2: 0.55, 1-3: 0.55, 2-3: 0.67, 3-3: 1.0
    };

    const zoneDistribution = (zone: "att" | "def") =>
        distributionPenalty(countByArchetypeZone(teamA, zone), countByArchetypeZone(teamB, zone));

    // Striker capability — counts players who are mentally and technically
    // wired to be a team's main attacking threat. Uses a RELATIVE check:
    // finishing close to or exceeding playmaking = striker-leaning mindset.
    // Santos and Dylan Soto might have the same finishing value, but Santos'
    // playmaking towers over his finishing (creator), while Dylan's playmaking
    // is close (hybrid striker). The ratio captures this naturally.
    //
    // Criteria:
    //   att zone ≥ 70 (attacking context)
    //   finishing ≥ 60 (absolute floor — can actually finish)
    //   finishing ≥ playmaking × 0.9 (relative — finishing is their edge)
    const STRIKER_ZONE_THRESHOLD = 70;
    const STRIKER_FINISHING_FLOOR = 60;
    const STRIKER_RELATIVE_RATIO = 0.9;
    const countStrikerCapable = (team: BalancePlayer[]) =>
        team.filter(
            (p) =>
                !p.isPlaceholder &&
                p.zoneEffectiveness.att >= STRIKER_ZONE_THRESHOLD &&
                p.traits.finishing >= STRIKER_FINISHING_FLOOR &&
                p.traits.finishing >= p.traits.passing * STRIKER_RELATIVE_RATIO
        ).length;
    const strikerBalance = distributionPenalty(countStrikerCapable(teamA), countStrikerCapable(teamB));

    // Worst of attacker, defender, and striker-capable distribution — applied
    // as a MULTIPLIER. Striker balance is weighted tightest because a
    // mismatch in who can score kills the game more than any other imbalance.
    // Geometric mean across att/def/striker dimensions (instead of MIN).
    // MIN capped everything at the worst dimension, killing incentive to fix
    // others. Geo mean rewards improvement in ANY dimension — the algorithm
    // can now prefer a swap that balances attackers even if defenders stay 1-2.
    const archetypeDistribution = (zoneDistribution("att") * zoneDistribution("def") * strikerBalance) ** (1 / 3);

    // 6b. Placeholder distribution — both teams should have similar numbers of
    // placeholders so real players fill comparable proportions on each side.
    // A 3-1 split means one team is 30% unknown filler while the other is 10% —
    // fundamentally uneven regardless of how OVR balances.
    const placeholdersA = teamA.filter((p) => p.isPlaceholder).length;
    const placeholdersB = teamB.filter((p) => p.isPlaceholder).length;
    const placeholderDiff = Math.abs(placeholdersA - placeholdersB);
    const placeholderBalance = placeholderDiff <= 1 ? 1.0 : Math.max(0.4, 1.0 - (placeholderDiff - 1) * 0.2);
    // diff 0-1: 1.0, diff 2: 0.8, diff 3: 0.6, diff 4+: 0.4

    // 7. Capability balance — geometric mean of per-dimension ratios.
    // A moderate additive factor, not a multiplier. A technical-vs-physical
    // lean creates an interesting game, not a broken split. Only truly degenerate
    // scenarios (peakBalance, archetypeDistribution) deserve hard multiplier gates.
    const capValues = Object.values(dimensions);
    const capProduct = capValues.reduce((product, v) => product * v, 1.0);
    const capScore = capProduct ** (1 / capValues.length);

    // Weighted composite — additive factors for quality/zones/stars/caps.
    // peakBalance and archetypeDistribution are multipliers (hard constraints).
    const additive =
        overallRatio * weights.overallRatio +
        zoneScore * weights.zoneScore +
        starRatio * weights.starRatio +
        capScore * 0.15;
    const overall = additive * peakBalance * archetypeDistribution * placeholderBalance;

    const allScores = [...capValues, overallRatio, starRatio, defRatio, midRatio, attRatio, peakBalance];
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
    temperature: number = 0,
    weights?: ScoreWeights
): SwapSearchResult {
    const teamA = [...initialA];
    const teamB = [...initialB];
    const swaps: SwapRecord[] = [];

    let currentScore = scoreBalance(teamA, teamB, config, weights);
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
                    const candidate = scoreBalance(teamA, teamB, config, weights);
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
            currentScore = scoreBalance(teamA, teamB, config, weights);

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

    // ─── Polish pass: mid-tier lean swaps ───────────────────────────────
    // After single-swap convergence, look for one final "cherry on top" swap:
    // similar-quality non-elite players with opposite zone leans. Accepts tiny
    // score regressions (within 1%) to get cleaner lean distribution.
    //
    // Only runs at randomness = 0 style deterministic calls (doesn't need
    // weights check since weights only affect the evaluation — the pass uses
    // the same weights as the rest of the run).
    const ELITE_CUTOFF = 85;
    const QUALITY_WINDOW = 6;
    const REGRESSION_TOLERANCE = 0.99;

    // Lean detection via capability profile (not zone scores — those are too
    // compressed by multi-archetype scoring). Defending cap vs goalThreat cap
    // gives a much cleaner signal of which direction a player leans.
    const leanOf = (p: BalancePlayer): "def" | "att" | "mid" => {
        const defCap = p.capabilities.defending;
        const attCap = p.capabilities.goalThreat;
        const gap = defCap - attCap;
        if (gap >= 10) return "def";
        if (gap <= -10) return "att";
        return "mid";
    };

    const currentOverall = currentScore.overall;
    let bestLeanSwap: { i: number; j: number; newScore: BalanceScore } | null = null;
    let bestLeanDelta = -Infinity;

    for (let i = 0; i < teamA.length; i++) {
        const pA = teamA[i];
        if (pA.isPlaceholder || pA.overall >= ELITE_CUTOFF) continue;
        const leanA = leanOf(pA);
        if (leanA === "mid") continue;

        for (let j = 0; j < teamB.length; j++) {
            const pB = teamB[j];
            if (pB.isPlaceholder || pB.overall >= ELITE_CUTOFF) continue;
            if (Math.abs(pA.overall - pB.overall) > QUALITY_WINDOW) continue;
            const leanB = leanOf(pB);
            if (leanB === "mid" || leanB === leanA) continue;

            [teamA[i], teamB[j]] = [teamB[j], teamA[i]];
            const candidate = scoreBalance(teamA, teamB, config, weights);
            [teamA[i], teamB[j]] = [teamB[j], teamA[i]];

            // Accept if within tolerance of current score
            if (candidate.overall >= currentOverall * REGRESSION_TOLERANCE) {
                const delta = candidate.overall - currentOverall;
                if (delta > bestLeanDelta) {
                    bestLeanDelta = delta;
                    bestLeanSwap = { i, j, newScore: candidate };
                }
            }
        }
    }

    if (bestLeanSwap) {
        [teamA[bestLeanSwap.i], teamB[bestLeanSwap.j]] = [teamB[bestLeanSwap.j], teamA[bestLeanSwap.i]];
        currentScore = bestLeanSwap.newScore;
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

// ─── Weight Jitter ──────────────────────────────────────────────────────────

/**
 * Jitter scoring weights by a bounded random amount, then normalize to sum to 1.0.
 * Each weight is multiplied by (1 ± magnitude), where magnitude controls how far
 * the weights can drift from their base values.
 *
 * At magnitude 0: no jitter (returns base weights).
 * At magnitude 0.25: each weight can vary by up to ±25%.
 */
function jitterWeights(base: ScoreWeights, magnitude: number): ScoreWeights {
    if (magnitude <= 0) return base;

    const jitter = () => 1.0 + (Math.random() * 2 - 1) * magnitude;
    const raw = {
        overallRatio: base.overallRatio * jitter(),
        zoneScore: base.zoneScore * jitter(),
        starRatio: base.starRatio * jitter(),
    };

    const sum = raw.overallRatio + raw.zoneScore + raw.starRatio;
    return {
        overallRatio: raw.overallRatio / sum,
        zoneScore: raw.zoneScore / sum,
        starRatio: raw.starRatio / sum,
    };
}

// ─── Main Loop ──────────────────────────────────────────────────────────────

/**
 * @param randomness 0 = deterministic (initial generate), up to 1.0 = max variety (5th reshuffle)
 *   Controls jitter magnitude (0→0.25) and quality floor (100%→97%).
 *   At 0: no jitter, returns single best result (original behavior).
 *   At 1: full jitter + random pick from top-N qualifying pool.
 */
export function runBalance(
    players: BalancePlayer[],
    config: BalanceConfig,
    randomness = 0
): { teamA: BalancePlayer[]; teamB: BalancePlayer[]; score: BalanceScore; audit: SwapRecord[] } {
    const { runs, perturbations } = VARIATION_RUNS[config.variation];
    const baseWeights = config.scoreWeights ?? DEFAULT_SCORE_WEIGHTS;
    const jitterMagnitude = 0.25 * randomness;
    const qualityFloor = 1.0 - 0.03 * randomness;

    interface PoolEntry extends SwapSearchResult {
        baseScore: BalanceScore;
    }

    const pool: PoolEntry[] = [];

    for (let i = 0; i < runs; i++) {
        // Jitter weights per iteration (run 0 always uses base weights)
        const weights = i === 0 || randomness === 0 ? baseWeights : jitterWeights(baseWeights, jitterMagnitude);

        const intensity = i === 0 ? 0 : 1 + Math.floor(i / 40);
        const seed = greedySeed(players, intensity);
        const { teamA, teamB } = i === 0 ? seed : perturb(seed.teamA, seed.teamB, perturbations);
        const temperature = i === 0 ? 0 : 0.3 + (i / runs) * 0.4;
        const result = swapSearch(teamA, teamB, config, temperature, weights);

        // Re-score with BASE weights for consistent quality comparison
        const baseScore = scoreBalance(result.teamA, result.teamB, config, baseWeights);
        pool.push({ ...result, baseScore });
    }

    // Selection: at randomness 0, just pick the best. Otherwise pick randomly
    // from results within the quality floor of the best.
    pool.sort((a, b) => b.baseScore.overall - a.baseScore.overall);

    let picked: PoolEntry;
    if (randomness === 0 || pool.length <= 1) {
        picked = pool[0];
    } else {
        const threshold = pool[0].baseScore.overall * qualityFloor;
        const qualifying = pool.filter((r) => r.baseScore.overall >= threshold);
        picked = qualifying[Math.floor(Math.random() * qualifying.length)];
    }

    logger.debug(
        `Balance complete: score=${picked.baseScore.overall.toFixed(4)}, ` +
            `worst=${picked.baseScore.worst.toFixed(4)}, ` +
            `swaps=${picked.swaps.length}, runs=${runs}, ` +
            `randomness=${randomness.toFixed(1)}, pool=${pool.length}, ` +
            `qualifying=${randomness > 0 ? pool.filter((r) => r.baseScore.overall >= pool[0].baseScore.overall * qualityFloor).length : 1}`
    );

    return {
        teamA: picked.teamA,
        teamB: picked.teamB,
        score: picked.baseScore,
        audit: picked.swaps,
    };
}
