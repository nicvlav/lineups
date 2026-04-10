/**
 * Formation Assignment (Post-Balance)
 *
 * After teams are balanced on capabilities, assign positions within each team.
 * This is independent per team — greedy best-fit assignment based on zone effectiveness.
 */

import { getPointForPosition } from "@/lib/utils/pitch-rendering";
import type { Formation } from "@/types/formations";
import { getFormationsForCount } from "@/types/formations";
import type { Position } from "@/types/positions";
import { POSITIONS } from "@/types/positions";
import type { AssignedPlayer, BalancePlayer } from "./types";

/** Score a player for a specific position based on zone effectiveness */
function positionScore(player: BalancePlayer, position: Position): number {
    const zone = POSITIONS[position].zone;

    switch (zone) {
        case "goalkeeper":
            // GK assignment: least valuable outfield player gets GK
            // (reversed — lower overall = better GK candidate)
            return -player.overall;
        case "defense":
            return player.zoneEffectiveness.def;
        case "midfield":
            return player.zoneEffectiveness.mid;
        case "attack":
            return player.zoneEffectiveness.att;
    }
}

/** Pick the best formation for a team based on zone distribution */
function selectFormation(team: BalancePlayer[]): Formation | null {
    const formations = getFormationsForCount(team.length);
    if (formations.length === 0) return null;

    // Score each formation by how well the team's zone effectiveness matches its shape
    let bestFormation = formations[0];
    let bestScore = -Infinity;

    for (const formation of formations) {
        let score = 0;
        const positionCounts = formation.positions;

        // Count how many slots are in each zone
        const defSlots = (positionCounts.CB ?? 0) + (positionCounts.FB ?? 0);
        const midSlots =
            (positionCounts.DM ?? 0) + (positionCounts.CM ?? 0) + (positionCounts.WM ?? 0) + (positionCounts.AM ?? 0);
        const attSlots = (positionCounts.ST ?? 0) + (positionCounts.WR ?? 0);

        // Sort players by each zone's effectiveness
        const byDef = [...team].sort((a, b) => b.zoneEffectiveness.def - a.zoneEffectiveness.def);
        const byMid = [...team].sort((a, b) => b.zoneEffectiveness.mid - a.zoneEffectiveness.mid);
        const byAtt = [...team].sort((a, b) => b.zoneEffectiveness.att - a.zoneEffectiveness.att);

        // Sum the top N players' zone scores for each zone's slot count
        for (let i = 0; i < defSlots && i < byDef.length; i++) score += byDef[i].zoneEffectiveness.def;
        for (let i = 0; i < midSlots && i < byMid.length; i++) score += byMid[i].zoneEffectiveness.mid;
        for (let i = 0; i < attSlots && i < byAtt.length; i++) score += byAtt[i].zoneEffectiveness.att;

        if (score > bestScore) {
            bestScore = score;
            bestFormation = formation;
        }
    }

    return bestFormation;
}

/** Assign players to positions within a formation using greedy best-fit */
function assignPositions(team: BalancePlayer[], formation: Formation, teamId: "a" | "b"): AssignedPlayer[] {
    const assigned: AssignedPlayer[] = [];
    const available = [...team];

    // Build list of position slots to fill
    const slots: Position[] = [];
    for (const [pos, count] of Object.entries(formation.positions)) {
        for (let i = 0; i < (count as number); i++) {
            slots.push(pos as Position);
        }
    }

    // Sort slots by priority (GK first, then important positions)
    slots.sort((a, b) => {
        // GK always first
        if (a === "GK") return -1;
        if (b === "GK") return 1;
        return POSITIONS[a].priority - POSITIONS[b].priority;
    });

    // Track how many players have been assigned to each position (for rendering offsets)
    const positionIndexes: Record<string, number> = {};

    for (const position of slots) {
        if (available.length === 0) break;

        // Find best available player for this position
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
    teamB: BalancePlayer[]
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
