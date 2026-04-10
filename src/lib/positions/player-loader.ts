/**
 * Player Loading Utilities (V2 stub)
 *
 * @deprecated Archetype enrichment is no longer used. Players now have
 * capabilities computed directly from traits via the trigger/hook.
 */

import type { Player, PlayerWithArchetypes } from "@/types/players";

/** @deprecated No-op — players already have capabilities from the hook */
export function enrichPlayerWithArchetypes(player: Player): PlayerWithArchetypes {
    return player;
}

/** @deprecated */
export function enrichPlayersWithArchetypes(players: Player[]): PlayerWithArchetypes[] {
    return players;
}

/** @deprecated */
export function enrichPlayerRecordWithArchetypes(
    playerRecord: Record<string, Player>
): Record<string, PlayerWithArchetypes> {
    return playerRecord;
}
