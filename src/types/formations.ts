/**
 * Formation Definitions
 *
 * Available team formations for different player counts.
 * Rules:
 * - Wide positions (WR, WM, FB) are always 0 or 2
 * - All positions must sum to the player count
 * - Single striker preferred for smaller teams
 */

import type { ZoneScores } from "./players";

/**
 * Formation configuration
 */
export interface Formation {
    name: string;
    positions: ZoneScores;
}

/**
 * Available formations by total player count
 */
export const formationTemplates: Record<number, Formation[]> = {
    // 5v5: 1-2-1 (GK, CB, 2×CM, ST)
    5: [
        {
            name: "1-2-1",
            positions: { GK: 1, CB: 1, FB: 0, DM: 0, CM: 2, WM: 0, AM: 0, ST: 1, WR: 0 },
        },
    ],
    // 6v6: 2-2-1 (GK, 2×CB, 2×CM, ST)
    6: [
        {
            name: "2-2-1",
            positions: { GK: 1, CB: 2, FB: 0, DM: 0, CM: 2, WM: 0, AM: 0, ST: 1, WR: 0 },
        },
    ],
    // 7v7
    7: [
        {
            name: "2-3-1",
            positions: { GK: 1, CB: 2, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 1, WR: 0 },
        },
        {
            name: "2-3-1 (wide)",
            positions: { GK: 1, CB: 2, FB: 0, DM: 0, CM: 1, WM: 2, AM: 0, ST: 1, WR: 0 },
        },
        {
            name: "3-2-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 1, ST: 1, WR: 0 },
        },
    ],
    // 8v8
    8: [
        {
            name: "2-4-1",
            positions: { GK: 1, CB: 2, FB: 0, DM: 1, CM: 0, WM: 2, AM: 1, ST: 1, WR: 0 },
        },
        {
            name: "3-3-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 1, WR: 0 },
        },
        {
            name: "2-2-3",
            positions: { GK: 1, CB: 2, FB: 0, DM: 0, CM: 2, WM: 0, AM: 0, ST: 1, WR: 2 },
        },
    ],
    // 9v9
    9: [
        {
            name: "3-4-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 1, ST: 1, WR: 0 },
        },
        {
            name: "3-2-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 0, ST: 1, WR: 2 },
        },
        {
            name: "2-5-1",
            positions: { GK: 1, CB: 2, FB: 0, DM: 1, CM: 2, WM: 2, AM: 0, ST: 1, WR: 0 },
        },
    ],
    // 10v10
    10: [
        {
            name: "3-3-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 1, ST: 1, WR: 2 },
        },
        {
            name: "3-5-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 2, ST: 1, WR: 0 },
        },
        {
            name: "3-4-2",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 1, WR: 2 },
        },
    ],
    // 11v11
    11: [
        {
            name: "3-4-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 3, ST: 1, WR: 2 },
        },
        {
            name: "3-5-2",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 1, WM: 0, AM: 2, ST: 1, WR: 2 },
        },
        {
            name: "3-6-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 2, WM: 2, AM: 1, ST: 1, WR: 0 },
        },
    ],
    // 12v12
    12: [
        {
            name: "3-5-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 2, ST: 1, WR: 2 },
        },
        {
            name: "3-6-2",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 2, WM: 0, AM: 2, ST: 1, WR: 2 },
        },
    ],
    // 13v13
    13: [
        {
            name: "3-6-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 2, CM: 0, WM: 2, AM: 2, ST: 1, WR: 2 },
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
