/**
 * Formation Assignment (Post-Balance)
 *
 * After teams are balanced on capabilities, assign positions within each team.
 * Key principle: the SPINE (CB→DM/CM→AM→ST) gets the best players.
 * Wide positions (WR, WM, FB) and extra CBs absorb weaker players.
 *
 * Each position has a capability profile that defines what makes a good fit.
 * A CB needs defending. A DM needs defending+engine. An AM needs playmaking+technique.
 * Greg (94 defending, 64 technique) should never play AM.
 */

import { getPointForPosition } from "@/lib/utils/pitch-rendering";
import type { Formation } from "@/types/formations";
import { getFormationsForCount } from "@/types/formations";
import type { Position } from "@/types/positions";
import { POSITIONS } from "@/types/positions";
import type { AssignedPlayer, BalancePlayer } from "./types";

// ─── Position Capability Profiles ───────────────────────────────────────────
// Each position defines which capabilities matter and how much.
// A player's position score = weighted sum of their capabilities × these weights.
// This replaces the old zone-only scoring that put Greg at AM.

interface PositionProfile {
    /** Capability weights (should sum to ~1.0) */
    weights: {
        defending: number;
        playmaking: number;
        goalThreat: number;
        athleticism: number;
        engine: number;
        technique: number;
    };
    /** Is this a spine position? Spine gets priority for strong players */
    isSpine: boolean;
}

const POSITION_PROFILES: Record<Position, PositionProfile> = {
    GK: {
        // GK is special — handled separately (weakest outfield player)
        weights: { defending: 0, playmaking: 0, goalThreat: 0, athleticism: 0, engine: 0, technique: 0 },
        isSpine: false,
    },
    CB: {
        // Primary defender. Needs defending + physicality. One strong CB anchors the back.
        weights: { defending: 0.45, playmaking: 0.05, goalThreat: 0, athleticism: 0.25, engine: 0.2, technique: 0.05 },
        isSpine: true,
    },
    FB: {
        // Wide defender. Needs athleticism + engine. Good spot for athletic but limited players.
        weights: { defending: 0.25, playmaking: 0.1, goalThreat: 0.05, athleticism: 0.3, engine: 0.25, technique: 0.05 },
        isSpine: false,
    },
    DM: {
        // Destroyer/shield. Needs defending + engine. The midfield anchor.
        weights: { defending: 0.35, playmaking: 0.15, goalThreat: 0, athleticism: 0.1, engine: 0.3, technique: 0.1 },
        isSpine: true,
    },
    CM: {
        // Box-to-box. Needs engine + playmaking + defending. The all-rounder spot.
        weights: { defending: 0.15, playmaking: 0.3, goalThreat: 0.05, athleticism: 0.1, engine: 0.25, technique: 0.15 },
        isSpine: true,
    },
    WM: {
        // Wide midfielder. Needs athleticism + technique. Good for pacy players.
        weights: { defending: 0.1, playmaking: 0.15, goalThreat: 0.1, athleticism: 0.3, engine: 0.2, technique: 0.15 },
        isSpine: false,
    },
    AM: {
        // Playmaker/creator. Needs playmaking + technique. The creative hub.
        weights: { defending: 0.05, playmaking: 0.35, goalThreat: 0.15, athleticism: 0.05, engine: 0.1, technique: 0.3 },
        isSpine: true,
    },
    ST: {
        // Striker. Needs goalThreat primarily. The finisher.
        weights: { defending: 0, playmaking: 0.1, goalThreat: 0.45, athleticism: 0.15, engine: 0.1, technique: 0.2 },
        isSpine: true,
    },
    WR: {
        // Winger. Needs athleticism + technique + goalThreat. Pace matters here.
        weights: { defending: 0.05, playmaking: 0.1, goalThreat: 0.2, athleticism: 0.35, engine: 0.1, technique: 0.2 },
        isSpine: false,
    },
};

/**
 * Score a player for a specific position.
 *
 * Two factors:
 * 1. FIT — how well the player's capabilities match what the position needs
 * 2. WASTE — how much of the player's talent goes unused in this position
 *
 * JP at CB: high fit (defending 95) but high waste (playmaking 92, technique 89 unused).
 * JP at CM: high fit (playmaking + defending) and low waste (uses more of his toolkit).
 *
 * This naturally pushes elite all-rounders to spine positions where more
 * of their abilities matter, and saves simpler positions for specialists
 * or weaker players.
 */
function positionScore(player: BalancePlayer, position: Position): number {
    if (position === "GK") {
        return -player.overall;
    }

    const profile = POSITION_PROFILES[position];
    const caps = player.capabilities;

    // 1. Fit: weighted sum of capabilities × position weights
    let fit = 0;
    fit += caps.defending * profile.weights.defending;
    fit += caps.playmaking * profile.weights.playmaking;
    fit += caps.goalThreat * profile.weights.goalThreat;
    fit += caps.athleticism * profile.weights.athleticism;
    fit += caps.engine * profile.weights.engine;
    fit += caps.technique * profile.weights.technique;

    // 2. Waste: how much capability goes unused
    // For each capability, the "unused" portion is: capability × (1 - weight)
    // High capability with low weight = wasted talent
    // Only penalize waste for capabilities significantly above average (> 75)
    // so weak players don't get penalized for having nothing to waste
    let waste = 0;
    const capEntries: [string, number][] = [
        ["defending", caps.defending],
        ["playmaking", caps.playmaking],
        ["goalThreat", caps.goalThreat],
        ["athleticism", caps.athleticism],
        ["engine", caps.engine],
        ["technique", caps.technique],
    ];

    for (const [key, value] of capEntries) {
        if (value > 75) {
            const weight = profile.weights[key as keyof typeof profile.weights];
            // Unused = high capability × how little this position values it
            waste += (value - 75) * (1 - weight) * 0.15;
        }
    }

    // Spine bonus: spine positions get a small boost for high-overall players
    // This nudges stars toward the spine rather than getting parked wide
    const spineBonus = profile.isSpine ? player.overall * 0.05 : 0;

    return fit + spineBonus - waste;
}

/** Pick the best formation for a team based on player profiles */
function selectFormation(team: BalancePlayer[]): Formation | null {
    const formations = getFormationsForCount(team.length);
    if (formations.length === 0) return null;

    let bestFormation = formations[0];
    let bestScore = -Infinity;

    for (const formation of formations) {
        // Score this formation by how well the team's players fit its positions
        let score = 0;
        const available = [...team].sort((a, b) => b.overall - a.overall);

        for (const [pos, count] of Object.entries(formation.positions)) {
            if (pos === "GK") continue;
            for (let i = 0; i < (count as number); i++) {
                // Find best available player for this position
                let bestIdx = 0;
                let bestPlayerScore = positionScore(available[0], pos as Position);
                for (let j = 1; j < available.length; j++) {
                    const ps = positionScore(available[j], pos as Position);
                    if (ps > bestPlayerScore) {
                        bestPlayerScore = ps;
                        bestIdx = j;
                    }
                }
                score += bestPlayerScore;
                available.splice(bestIdx, 1);
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestFormation = formation;
        }
    }

    return bestFormation;
}

/**
 * Assign players to positions using global best-fit.
 *
 * Instead of filling slots sequentially (which can trap good players in
 * wrong positions), score EVERY (player, slot) combination and greedily
 * assign the highest-scoring pair first. This ensures Edwin goes to AM
 * instead of getting grabbed for CB just because CB filled first.
 */
function assignPositions(team: BalancePlayer[], formation: Formation, teamId: "a" | "b"): AssignedPlayer[] {
    // Build all position slots
    const slots: { position: Position; slotIndex: number; totalInPosition: number }[] = [];
    for (const [pos, count] of Object.entries(formation.positions)) {
        for (let i = 0; i < (count as number); i++) {
            slots.push({ position: pos as Position, slotIndex: i, totalInPosition: count as number });
        }
    }

    // Score every (player, slot) pair
    interface Candidate {
        playerIdx: number;
        slotIdx: number;
        score: number;
    }

    const players = [...team];
    const candidates: Candidate[] = [];

    for (let p = 0; p < players.length; p++) {
        for (let s = 0; s < slots.length; s++) {
            candidates.push({
                playerIdx: p,
                slotIdx: s,
                score: positionScore(players[p], slots[s].position),
            });
        }
    }

    // Sort by score descending — best fits first
    candidates.sort((a, b) => b.score - a.score);

    // Greedy assignment: take the best unassigned (player, slot) pair
    const assignedPlayers = new Set<number>();
    const assignedSlots = new Set<number>();
    const assigned: AssignedPlayer[] = [];

    for (const candidate of candidates) {
        if (assignedPlayers.has(candidate.playerIdx) || assignedSlots.has(candidate.slotIdx)) continue;

        const player = players[candidate.playerIdx];
        const slot = slots[candidate.slotIdx];

        assignedPlayers.add(candidate.playerIdx);
        assignedSlots.add(candidate.slotIdx);

        assigned.push({
            ...player,
            team: teamId,
            assignedPosition: slot.position,
            assignedPoint: getPointForPosition(POSITIONS[slot.position], slot.slotIndex, slot.totalInPosition, formation),
        });

        if (assigned.length === players.length) break;
    }

    return assigned;
}

/** Assign formations and positions to both teams */
export function assignFormations(
    teamA: BalancePlayer[],
    teamB: BalancePlayer[],
): {
    a: AssignedPlayer[];
    b: AssignedPlayer[];
    formationA: Formation;
    formationB: Formation;
} {
    const formationA = selectFormation(teamA);
    const formationB = selectFormation(teamB);

    if (!formationA || !formationB) {
        throw new Error(`No valid formation for team sizes ${teamA.length}/${teamB.length}`);
    }

    return {
        a: assignPositions(teamA, formationA, "a"),
        b: assignPositions(teamB, formationB, "b"),
        formationA,
        formationB,
    };
}
