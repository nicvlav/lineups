/**
 * Player Card (V2)
 *
 * Shows player name, overall rating, capability-derived label,
 * and a mini capability bar view or zone effectiveness view.
 */

import type React from "react";
import { useState } from "react";
import PlayerStatsModal from "@/components/players/player-stats-modal";
import { useTapHandler } from "@/hooks/use-tap-handler";
import { computeLabel } from "@/lib/capabilities";
import { getStatBarColor, getTierBorderClass } from "@/lib/color-system";
import type { Player } from "@/types/players";

interface PlayerCardProps {
    player: Player;
    playerName: string;
    overall: number;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, playerName, overall }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const tierBorderClass = getTierBorderClass(Math.round(overall));
    const label = computeLabel(player.traits);

    const handleTap = useTapHandler({ onTap: () => setIsModalOpen(true) });

    return (
        <>
            <div
                className={`bg-card border ${tierBorderClass} rounded-xl p-3 cursor-pointer hover:bg-accent/30 transition-colors h-full flex flex-col`}
                {...handleTap}
            >
                {/* Header: name + overall */}
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm leading-tight truncate">{playerName}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-medium text-muted-foreground">{label.primary}</span>
                            {label.secondary && (
                                <span className="text-[10px] text-muted-foreground/60">{label.secondary}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Avatar */}
                {player.avatarUrl && (
                    <div className="w-10 h-10 rounded-full overflow-hidden mb-2">
                        <img src={player.avatarUrl} alt={playerName} className="w-full h-full object-cover" />
                    </div>
                )}

                {/* Card content */}
                <div className="mt-auto space-y-1">
                    {(["def", "mid", "att"] as const).map((zone) => {
                        const value = Math.round(player.zoneEffectiveness[zone]);
                        const zoneLabel = zone === "def" ? "DEF" : zone === "mid" ? "MID" : "ATT";
                        return (
                            <div key={zone} className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground w-7 shrink-0">{zoneLabel}</span>
                                <div className="flex-1 h-1.5 bg-muted rounded-full">
                                    <div
                                        className={`${getStatBarColor(value)} h-1.5 rounded-full`}
                                        style={{ width: `${Math.min(value, 100)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <PlayerStatsModal player={player} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
};

export default PlayerCard;
