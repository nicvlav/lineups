/**
 * Auto-Balance Formation Management
 * 
 * Functions for handling formations and player positioning.
 * 
 * @module auto-balance/formation
 */

import type { Formation } from "@/types/positions";
import { formationTemplates } from "@/types/positions";
import { INDEX_TO_POSITION, POSITION_COUNT } from "./constants";
import { cryptoRandom } from "./utils";

/**
 * Gets formation requirements as an optimized array
 * Returns both the array and the original formation for reference
 */
export function getFastFormation(numPlayers: number): { array: Int8Array; formation: Formation } | null {
    const formations = formationTemplates[numPlayers];
    if (!formations || formations.length === 0) {
        return null;
    }
    
    // Random selection for variety
    const selectedFormation = formations[Math.floor(cryptoRandom() * formations.length)];
    
    // Convert to array
    const arr = new Int8Array(POSITION_COUNT);
    for (let i = 0; i < POSITION_COUNT; i++) {
        const position = INDEX_TO_POSITION[i];
        arr[i] = selectedFormation.positions[position] || 0;
    }
    
    return { array: arr, formation: selectedFormation };
}

/**
 * Gets available formations for a player count
 * 
 * @param playerCount - Number of players
 * @returns Available formation templates
 */
export function getAvailableFormations(playerCount: number): Formation[] {
    return formationTemplates[playerCount] || [];
}

/**
 * Validates if auto-balance is possible for given player count
 * 
 * @param playerCount - Number of players to check
 * @returns Whether balancing is possible
 */
export function canAutoBalance(playerCount: number): boolean {
    if (playerCount < 10 || playerCount > 24) return false;
    
    const teamSize1 = Math.floor(playerCount / 2);
    const teamSize2 = playerCount - teamSize1;
    
    return !!(formationTemplates[teamSize1]?.length && formationTemplates[teamSize2]?.length);
}