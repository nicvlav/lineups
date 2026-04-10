/**
 * Player Scoring Utilities (V2 stub)
 *
 * Most of this is legacy. The canonical scoring now lives in @/lib/capabilities.
 * This file preserves exports that other files still import.
 */

import type { Player, ZoneScores } from "@/types/players";
import { getZoneAverages as getPlayerZoneAverages } from "@/types/players";
import { POSITIONS, type Position } from "@/types/positions";

/**
 * Position weighting structure (legacy — still imported by pitch-rendering.ts)
 */
export interface PositionWeighting {
    positionName: string;
    zone: string;
    shortName: string;
    weights: Record<string, number>;
    isCentral: boolean;
    absoluteYPosition: number;
    priorityStat: number;
}

export type Weighting = Record<Position, PositionWeighting>;

/**
 * Category averages — re-export from players for consistency
 */
export type ZoneAverages = import("@/types/players").ZoneAverages;

/** Get category averages for a player — delegates to capabilities */
export function getZoneAverages(player: Player): ZoneAverages {
    return getPlayerZoneAverages(player);
}

/** @deprecated */
export function calculateScoresForStats(_stats: Record<string, number>, _zoneWeights?: Weighting): ZoneScores {
    return { GK: 0, CB: 0, FB: 0, DM: 0, CM: 0, WM: 0, AM: 0, ST: 0, WR: 0 };
}

/** Create default zone weights — minimal stub for pitch rendering */
function createDefaultZoneWeights(): Weighting {
    const weights: Partial<Weighting> = {};

    for (const position of Object.values(POSITIONS)) {
        weights[position.position] = {
            positionName: position.name,
            zone: position.zone,
            shortName: position.shortName,
            weights: {},
            isCentral: position.isCentral,
            absoluteYPosition: position.absoluteYPosition,
            priorityStat: position.priority,
        };
    }

    return weights as Weighting;
}

let _cachedWeights: Weighting | null = null;
export const normalizedDefaultWeights: Weighting = new Proxy({} as Weighting, {
    get(_target, prop) {
        if (!_cachedWeights) {
            _cachedWeights = createDefaultZoneWeights();
        }
        return _cachedWeights[prop as Position];
    },
});

export const PositionLabels: Record<Position, string> = {
    GK: "Goalkeeper",
    CB: "Center Back",
    FB: "Full back",
    DM: "Defensive Mid",
    CM: "Center Mid",
    WM: "Wide Mid",
    AM: "Attacking Mid",
    ST: "Striker",
    WR: "Winger",
} as const;

export const PositionShortLabels: Record<Position, string> = {
    GK: "GK",
    CB: "CB",
    FB: "FB",
    DM: "DM",
    CM: "CM",
    WM: "WM",
    AM: "AM",
    ST: "ST",
    WR: "WR",
} as const;
