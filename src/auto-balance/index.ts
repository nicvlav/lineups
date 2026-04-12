/**
 * Auto-Balance V2
 *
 * Balance-first team splitting with swap-based optimization.
 * Replaces the Monte Carlo system with a cleaner, faster approach.
 *
 * @module auto-balance
 */

import { computeArchetypeProfile } from "@/lib/archetypes";
import { computeCapabilities } from "@/lib/capabilities";
import { logger } from "@/lib/logger";
import type { PlayerTraits } from "@/types/traits";
import { runBalance } from "./balance";
import { assignFormations } from "./formations";
import type { BalanceConfig, BalancePlayer, BalanceResult, Variation } from "./types";
import { DEFAULT_BALANCE_CONFIG } from "./types";

/** 5v5 is the smallest meaningful game */
export const MIN_PLAYERS = 10;
/** 13v13 is the largest supported formation */
export const MAX_PLAYERS = 26;

/** Input: minimal player data needed for balancing */
export interface PlayerInput {
    id: string;
    name: string;
    traits: PlayerTraits;
    isPlaceholder?: boolean;
}

/** Convert raw player input to BalancePlayer with computed capabilities + archetype */
function toBalancePlayer(input: PlayerInput): BalancePlayer {
    const capabilities = computeCapabilities(input.traits);
    const profile = computeArchetypeProfile(input.traits);
    return {
        id: input.id,
        name: input.name,
        capabilities,
        archetype: profile.primary,
        zoneEffectiveness: profile.zones,
        overall: Math.max(profile.zones.def, profile.zones.mid, profile.zones.att),
        isPlaceholder: input.isPlaceholder,
    };
}

/**
 * Balance teams from a list of players.
 *
 * @param players - Array of players with traits (10-26 players)
 * @param variation - How much randomness: "low" (deterministic), "medium", "high"
 * @param customConfig - Optional overrides for balance configuration
 * @returns Balanced teams with formations, scores, and audit trail
 */
export function balanceTeams(
    players: PlayerInput[],
    variation: Variation = "medium",
    customConfig?: Partial<BalanceConfig>
): BalanceResult {
    if (players.length < MIN_PLAYERS) {
        throw new Error(`Need at least ${MIN_PLAYERS} players (got ${players.length})`);
    }
    if (players.length > MAX_PLAYERS) {
        throw new Error(`Maximum ${MAX_PLAYERS} players supported (got ${players.length})`);
    }

    const config: BalanceConfig = {
        ...DEFAULT_BALANCE_CONFIG,
        ...customConfig,
        variation,
        varianceSensitivity: {
            ...DEFAULT_BALANCE_CONFIG.varianceSensitivity,
            ...customConfig?.varianceSensitivity,
        },
    };

    logger.debug(`Balancing ${players.length} players (variation: ${variation})`);

    // Convert to balance-ready format
    const balancePlayers = players.map(toBalancePlayer);

    // Phase 1-3: Balance teams
    const { teamA, teamB, score, audit } = runBalance(balancePlayers, config);

    // Phase 4: Assign formations and positions
    const { a, b, formationA, formationB } = assignFormations(teamA, teamB);

    logger.debug(
        `Result: ${score.overall.toFixed(4)} overall, ` +
            `worst=${score.worst.toFixed(4)}, ${audit.length} swaps, ` +
            `formations: ${formationA.name} vs ${formationB.name}`
    );

    return {
        teams: { a, b },
        formations: { a: formationA, b: formationB },
        score,
        audit,
    };
}

// Re-export internals used by the debug harness for manual swap evaluation
export { scoreBalance } from "./balance";
export { assignFormations } from "./formations";
// Re-export types for consumers
export type { AssignedPlayer, BalanceConfig, BalancePlayer, BalanceResult, BalanceScore, Variation } from "./types";
export { DEFAULT_BALANCE_CONFIG } from "./types";
