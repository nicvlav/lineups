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
import type { ZoneKey } from "@/types/traits";
import type { AssignedPlayer, BalancePlayer } from "./types";

/** Maps each position to its primary zone for leftover assignment scoring */
const POSITION_ZONE: Record<Position, ZoneKey> = {
    GK: "def",
    CB: "def",
    FB: "def",
    DM: "mid",
    CM: "mid",
    WM: "mid",
    AM: "mid",
    ST: "att",
    WR: "att",
};

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
    slots: Slot[],
    /** How many slots per position are needed by real players (from their #1 archetype pref) */
    reservedForReals: Map<Position, number>
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

    // Pass 1 — leave enough slots for real players who need them.
    // GK/FB: exempt (placeholders can fill all).
    // Others: leave at least max(1, reservedCount) slots for reals.
    // This prevents placeholders from stealing CB slots when real Anchors need them.
    for (const position of PLACEHOLDER_PREFERENCE) {
        if (queue.length === 0) break;
        const available = slotsByPosition.get(position)?.length ?? 0;
        const reserved = reservedForReals.get(position) ?? 0;
        const leaveOpen = PLACEHOLDER_EXEMPT_FROM_LEAVE_ONE.has(position) ? 0 : Math.max(1, reserved);
        const allowed = Math.max(0, available - leaveOpen);
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
 * Special handling for GK: the lowest-quality player fills it — real or
 * placeholder. This prevents weak real players (Tony 57) from falling
 * through to ST while a placeholder (60) sits comfortably at GK.
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
        if (players[i].overall < players[weakestIdx].overall) {
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

    // Pass 2: leftover players go into leftover slots via ZONE AFFINITY.
    // Instead of dumping by raw quality (which puts midfielders at ST),
    // score each (player, slot) pair by how well the player's zone effectiveness
    // matches the slot's zone. A midfielder should go to a midfield slot, not
    // a striker slot, even when their archetype doesn't list it explicitly.
    const unassignedPlayers = players.map((p, i) => ({ p, i })).filter(({ i }) => !assignedPlayers.has(i));
    const unassignedSlotEntries = slots.map((s, i) => ({ s, i })).filter(({ i }) => !assignedSlots.has(i));

    if (unassignedPlayers.length > 0 && unassignedSlotEntries.length > 0) {
        const leftoverCandidates: Candidate[] = [];
        for (let p = 0; p < unassignedPlayers.length; p++) {
            for (let s = 0; s < unassignedSlotEntries.length; s++) {
                const player = unassignedPlayers[p].p;
                const slotZone = POSITION_ZONE[unassignedSlotEntries[s].s.position];
                // Score by zone effectiveness at that slot's zone
                const score = player.zoneEffectiveness[slotZone];
                leftoverCandidates.push({ playerIdx: p, slotIdx: s, score });
            }
        }
        leftoverCandidates.sort((a, b) => b.score - a.score);

        const assignedLeftoverPlayers = new Set<number>();
        const assignedLeftoverSlots = new Set<number>();
        for (const c of leftoverCandidates) {
            if (assignedLeftoverPlayers.has(c.playerIdx) || assignedLeftoverSlots.has(c.slotIdx)) continue;
            assignedLeftoverPlayers.add(c.playerIdx);
            assignedLeftoverSlots.add(c.slotIdx);
            assignments.push({ player: unassignedPlayers[c.playerIdx].p, slot: unassignedSlotEntries[c.slotIdx].s });
        }
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

// ─── Slot Polish: center-outward ordering ───────────────────────────────────

/**
 * Generate slot indices ordered from center outward, matching pitch-rendering.ts
 * which treats index 0 as center (x=0.5) for central positions with odd count.
 *
 * For 3 slots: [0, 1, 2] — index 0 = center, 1 = left, 2 = right
 * For 4 slots: [0, 1, 2, 3] — 0,1 = inner pair, 2,3 = outer pair
 *
 * Best players get the first (central) indices, placeholders get the last (edge).
 */
function centerOutwardIndices(count: number): number[] {
    // pitch-rendering.ts already lays out index 0 as center for odd counts,
    // and spreads outward from there. So natural index order IS center-out.
    return Array.from({ length: count }, (_, i) => i);
}

/**
 * Polish pass: within each position group of 3+, reorder so that:
 *   - Best real players get the central slot indices
 *   - Placeholders and weaker players drift to the edges
 *
 * Only recomputes the pitch point (visual position), doesn't change the
 * position assignment itself.
 */
function polishSlotOrder(assigned: AssignedPlayer[], formation: Formation): AssignedPlayer[] {
    const groups = new Map<Position, AssignedPlayer[]>();
    for (const a of assigned) {
        const list = groups.get(a.assignedPosition) ?? [];
        list.push(a);
        groups.set(a.assignedPosition, list);
    }

    const result: AssignedPlayer[] = [];
    for (const [position, players] of groups) {
        if (players.length < 3) {
            result.push(...players);
            continue;
        }

        // Sort: real players by quality descending, placeholders last
        const sorted = [...players].sort((a, b) => {
            if (a.isPlaceholder && !b.isPlaceholder) return 1;
            if (!a.isPlaceholder && b.isPlaceholder) return -1;
            return b.overall - a.overall;
        });

        const indices = centerOutwardIndices(sorted.length);
        for (let i = 0; i < sorted.length; i++) {
            result.push({
                ...sorted[i],
                assignedPoint: getPointForPosition(POSITIONS[position], indices[i], sorted.length, formation),
            });
        }
    }

    return result;
}

// ─── Striker Quality Post-Pass ───────────────────────────────────────────────

/**
 * Ensure the ST player is the one LEAST WASTED there.
 *
 * ST suitability = att / max(def, mid). A player whose attacking zone is
 * close to or exceeds their other zones is a natural fit. A player whose
 * mid or def dwarfs their att is wasted at ST and belongs deeper.
 *
 * Swaps ST ↔ AM only (attacking-adjacent). Fires when an AM has higher
 * suitability than the current ST. This naturally handles both:
 *   - Creator at ST when a balanced player is at AM (Santos/Dylan case)
 *   - Generalist at ST when a specialist is at AM (JP/Bojan case)
 */
function ensureStrikerQuality(assigned: AssignedPlayer[]): void {
    const stIdx = assigned.findIndex((a) => a.assignedPosition === "ST" && !a.isPlaceholder);
    if (stIdx < 0) return;

    const st = assigned[stIdx];
    const amEntries = assigned
        .map((a, i) => ({ a, i }))
        .filter(({ a }) => a.assignedPosition === "AM" && !a.isPlaceholder);

    if (amEntries.length === 0) return;

    // How concentrated toward attacking is this player?
    // Higher = less wasted at ST (natural striker fit)
    const stSuitability = (p: AssignedPlayer) => {
        const bestNonAtt = Math.max(p.zoneEffectiveness.def, p.zoneEffectiveness.mid);
        return bestNonAtt > 0 ? p.zoneEffectiveness.att / bestNonAtt : 1.0;
    };

    const currentScore = stSuitability(st);

    // Find the AM who'd be least wasted at ST
    let bestSwapIdx = -1;
    let bestSwapScore = currentScore;
    for (const { a, i } of amEntries) {
        const score = stSuitability(a);
        if (score > bestSwapScore) {
            bestSwapScore = score;
            bestSwapIdx = i;
        }
    }

    if (bestSwapIdx < 0) return;

    // Swap positions and points
    const swapTarget = assigned[bestSwapIdx];
    const stPos = st.assignedPosition;
    const stPoint = st.assignedPoint;
    assigned[stIdx] = { ...st, assignedPosition: swapTarget.assignedPosition, assignedPoint: swapTarget.assignedPoint };
    assigned[bestSwapIdx] = { ...swapTarget, assignedPosition: stPos, assignedPoint: stPoint };
}

// ─── Top-Level Position Assignment ──────────────────────────────────────────

function assignPositions(team: BalancePlayer[], formation: Formation, teamId: "a" | "b"): AssignedPlayer[] {
    const slots = buildSlots(formation);

    // Phase 0: GK — weakest player overall (real or placeholder).
    // This prevents weak reals (Tony 57) from falling through to ST while
    // a placeholder (60) sits at GK. If a placeholder IS the weakest, it
    // takes GK as before.
    const { gkAssignment, remainingPlayers: afterGK, remainingSlots: slotsAfterGK } = pickGoalkeeper(team, slots);

    // Phase A: remaining placeholders via preference order.
    // Reserve slots for real players who need them (e.g. Anchors need CB).
    const remainingPlaceholders = afterGK.filter((p) => p.isPlaceholder);
    const remainingReals = afterGK.filter((p) => !p.isPlaceholder);

    const reservedForReals = new Map<Position, number>();
    for (const real of remainingReals) {
        const topPref = real.archetype.def.positionPreference[0];
        if (topPref) {
            reservedForReals.set(topPref, (reservedForReals.get(topPref) ?? 0) + 1);
        }
    }

    const { assignments: placeholderAssignments, remainingSlots: afterPlaceholders } = assignPlaceholdersByPreference(
        remainingPlaceholders,
        slotsAfterGK,
        reservedForReals
    );

    // Phase B: remaining reals via archetype-driven fit
    const { assignments: realAssignments } = assignRealsByArchetype(remainingReals, afterPlaceholders);

    const all = [...(gkAssignment ? [gkAssignment] : []), ...placeholderAssignments, ...realAssignments];
    const assigned = all.map(({ player, slot }) => makeAssigned(player, slot, formation, teamId));

    // Post-pass: ensure ST has the player least wasted there (natural attacker
    // over versatile midfielder). Swaps ST ↔ AM based on attack concentration.
    ensureStrikerQuality(assigned);

    // Final polish: within positions with 3+ players, push best to center, placeholders to edges
    return polishSlotOrder(assigned, formation);
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
