/**
 * Pitch Rendering Utilities
 *
 * Functions for calculating player positions and threat scores on the pitch.
 * These are legacy functions maintained for backward compatibility.
 * TODO: Gradually migrate components to use simpler archetype-based rendering.
 */

import type { Formation } from "@/types/formations";
import type { Point, ZoneScores } from "@/types/players";
import type { Position, PositionDefinition } from "@/types/positions";
import { POSITIONS } from "@/types/positions";
import type { PositionWeighting } from "./player-scoring";

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
 * Accepts both PositionDefinition and PositionWeighting for backward compatibility
 */
export function getPointForPosition(
    position: PositionDefinition | PositionWeighting,
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

    return {
        x: getXForPlayerPosition(position, positionIndex, numPositionEntries),
        y: yPosition,
    };
}

/**
 * @deprecated No longer used - kept for reference only
 * Calculate proximity score between a point and a position
 */
function getProximityScore(absolutePosition: Point, position: PositionLike): number {
    const centerThreshold = 0.3;
    const y = 1 - Math.abs(position.absoluteYPosition - absolutePosition.y);
    let score = y;

    if (absolutePosition.x <= 1 - centerThreshold && absolutePosition.x >= centerThreshold) {
        score = position.isCentral ? y : 0;
    } else {
        const x =
            (absolutePosition.x < centerThreshold ? absolutePosition.x : 1 - absolutePosition.x) / centerThreshold;
        score = position.isCentral ? Math.max(0, x) * y : Math.max(0, 1 - x) * y;
    }

    return score ** 10;
}

interface PositionWithWeight {
    positionKey: Position;
    position: PositionDefinition;
    weight: number;
}

/**
 * @deprecated No longer used - kept for reference only
 * Filter positions by vertical proximity
 */
function filterByVerticalProximity(positions: PositionWithWeight[], y: number): PositionWithWeight[] {
    positions.sort((a, b) => Math.abs(a.position.absoluteYPosition - y) - Math.abs(b.position.absoluteYPosition - y));

    const filteredPositions: PositionWithWeight[] = [];
    let foundAboveOrEqual = false;
    let foundBelow = false;

    for (const pos of positions) {
        if (pos.position.absoluteYPosition < y) {
            if (foundBelow) continue;
            filteredPositions.push(pos);
            foundBelow = true;
            if (foundAboveOrEqual) break;
        } else {
            if (foundAboveOrEqual) continue;
            filteredPositions.push(pos);
            foundAboveOrEqual = true;
            if (foundBelow) break;
        }
    }

    return filteredPositions;
}

/**
 * @deprecated No longer used - kept for reference only
 * Get positions with proximity weights for a point
 */
// @ts-expect-error - Kept for reference only
function _getProximityPositions(point: Point): PositionWithWeight[] {
    const zonePositions: PositionWithWeight[] = [];

    for (const position of Object.values(POSITIONS)) {
        zonePositions.push({
            position,
            positionKey: position.position,
            weight: 0,
        });
    }

    const centrals = filterByVerticalProximity(
        zonePositions.filter((z) => z.position.isCentral),
        point.y
    );
    const wides = filterByVerticalProximity(
        zonePositions.filter((z) => !z.position.isCentral),
        point.y
    );

    const weights = [...centrals, ...wides].map((position) => {
        return { ...position, weight: getProximityScore(point, position.position) };
    });

    const filtered = weights.filter((position) => position.weight > 0);
    filtered.sort((a, b) => b.weight - a.weight);

    if (filtered.length > 0 && filtered[0].weight === 1) {
        return filtered.slice(0, 1);
    }

    return filtered;
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
