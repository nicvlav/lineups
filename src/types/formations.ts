/**
 * Formation Definitions
 *
 * Defines available team formations for different player counts.
 */

import type { ZoneScores } from "./players";

/**
 * Formation configuration
 */
export interface Formation {
    name: string;
    positions: ZoneScores; // Number of players per position
}

/**
 * Available formations by total player count
 */
export const formationTemplates: Record<number, Formation[]> = {
    5: [
        {
            name: "1-2-1",
            positions: { GK: 1, CB: 1, FB: 0, DM: 0, CM: 2, WM: 0, AM: 0, ST: 1, WR: 0 },
        },
    ],
    6: [
        {
            name: "2-2-1",
            positions: { GK: 1, CB: 2, FB: 0, DM: 0, CM: 2, WM: 0, AM: 0, ST: 1, WR: 0 },
        },
    ],
    7: [
        {
            name: "2-3-1",
            positions: { GK: 1, CB: 2, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 1, WR: 0 },
        },
        {
            name: "2-3-1 (2)",
            positions: { GK: 1, CB: 2, FB: 0, DM: 0, CM: 1, WM: 2, AM: 0, ST: 1, WR: 0 },
        },
        {
            name: "3-2-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 1, ST: 1, WR: 0 },
        },
        {
            name: "3-2-1 (2)",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 0, ST: 1, WR: 0 },
        },
    ],
    8: [
        {
            name: "2-2-3",
            positions: { GK: 1, CB: 2, FB: 0, DM: 0, CM: 2, WM: 0, AM: 0, ST: 1, WR: 2 },
        },
        {
            name: "2-3-2",
            positions: { GK: 1, CB: 2, FB: 0, DM: 0, CM: 2, WM: 0, AM: 1, ST: 2, WR: 0 },
        },
        {
            name: "2-4-1 (2)",
            positions: { GK: 1, CB: 2, FB: 0, DM: 1, CM: 0, WM: 2, AM: 1, ST: 1, WR: 0 },
        },
    ],
    9: [
        {
            name: "3-2-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 0, ST: 1, WR: 2 },
        },
        {
            name: "3-3-2",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 2, WR: 0 },
        },
        {
            name: "3-4-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 1, ST: 1, WR: 0 },
        },
    ],
    10: [
        {
            name: "3-3-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 1, ST: 1, WR: 2 },
        },
        {
            name: "3-3-3 (2)",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 1, WR: 2 },
        },
        {
            name: "3-5-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 2, ST: 1, WR: 0 },
        },
    ],
    11: [
        {
            name: "3-4-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 3, ST: 1, WR: 2 },
        },
        {
            name: "3-4-3 (2)",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 1, ST: 2, WR: 2 },
        },
        {
            name: "3-6-1 (2)",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 2, ST: 1, WR: 0 },
        },
    ],
    12: [
        {
            name: "3-5-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 2, ST: 1, WR: 2 },
        },
        {
            name: "3-5-3(2)",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 3, ST: 1, WR: 2 },
        },
    ],
    13: [
        {
            name: "3-5-4",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 2, ST: 2, WR: 2 },
        },
        {
            name: "3-5-4(2)",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 2, AM: 1, ST: 2, WR: 2 },
        },
    ],
} as const;

/**
 * Get formation by player count and index
 */
export function getFormation(playerCount: number, index: number = 0): Formation | null {
    const formations = formationTemplates[playerCount];
    return formations?.[index] ?? null;
}

/**
 * Get all formations for a player count
 */
export function getFormationsForCount(playerCount: number): Formation[] {
    return formationTemplates[playerCount] ?? [];
}
