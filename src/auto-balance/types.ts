/**
 * Auto-Balance V2 Types
 *
 * Clean type definitions for the balance-first, swap-based algorithm.
 */

import type { Formation } from "@/types/formations";
import type { Position } from "@/types/positions";
import type { CapabilityKey, PlayerCapabilities, ZoneEffectiveness } from "@/types/traits";

// ─── Input ──────────────────────────────────────────────────────────────────

/** Minimal player representation for the balance algorithm */
export interface BalancePlayer {
    id: string;
    name: string;
    capabilities: PlayerCapabilities;
    zoneEffectiveness: ZoneEffectiveness;
    overall: number;
}

// ─── Configuration ──────────────────────────────────────────────────────────

export type Variation = "low" | "medium" | "high";

export interface BalanceConfig {
    /** Controls how many restarts with perturbations (low=1, medium=50, high=150) */
    variation: Variation;

    /** Per-dimension variance sensitivity (higher = penalize star+weak combos more) */
    varianceSensitivity: Record<CapabilityKey, number>;

    /** How much each additional strong player in the same dimension contributes less (0-1) */
    diminishingReturnsFactor: number;

    /** Minimum zone coverage ratio for a team to be considered formation-feasible (0-1) */
    feasibilityThreshold: number;
}

export const DEFAULT_BALANCE_CONFIG: BalanceConfig = {
    variation: "medium",
    varianceSensitivity: {
        defending: 0.5,
        playmaking: 0.2,
        goalThreat: 0.2,
        athleticism: 0.4,
        engine: 0.3,
        technique: 0.15,
    },
    diminishingReturnsFactor: 0.15,
    feasibilityThreshold: 0.7,
};

// ─── Output ─────────────────────────────────────────────────────────────────

/** Per-dimension balance ratios */
export interface BalanceScore {
    /** Ratio per dimension (0-1, 1 = perfectly balanced) */
    dimensions: Record<CapabilityKey, number>;
    /** Worst ratio across all dimensions */
    worst: number;
    /** Mean of all dimension ratios */
    mean: number;
    /** Composite: worst×0.6 + mean×0.4 */
    overall: number;
}

/** Record of a single swap for the audit trail */
export interface SwapRecord {
    playerA: string; // name
    playerB: string; // name
    scoreBefore: number;
    scoreAfter: number;
    improvement: number;
}

/** Assigned player with team and position info */
export interface AssignedPlayer extends BalancePlayer {
    team: "a" | "b";
    assignedPosition: Position;
    assignedPoint: { x: number; y: number };
}

/** Complete result of the balance algorithm */
export interface BalanceResult {
    teams: { a: AssignedPlayer[]; b: AssignedPlayer[] };
    formations: { a: Formation; b: Formation };
    score: BalanceScore;
    audit: SwapRecord[];
}
