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

/** Score a player for a specific position using capability profile */
function positionScore(player: BalancePlayer, position: Position): number {
    if (position === "GK") {
        // GK: weakest outfield player. Lower overall = more likely GK.
        return -player.overall;
    }

    const profile = POSITION_PROFILES[position];
    let score = 0;
    score += player.capabilities.defending * profile.weights.defending;
    score += player.capabilities.playmaking * profile.weights.playmaking;
    score += player.capabilities.goalThreat * profile.weights.goalThreat;
    score += player.capabilities.athleticism * profile.weights.athleticism;
    score += player.capabilities.engine * profile.weights.engine;
    score += player.capabilities.technique * profile.weights.technique;

    return score;
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

/** Assign players to positions within a formation */
function assignPositions(team: BalancePlayer[], formation: Formation, teamId: "a" | "b"): AssignedPlayer[] {
    const assigned: AssignedPlayer[] = [];
    const available = [...team];

    // Build position slots, sorted: spine first (high priority), then wide positions
    const slots: Position[] = [];
    for (const [pos, count] of Object.entries(formation.positions)) {
        for (let i = 0; i < (count as number); i++) {
            slots.push(pos as Position);
        }
    }

    // Sort: GK last, spine positions first (so best players fill the spine)
    slots.sort((a, b) => {
        if (a === "GK") return 1;
        if (b === "GK") return -1;

        const aSpine = POSITION_PROFILES[a].isSpine ? 0 : 1;
        const bSpine = POSITION_PROFILES[b].isSpine ? 0 : 1;
        if (aSpine !== bSpine) return aSpine - bSpine;

        return POSITIONS[a].priority - POSITIONS[b].priority;
    });

    const positionIndexes: Record<string, number> = {};

    for (const position of slots) {
        if (available.length === 0) break;

        let bestIdx = 0;
        let bestScore = positionScore(available[0], position);

        for (let i = 1; i < available.length; i++) {
            const score = positionScore(available[i], position);
            if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }

        const player = available[bestIdx];
        available.splice(bestIdx, 1);

        const posIndex = positionIndexes[position] ?? 0;
        const numInPosition = formation.positions[position] ?? 1;
        positionIndexes[position] = posIndex + 1;

        assigned.push({
            ...player,
            team: teamId,
            assignedPosition: position,
            assignedPoint: getPointForPosition(POSITIONS[position], posIndex, numInPosition, formation),
        });
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
