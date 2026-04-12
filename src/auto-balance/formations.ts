/**
 * Formation Assignment (Post-Balance)
 *
 * After teams are balanced on capabilities, assign positions within each team.
 *
 * Archetype-driven assignment:
 *   1. Placeholders are placed first via the preference-order rule
 *      (GK/FB/CB/WM first, never spine unless forced)
 *   2. Real players are placed by archetype position fit — each archetype
 *      has an ordered list of preferred positions, scored by quality and a
 *      linear preference falloff (1.0 → 0.85 → 0.7…)
 *   3. GK is special — the lowest-quality remaining player fills it
 *
 * No more capability-driven position formulas. The archetype's position
 * preference is the source of truth — a Destroyer prefers DM/CM/CB, a Winger
 * prefers WR/AM/WM, etc. Quality acts as the tiebreaker between same-archetype
 * candidates.
 */

import { positionFitWeight } from "@/lib/archetypes";
import { logger } from "@/lib/logger";
import { getPointForPosition } from "@/lib/utils/pitch-rendering";
import type { Formation } from "@/types/formations";
import { getFormationsForCount } from "@/types/formations";
import type { Position } from "@/types/positions";
import { POSITIONS } from "@/types/positions";
import type { AssignedPlayer, BalancePlayer } from "./types";

// ─── Slot Building ──────────────────────────────────────────────────────────

interface Slot {
    position: Position;
    slotIndex: number;
    totalInPosition: number;
}

function buildSlots(formation: Formation): Slot[] {
    const slots: Slot[] = [];
    for (const [pos, count] of Object.entries(formation.positions)) {
        for (let i = 0; i < (count as number); i++) {
            slots.push({ position: pos as Position, slotIndex: i, totalInPosition: count as number });
        }
    }
    return slots;
}

function makeAssigned(player: BalancePlayer, slot: Slot, formation: Formation, teamId: "a" | "b"): AssignedPlayer {
    return {
        ...player,
        team: teamId,
        assignedPosition: slot.position,
        assignedPoint: getPointForPosition(POSITIONS[slot.position], slot.slotIndex, slot.totalInPosition, formation),
    };
}

// ─── Phase A: Placeholder Assignment ────────────────────────────────────────

/**
 * Preference order for placeholder placement, most-to-least preferred.
 * GK and FB are exempt from the "leave one for a real player" rule because
 * they're easy free-lunch slots for unknown players.
 */
const PLACEHOLDER_PREFERENCE: Position[] = ["GK", "FB", "CB", "WM", "CM", "WR", "AM", "DM", "ST"];
const PLACEHOLDER_EXEMPT_FROM_LEAVE_ONE = new Set<Position>(["GK", "FB"]);

function assignPlaceholdersByPreference(
    placeholders: BalancePlayer[],
    slots: Slot[]
): { assignments: { player: BalancePlayer; slot: Slot }[]; remainingSlots: Slot[] } {
    const assignments: { player: BalancePlayer; slot: Slot }[] = [];
    const queue = [...placeholders];
    const slotsByPosition = new Map<Position, Slot[]>();
    for (const slot of slots) {
        const list = slotsByPosition.get(slot.position) ?? [];
        list.push(slot);
        slotsByPosition.set(slot.position, list);
    }

    const placeFromPosition = (position: Position, maxToPlace: number): number => {
        const available = slotsByPosition.get(position);
        if (!available || available.length === 0 || maxToPlace <= 0) return 0;

        const take = Math.min(maxToPlace, available.length, queue.length);
        for (let i = 0; i < take; i++) {
            const player = queue.shift();
            const slot = available.shift();
            if (!player || !slot) break;
            assignments.push({ player, slot });
        }
        return take;
    };

    // Pass 1 — soft rule (leave at least 1 slot per position for a real, except GK/FB)
    for (const position of PLACEHOLDER_PREFERENCE) {
        if (queue.length === 0) break;
        const available = slotsByPosition.get(position)?.length ?? 0;
        const allowed = PLACEHOLDER_EXEMPT_FROM_LEAVE_ONE.has(position) ? available : Math.max(0, available - 1);
        placeFromPosition(position, allowed);
    }

    // Pass 2 — soft rule lifted, walk preference order again
    if (queue.length > 0) {
        for (const position of PLACEHOLDER_PREFERENCE) {
            if (queue.length === 0) break;
            const available = slotsByPosition.get(position)?.length ?? 0;
            placeFromPosition(position, available);
        }
    }

    // Pass 3 — hard fallback: any remaining slot, any position
    if (queue.length > 0) {
        for (const [, available] of slotsByPosition) {
            while (queue.length > 0 && available.length > 0) {
                const player = queue.shift();
                const slot = available.shift();
                if (!player || !slot) break;
                assignments.push({ player, slot });
            }
            if (queue.length === 0) break;
        }
    }

    if (queue.length > 0) {
        logger.warn(`Placeholder assignment overflow: ${queue.length} placeholders could not be placed`);
    }

    const remainingSlots: Slot[] = [];
    for (const list of slotsByPosition.values()) {
        remainingSlots.push(...list);
    }

    return { assignments, remainingSlots };
}

// ─── Phase B: Real Player Assignment (Archetype-Driven) ─────────────────────

/**
 * Score a real player at a slot using their archetype's position preference.
 *
 * Score = quality × preference_weight(archetype, position)
 *
 * preference_weight is 1.0 if the position is the archetype's #1 preference,
 * 0.85 for #2, etc. Returns 0 if the position isn't in the preference list at
 * all — that prevents square-peg-round-hole assignments unless we run out of
 * preferred candidates.
 */
function realFitScore(player: BalancePlayer, position: Position): number {
    const weight = positionFitWeight(player.archetype, position);
    if (weight === 0) return 0;
    return player.archetype.quality * weight;
}

/**
 * Special handling for GK: the lowest-quality outfield player fills it.
 * Returns the GK assignment + the remaining players/slots minus GK.
 */
function pickGoalkeeper(
    players: BalancePlayer[],
    slots: Slot[]
): {
    gkAssignment: { player: BalancePlayer; slot: Slot } | null;
    remainingPlayers: BalancePlayer[];
    remainingSlots: Slot[];
} {
    const gkSlotIdx = slots.findIndex((s) => s.position === "GK");
    if (gkSlotIdx < 0 || players.length === 0) {
        return { gkAssignment: null, remainingPlayers: players, remainingSlots: slots };
    }

    let weakestIdx = 0;
    for (let i = 1; i < players.length; i++) {
        if (players[i].archetype.quality < players[weakestIdx].archetype.quality) {
            weakestIdx = i;
        }
    }

    const gkAssignment = { player: players[weakestIdx], slot: slots[gkSlotIdx] };
    const remainingPlayers = players.filter((_, i) => i !== weakestIdx);
    const remainingSlots = slots.filter((_, i) => i !== gkSlotIdx);
    return { gkAssignment, remainingPlayers, remainingSlots };
}

/**
 * Assign real players to outfield slots via global best-fit on archetype scores.
 *
 * Score every (player, slot) pair, sort descending, greedily assign the best
 * unassigned pair. Same shape as the previous capability-fit assigner, but
 * the score function is now archetype.quality × position_preference_weight.
 *
 * Two-pass: first pass only considers preferred positions (weight > 0). If any
 * players remain (e.g. only square-peg slots left), second pass uses overall
 * quality as a tiebreaker for the leftover slots.
 */
function assignRealsByArchetype(
    players: BalancePlayer[],
    slots: Slot[]
): { assignments: { player: BalancePlayer; slot: Slot }[] } {
    if (players.length === 0 || slots.length === 0) {
        return { assignments: [] };
    }

    interface Candidate {
        playerIdx: number;
        slotIdx: number;
        score: number;
    }

    // Pass 1: only preferred-position pairs (score > 0)
    const candidates: Candidate[] = [];
    for (let p = 0; p < players.length; p++) {
        for (let s = 0; s < slots.length; s++) {
            const score = realFitScore(players[p], slots[s].position);
            if (score > 0) candidates.push({ playerIdx: p, slotIdx: s, score });
        }
    }

    candidates.sort((a, b) => b.score - a.score);

    const assignedPlayers = new Set<number>();
    const assignedSlots = new Set<number>();
    const assignments: { player: BalancePlayer; slot: Slot }[] = [];

    for (const c of candidates) {
        if (assignedPlayers.has(c.playerIdx) || assignedSlots.has(c.slotIdx)) continue;
        assignedPlayers.add(c.playerIdx);
        assignedSlots.add(c.slotIdx);
        assignments.push({ player: players[c.playerIdx], slot: slots[c.slotIdx] });
    }

    // Pass 2: any unassigned players go into any leftover slots, ranked by quality.
    // This handles the rare case where preferred-position assignment leaves gaps.
    const unassignedPlayers = players
        .map((p, i) => ({ p, i }))
        .filter(({ i }) => !assignedPlayers.has(i))
        .sort((a, b) => b.p.archetype.quality - a.p.archetype.quality);
    const unassignedSlots = slots.map((s, i) => ({ s, i })).filter(({ i }) => !assignedSlots.has(i));

    for (let k = 0; k < unassignedPlayers.length && k < unassignedSlots.length; k++) {
        assignments.push({ player: unassignedPlayers[k].p, slot: unassignedSlots[k].s });
    }

    return { assignments };
}

// ─── Formation Selection ────────────────────────────────────────────────────

/**
 * Pick the best formation for a team based on how well its archetype mix
 * fits each formation's slot distribution.
 */
function selectFormation(team: BalancePlayer[]): Formation | null {
    const formations = getFormationsForCount(team.length);
    if (formations.length === 0) return null;

    let bestFormation = formations[0];
    let bestScore = -Infinity;

    for (const formation of formations) {
        // Score this formation by simulating the assignment and summing fit scores.
        // Greedy approximation — same shape as the real assigner but no full pass.
        let score = 0;
        const available = [...team];

        for (const [pos, count] of Object.entries(formation.positions)) {
            if (pos === "GK") continue;
            for (let i = 0; i < (count as number); i++) {
                let bestIdx = 0;
                let bestPlayerScore = realFitScore(available[0], pos as Position);
                for (let j = 1; j < available.length; j++) {
                    const ps = realFitScore(available[j], pos as Position);
                    if (ps > bestPlayerScore) {
                        bestPlayerScore = ps;
                        bestIdx = j;
                    }
                }
                // If no player has a real fit, score this position by quality alone (penalty)
                if (bestPlayerScore === 0) {
                    bestPlayerScore = available[bestIdx].archetype.quality * 0.2;
                }
                score += bestPlayerScore;
                available.splice(bestIdx, 1);
                if (available.length === 0) break;
            }
            if (available.length === 0) break;
        }

        if (score > bestScore) {
            bestScore = score;
            bestFormation = formation;
        }
    }

    return bestFormation;
}

// ─── Top-Level Position Assignment ──────────────────────────────────────────

function assignPositions(team: BalancePlayer[], formation: Formation, teamId: "a" | "b"): AssignedPlayer[] {
    const slots = buildSlots(formation);
    const placeholders = team.filter((p) => p.isPlaceholder);
    const reals = team.filter((p) => !p.isPlaceholder);

    // Phase A: placeholders
    const { assignments: placeholderAssignments, remainingSlots: afterPlaceholders } = assignPlaceholdersByPreference(
        placeholders,
        slots
    );

    // Phase B(0): GK is the weakest real player
    const { gkAssignment, remainingPlayers, remainingSlots } = pickGoalkeeper(reals, afterPlaceholders);

    // Phase B(1): rest of the reals via archetype-driven fit
    const { assignments: realAssignments } = assignRealsByArchetype(remainingPlayers, remainingSlots);

    const all = [...placeholderAssignments, ...(gkAssignment ? [gkAssignment] : []), ...realAssignments];
    return all.map(({ player, slot }) => makeAssigned(player, slot, formation, teamId));
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
