/**
 * Pitch Rendering Utilities
 *
 * Functions for calculating player positions on the pitch.
 */

import type { Formation } from "@/types/formations";
import type { Point, ZoneScores } from "@/types/players";
import type { PositionDefinition } from "@/types/positions";

/**
 * Position-like interface for backward compatibility
 */
interface PositionLike {
    isCentral: boolean;
    absoluteYPosition: number;
    shortName?: string;
    name?: string;
}

/**
 * Calculate X coordinate for player position on pitch
 */
function getXForPlayerPosition(position: PositionLike, positionIndex: number, numPositionEntries: number): number {
    if (!position.isCentral) {
        if (positionIndex >= 2) throw new Error(`More than 2 players in ${position.name} position?`);
        return positionIndex + 0.075 * (positionIndex ? -1 : 1);
    }

    let startShift = 0.0;
    const spacing = 0.4 / numPositionEntries; // Max width for players

    if (numPositionEntries % 2) {
        if (positionIndex === 0) return 0.5;
        startShift = spacing;
        positionIndex--;
    } else {
        startShift = -spacing / 2;
    }

    if (positionIndex % 2 === 0) {
        return 0.5 - startShift - spacing * (1 + Math.floor(positionIndex / 2));
    } else {
        return 0.5 + startShift + spacing * (1 + Math.floor(positionIndex / 2));
    }
}

/**
 * Get point coordinates for a position on the pitch
 */
export function getPointForPosition(
    position: PositionDefinition | { isCentral: boolean; absoluteYPosition: number; shortName?: string },
    positionIndex: number,
    numPositionEntries: number,
    formation?: Formation
): Point {
    let yPosition = position.absoluteYPosition;

    // Special CM positioning logic when formation is provided
    if (formation && position.shortName === "CM") {
        const hasDM = formation.positions.DM > 0;
        const hasAM = formation.positions.AM > 0;
        const hasCM = formation.positions.CM > 0;

        const centralMidCount = (hasDM ? 1 : 0) + (hasAM ? 1 : 0) + (hasCM ? 1 : 0);

        if (centralMidCount === 1) {
            yPosition = 0.45;
        } else if (hasDM && !hasAM) {
            yPosition = 0.35;
        } else if (hasAM && !hasDM) {
            yPosition = 0.5;
        }
    }

    // Drop DM deeper when CM is also on the pitch — otherwise DM/CM bunch up
    if (formation && position.shortName === "DM" && formation.positions.CM > 0) {
        yPosition = 0.55;
    }

    return {
        x: getXForPlayerPosition(position, positionIndex, numPositionEntries),
        y: yPosition,
    };
}

/**
 * Empty zone scores (all zeros)
 */
export const emptyZoneScores: ZoneScores = {
    GK: 0,
    CB: 0,
    FB: 0,
    DM: 0,
    CM: 0,
    WM: 0,
    AM: 0,
    ST: 0,
    WR: 0,
} as const;
